import logging
from datetime import date

from django.utils import timezone

from core.email_sender import get_email_sender

from .models import ProcessBinding, ProcessRun, ProcessTemplate, ProcessTriggerRun
from .utils import (
    _build_document_context,
    _generate_document_for_run,
    _render_template_body,
    _resolve_email_recipients,
    binding_subject_snapshot,
)

logger = logging.getLogger(__name__)


def _find_existing_run(binding, today):
    return (
        ProcessRun.objects.filter(
            process_binding=binding,
            scheduled_for=today,
            status__in=(ProcessRun.STATUS_PENDING, ProcessRun.STATUS_SENT),
        )
        .order_by("-id")
        .first()
    )


def _collect_attachments(run):
    attachments = []
    for prd in run.documents.select_related("document_file").all():
        doc_file = prd.document_file
        if not doc_file.file:
            continue
        try:
            with doc_file.file.open("rb") as fh:
                data = fh.read()
        except Exception as exc:
            logger.warning(
                "Could not read attachment for doc id=%s: %s",
                doc_file.id, exc,
            )
            continue
        name = doc_file.file.name.split("/")[-1]
        attachments.append((name, data))
    return attachments


def send_now_for_binding(binding, *, user=None):
    today = date.today()
    existing = _find_existing_run(binding, today)
    if existing:
        return existing, False

    pt = binding.process_type
    snapshot = binding_subject_snapshot(binding)
    now = timezone.now()
    auth_user = user if user and user.is_authenticated else None

    run = ProcessRun.objects.create(
        process_binding=binding,
        process_type=pt,
        subject_snapshot=snapshot,
        scheduled_for=today,
        status=ProcessRun.STATUS_SENT,
    )

    templates = (
        ProcessTemplate.objects.filter(
            process_type=pt,
            trigger=ProcessTemplate.TRIGGER_ON_SCHEDULED,
        )
        .select_related("document_template")
    )

    for template in templates:
        if template.generate_document and template.document_template_id:
            try:
                _generate_document_for_run(run, template, snapshot)
            except Exception as exc:
                logger.exception(
                    "send_now: doc generation failed for run id=%s template id=%s: %s",
                    run.id, template.id, exc,
                )

        email_sent = False
        email_error = ""
        if template.send_email:
            try:
                _send_email_with_attachment(template, binding, snapshot, run)
                email_sent = True
            except Exception as exc:
                email_error = str(exc)
                logger.exception(
                    "send_now: email failed for run id=%s template id=%s: %s",
                    run.id, template.id, exc,
                )

        ProcessTriggerRun.objects.create(
            process_run=run,
            process_template=template,
            trigger=ProcessTriggerRun.TRIGGER_ON_SCHEDULED,
            executed_at=now,
            executed_by=auth_user,
            email_sent=email_sent,
            email_error=email_error,
        )

    return run, True


def _send_email_with_attachment(template, binding, snapshot, run):
    recipients = _resolve_email_recipients(template, binding)
    if not recipients:
        logger.warning(
            "send_now: no email recipient for template id=%s", template.id,
        )
        return

    context = _build_document_context(run, snapshot)
    subject = _render_template_body(
        template.email_subject_template or "Process notification", context,
    )
    body = _render_template_body(template.email_body_template or "", context)
    attachments = _collect_attachments(run)

    sent = get_email_sender().send(
        recipients=recipients,
        subject=subject,
        body=body,
        attachments=attachments if attachments else None,
        fail_silently=False,
    )
    if not sent:
        raise RuntimeError("Email sender returned False")
