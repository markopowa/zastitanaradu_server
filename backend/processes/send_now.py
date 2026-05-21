import logging
from datetime import date

from django.utils import timezone

from .models import ProcessRun, ProcessTemplate, ProcessTriggerRun
from .trigger_utils import trigger_already_executed
from .utils import (
    _generate_document_for_run,
    _send_email_for_template,
    binding_subject_snapshot,
)

logger = logging.getLogger(__name__)


def send_now_for_binding(binding, *, user=None):
    open_run = (
        ProcessRun.objects.filter(
            process_binding=binding,
            status__in=(ProcessRun.STATUS_PENDING, ProcessRun.STATUS_SENT),
        )
        .order_by("-id")
        .first()
    )
    if open_run and open_run.status == ProcessRun.STATUS_SENT:
        if trigger_already_executed(
            open_run.id, ProcessTriggerRun.TRIGGER_ON_SCHEDULED
        ):
            return open_run, False

    pt = binding.process_type
    snapshot = binding_subject_snapshot(binding)
    now = timezone.now()
    auth_user = user if user and user.is_authenticated else None

    if open_run:
        run = open_run
        run.status = ProcessRun.STATUS_SENT
        run.save(update_fields=["status"])
    else:
        scheduled_for = binding.next_run_at or date.today()
        run = ProcessRun.objects.create(
            process_binding=binding,
            process_type=pt,
            subject_snapshot=snapshot,
            scheduled_for=scheduled_for,
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
        if ProcessTriggerRun.objects.filter(
            process_run=run,
            process_template=template,
            trigger=ProcessTriggerRun.TRIGGER_ON_SCHEDULED,
        ).exists():
            continue
        generated_document = None
        if template.generate_document and template.document_template_id:
            try:
                generated_document = _generate_document_for_run(
                    run, template, snapshot,
                )
            except Exception as exc:
                logger.exception(
                    "send_now: doc generation failed for run id=%s template id=%s: %s",
                    run.id, template.id, exc,
                )

        email_sent = False
        email_error = ""
        if template.send_email:
            try:
                _send_email_for_template(
                    template,
                    binding,
                    snapshot,
                    run=run,
                    generated_document=generated_document,
                    fail_silently=False,
                )
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
            document_file=generated_document,
        )

    return run, True
