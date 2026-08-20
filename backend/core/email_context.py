import contextvars
import logging
from contextlib import contextmanager
from typing import Optional, Sequence

from django.conf import settings

logger = logging.getLogger(__name__)

_suppress_email: contextvars.ContextVar[bool] = contextvars.ContextVar(
    "suppress_email",
    default=False,
)

_company_email_test_mode: contextvars.ContextVar[Optional[bool]] = contextvars.ContextVar(
    "company_email_test_mode",
    default=None,
)


def set_suppress_email(value: bool) -> contextvars.Token:
    return _suppress_email.set(value)


def reset_suppress_email(token: contextvars.Token) -> None:
    _suppress_email.reset(token)


def is_email_suppressed() -> bool:
    if getattr(settings, "EMAIL_DRY_RUN", False):
        return True
    return _suppress_email.get()


def set_company_email_test_mode(value: Optional[bool]) -> contextvars.Token:
    return _company_email_test_mode.set(value)


def reset_company_email_test_mode(token: contextvars.Token) -> None:
    _company_email_test_mode.reset(token)


@contextmanager
def company_email_test_mode(company):
    value = getattr(company, "email_test_mode", None) if company is not None else None
    token = set_company_email_test_mode(value)
    try:
        yield
    finally:
        reset_company_email_test_mode(token)


def apply_email_redirect(
    recipients: Sequence[str],
    subject: str,
) -> tuple[list[str], str]:
    redirect = (getattr(settings, "EMAIL_REDIRECT_TO", "") or "").strip()
    if not redirect or not recipients:
        return list(recipients), subject
    if _company_email_test_mode.get() is False:
        return list(recipients), subject
    original = ", ".join(recipients)
    if original == redirect:
        return [redirect], subject
    prefix = f"[to was: {original}] "
    return [redirect], f"{prefix}{subject}"


def log_suppressed_send(*, recipients, subject: str, body: str, attachments) -> None:
    names = [a[0] for a in (attachments or [])]
    logger.info(
        "EMAIL SUPPRESSED | to=%s | subject=%s | attachments=%s\n%s",
        ", ".join(recipients),
        subject,
        names,
        body,
    )
