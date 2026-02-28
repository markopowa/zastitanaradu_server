import importlib
import logging
from typing import Sequence

import boto3
from botocore.exceptions import ClientError
from django.conf import settings

logger = logging.getLogger(__name__)


_sender = None


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

    def send(
        self,
        *,
        recipients: Sequence[str],
        subject: str,
        body: str,
        html_body: str | None = None,
        from_email: str | None = None,
        fail_silently: bool = True,
    ) -> bool:
        source = (from_email or self._from_email or "").strip()
        if not source or not recipients:
            return False
        try:
            client = boto3.client("ses", region_name=self._region)
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
