import contextvars
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

_suppress_email: contextvars.ContextVar[bool] = contextvars.ContextVar(
    "suppress_email",
    default=False,
)


def set_suppress_email(value: bool) -> contextvars.Token:
    return _suppress_email.set(value)


def reset_suppress_email(token: contextvars.Token) -> None:
    _suppress_email.reset(token)


def is_email_suppressed() -> bool:
    if getattr(settings, "EMAIL_DRY_RUN", False):
        return True
    return _suppress_email.get()


def log_suppressed_send(*, recipients, subject: str, body: str, attachments) -> None:
    names = [a[0] for a in (attachments or [])]
    logger.info(
        "EMAIL SUPPRESSED | to=%s | subject=%s | attachments=%s\n%s",
        ", ".join(recipients),
        subject,
        names,
        body,
    )
