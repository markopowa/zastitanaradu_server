import csv
import importlib
import logging
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Sequence

import boto3
from botocore.exceptions import ClientError

from django.conf import settings

logger = logging.getLogger(__name__)

_BACKEND_DIR = Path(__file__).resolve().parent.parent

_sender = None


def _load_aws_credentials_from_csv() -> tuple[str, str] | tuple[None, None]:
    for filename in ("m.vuckovic_accessKeys.csv", "m.vuckovic_credentials.csv"):
        csv_path = _BACKEND_DIR / filename
        if not csv_path.exists():
            continue
        try:
            with open(csv_path, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                row = next(reader, None)
                if row is None:
                    continue
                key_id = row.get("Access key ID") or row.get(
                    "access_key_id") or ""
                secret = row.get("Secret access key") or row.get(
                    "secret_access_key") or ""
                if key_id and secret:
                    logger.debug("AWS credentials loaded from %s", filename)
                    return key_id.strip(), secret.strip()
        except Exception as e:
            logger.warning(
                "Failed to read AWS credentials from %s: %s", filename, e)
    return None, None


def get_email_sender():
    global _sender
    if _sender is None:
        backend_path = getattr(
            settings,
            "EMAIL_SENDER_BACKEND",
            "core.email_sender.SESEmailSender",
        ) or "core.email_sender.SESEmailSender"
        module_path, _, class_name = backend_path.rpartition(".")
        mod = importlib.import_module(module_path)
        cls = getattr(mod, class_name)
        _sender = cls()
    return _sender


class SESEmailSender:
    def __init__(self, *, region_name: str | None = None, from_email: str | None = None):
        self._region = (
            region_name
            or getattr(settings, "AWS_REGION", None)
            or getattr(settings, "AWS_DEFAULT_REGION", "eu-central-1")
        )
        self._from_email = (
            from_email
            if from_email is not None
            else getattr(settings, "EMAIL_FROM_ADDRESS", "")
            or ""
        )
        csv_key_id, csv_secret = _load_aws_credentials_from_csv()
        self._aws_access_key_id = (
            getattr(settings, "AWS_ACCESS_KEY_ID", None) or csv_key_id or None
        )
        self._aws_secret_access_key = (
            getattr(settings, "AWS_SECRET_ACCESS_KEY",
                    None) or csv_secret or None
        )

    def send(
        self,
        *,
        recipients: Sequence[str],
        subject: str,
        body: str,
        html_body: str | None = None,
        from_email: str | None = None,
        attachments: Sequence[tuple[str, bytes]] | None = None,
        fail_silently: bool = True,
    ) -> bool:
        source = (from_email or self._from_email or "").strip()
        if not source or not recipients:
            return False
        try:
            client = boto3.client(
                "ses",
                region_name=self._region,
                aws_access_key_id=self._aws_access_key_id,
                aws_secret_access_key=self._aws_secret_access_key,
            )
            if attachments:
                return self._send_raw(
                    client, source, list(recipients), subject,
                    body, html_body, attachments,
                )
            message = {
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {"Text": {"Data": body, "Charset": "UTF-8"}},
            }
            if html_body:
                message["Body"]["Html"] = {
                    "Data": html_body, "Charset": "UTF-8"}
            client.send_email(
                Source=source,
                Destination={"ToAddresses": list(recipients)},
                Message=message,
            )
            return True
        except ClientError as e:
            if not fail_silently:
                raise
            logger.warning(
                "SES send_email failed: %s",
                e.response.get("Error", {}).get("Message", e),
            )
            return False
        except Exception as e:
            if not fail_silently:
                raise
            logger.exception("SES send_email error: %s", e)
            return False

    def _send_raw(
        self,
        client,
        source: str,
        recipients: list[str],
        subject: str,
        body: str,
        html_body: str | None,
        attachments: Sequence[tuple[str, bytes]],
    ) -> bool:
        msg = MIMEMultipart("mixed")
        msg["Subject"] = subject
        msg["From"] = source
        msg["To"] = ", ".join(recipients)

        body_part = MIMEMultipart("alternative")
        body_part.attach(MIMEText(body, "plain", "utf-8"))
        if html_body:
            body_part.attach(MIMEText(html_body, "html", "utf-8"))
        msg.attach(body_part)

        for filename, data in attachments:
            att = MIMEApplication(data)
            att.add_header("Content-Disposition",
                           "attachment", filename=filename)
            msg.attach(att)

        client.send_raw_email(
            Source=source,
            Destinations=recipients,
            RawMessage={"Data": msg.as_string()},
        )
        return True
