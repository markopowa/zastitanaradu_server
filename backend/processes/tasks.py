import logging
from datetime import date, timedelta

from django.db import transaction
from django.utils import timezone

from .activity_log import log_activity
from .date_format import format_date_display
from .dates import add_months
from .models import (
    ActivityLog,
    NotificationOutbox,
    ProcessBinding,
    ProcessRun,
    ProcessTemplate,
    ProcessTriggerRun,
    ProcessType,
)
from .trigger_utils import execute_templates_for_trigger, run_lead_date, trigger_already_executed
from .utils import (
    _build_document_context,
    _generate_document_for_run,
    _render_template_body,
    _resolve_email_recipients,
    _send_email_for_template,
    binding_subject_snapshot,
    send_generic_reminder,
)

logger = logging.getLogger(__name__)

OPEN_RUN_STATUSES = (ProcessRun.STATUS_PENDING, ProcessRun.STATUS_SENT)

MAX_ATTEMPTS = 5


def get_open_run_for_binding(binding: ProcessBinding) -> ProcessRun | None:
    return (
        ProcessRun.objects.filter(
            process_binding=binding,
            status__in=OPEN_RUN_STATUSES,
        )
        .order_by("-id")
        .first()
    )


def cancel_open_runs_for_binding(binding: ProcessBinding) -> int:
    cancelled = ProcessRun.objects.filter(
        process_binding=binding,
        status__in=OPEN_RUN_STATUSES,
    ).update(status=ProcessRun.STATUS_CANCELLED)
    NotificationOutbox.objects.filter(
        process_run__process_binding=binding,
        status=NotificationOutbox.STATUS_PENDING,
    ).update(status=NotificationOutbox.STATUS_CANCELLED)
    return cancelled


def _effective_offsets(binding: ProcessBinding) -> list[int]:
    pt = binding.process_type
    offsets = pt.reminder_offsets
    if offsets:
        return list(offsets)
    lead = binding.lead_time_days if binding.lead_time_days is not None else pt.lead_time_days
    effective_lead = lead or 30
    return [-effective_lead, 0]


def _trigger_for_offset(offset: int) -> str:
    if offset < 0:
        return ProcessTemplate.TRIGGER_ON_LEAD
    if offset == 0:
        return ProcessTemplate.TRIGGER_ON_SCHEDULED
    return ProcessTemplate.TRIGGER_ON_OVERDUE


def materialize_outbox_for_run(run: ProcessRun) -> int:
    binding = run.process_binding
    if run.scheduled_for is None:
        return 0

    offsets = _effective_offsets(binding)
    created = 0
    for offset in offsets:
        trigger = _trigger_for_offset(offset)
        template = ProcessTemplate.objects.filter(
            process_type_id=run.process_type_id,
            trigger=trigger,
            send_email=True,
        ).first()

        send_on = run.scheduled_for + timedelta(days=offset)

        _, inserted = NotificationOutbox.objects.get_or_create(
            process_run=run,
            offset_days=offset,
            defaults={
                "process_template": template,
                "scheduled_send_on": send_on,
                "status": NotificationOutbox.STATUS_PENDING,
            },
        )
        if inserted:
            created += 1
    return created


def ensure_process_run_for_binding(binding: ProcessBinding) -> ProcessRun | None:
    if not binding.is_active or not binding.next_run_at:
        return None

    with transaction.atomic():
        locked_binding = (
            ProcessBinding.objects.select_for_update()
            .filter(pk=binding.pk)
            .first()
        )
        if locked_binding is None:
            return None

        existing = get_open_run_for_binding(locked_binding)
        if existing:
            return existing

        pt = locked_binding.process_type
        snapshot = binding_subject_snapshot(locked_binding)
        run = ProcessRun.objects.create(
            process_binding=locked_binding,
            process_type=pt,
            subject_snapshot=snapshot,
            scheduled_for=locked_binding.next_run_at,
            status=ProcessRun.STATUS_PENDING,
        )
        subject = snapshot.get("name") or snapshot.get("kind") or ""
        log_activity(
            ActivityLog.EVENT_RUN_CREATED,
            f"Kreirana aktivnost '{pt.name}' za {subject}, termin: {format_date_display(locked_binding.next_run_at)}",
            process_run=run,
            process_binding=locked_binding,
        )
        logger.info(
            "ProcessBinding id=%s run id=%s created (PENDING), scheduled_for=%s",
            locked_binding.id,
            run.id,
            locked_binding.next_run_at,
        )
        binding.next_run_at = locked_binding.next_run_at
        binding.is_active = locked_binding.is_active

    materialize_outbox_for_run(run)
    return run


def _execute_lead_triggers_for_run(
    run: ProcessRun,
    binding: ProcessBinding,
    *,
    executed_at,
) -> bool:
    if trigger_already_executed(run.id, ProcessTemplate.TRIGGER_ON_LEAD):
        return False

    execute_templates_for_trigger(
        "ON_LEAD",
        ProcessTemplate.TRIGGER_ON_LEAD,
        run,
        executed_at=executed_at,
    )
    snapshot = run.subject_snapshot or {}
    subject = snapshot.get("name") or snapshot.get("kind") or ""
    lead_triggers = ProcessTriggerRun.objects.filter(
        process_run=run,
        trigger=ProcessTemplate.TRIGGER_ON_LEAD,
    )
    if lead_triggers.filter(email_sent=True).exists():
        log_activity(
            ActivityLog.EVENT_LEAD_NOTIFIED,
            f"Poslato obaveštenje pre termina za '{run.process_type.name}' ({subject})",
            process_run=run,
            process_binding=binding,
        )
    elif lead_triggers.exclude(email_error="").exists():
        first_error = (
            lead_triggers.exclude(email_error="")
            .values_list("email_error", flat=True)
            .first()
            or ""
        )
        log_activity(
            ActivityLog.EVENT_EMAIL_ERROR,
            (
                f"Greška pri slanju obaveštenja pre termina za "
                f"'{run.process_type.name}' ({subject}): {first_error[:200]}"
            ),
            process_run=run,
            process_binding=binding,
            extra_data={"email_error": first_error},
        )
    return True


def process_lead_for_run(
    run: ProcessRun,
    binding: ProcessBinding,
    *,
    today: date | None = None,
) -> bool:
    today = today or date.today()
    lead_date = run_lead_date(binding)
    if lead_date is None or lead_date > today:
        return False
    executed = _execute_lead_triggers_for_run(
        run,
        binding,
        executed_at=timezone.now(),
    )
    if executed:
        NotificationOutbox.objects.filter(
            process_run=run,
            status=NotificationOutbox.STATUS_PENDING,
            offset_days__lt=0,
            scheduled_send_on__lte=today,
        ).update(status=NotificationOutbox.STATUS_CANCELLED)
    return executed


def ensure_open_runs_for_active_bindings() -> int:
    from django.db.models import Exists, OuterRef

    open_run_qs = ProcessRun.objects.filter(
        process_binding=OuterRef("pk"),
        status__in=OPEN_RUN_STATUSES,
    )
    bindings = (
        ProcessBinding.objects.filter(
            is_active=True,
            next_run_at__isnull=False,
        )
        .annotate(has_open=Exists(open_run_qs))
        .filter(has_open=False)
        .select_related("process_type", "employee", "equipment_item", "client_company")
    )
    created = 0
    for binding in bindings:
        if ensure_process_run_for_binding(binding):
            created += 1
    return created


def run_process_binding(binding_id: int) -> None:
    try:
        binding = (
            ProcessBinding.objects.select_related(
                "process_type", "employee", "equipment_item", "client_company"
            )
            .get(id=binding_id)
        )
    except ProcessBinding.DoesNotExist:
        logger.warning("ProcessBinding id=%s not found", binding_id)
        return

    if not binding.is_active:
        logger.info("ProcessBinding id=%s is inactive, skipping", binding_id)
        return

    run = ensure_process_run_for_binding(binding)
    if run:
        process_lead_for_run(run, binding)


def run_on_completed_trigger(run: ProcessRun) -> None:
    binding = run.process_binding
    snapshot = run.subject_snapshot or {}
    now = timezone.now()
    execute_templates_for_trigger(
        "ON_COMPLETED",
        ProcessTemplate.TRIGGER_ON_COMPLETED,
        run,
        executed_at=now,
    )
    if ProcessTriggerRun.objects.filter(
        process_run=run,
        trigger=ProcessTemplate.TRIGGER_ON_COMPLETED,
    ).exists():
        subject = snapshot.get("name") or snapshot.get("kind") or ""
        log_activity(
            ActivityLog.EVENT_TEMPLATE_EXECUTED,
            f"Izvršen šablon po završetku za '{run.process_type.name}' ({subject})",
            process_run=run,
            process_binding=binding,
        )

    templates = ProcessTemplate.objects.filter(
        process_type_id=run.process_type_id,
        trigger=ProcessTemplate.TRIGGER_ON_COMPLETED,
    )
    for template in templates:
        followup_type: ProcessType | None = template.followup_process_type
        if not followup_type:
            continue

        subject_kind = binding.subject_kind
        qs = ProcessBinding.objects.filter(
            process_type=followup_type,
            subject_kind=subject_kind,
        )
        if binding.employee_id:
            qs = qs.filter(employee_id=binding.employee_id)
        if binding.equipment_item_id:
            qs = qs.filter(equipment_item_id=binding.equipment_item_id)
        if binding.client_company_id:
            qs = qs.filter(client_company_id=binding.client_company_id)

        followup_binding = qs.first()
        if not followup_binding:
            followup_binding = ProcessBinding(
                process_type=followup_type,
                subject_kind=subject_kind,
                employee=binding.employee if binding.employee_id else None,
                equipment_item=(
                    binding.equipment_item if binding.equipment_item_id else None
                ),
                client_company=(
                    binding.client_company if binding.client_company_id else None
                ),
                is_active=True,
            )

        base_date = run.valid_until or run.performed_at or date.today()
        followup_period_months = (
            followup_binding.custom_period_months
            or followup_type.default_period_months
            or 12
        )
        followup_binding.next_run_at = add_months(
            base_date, followup_period_months)

        if followup_binding.lead_time_days is None:
            followup_binding.lead_time_days = followup_type.lead_time_days

        followup_binding.save()
        ensure_process_run_for_binding(followup_binding)


def _send_outbox_row(outbox: NotificationOutbox, now) -> None:
    run = outbox.process_run
    binding = run.process_binding
    snapshot = run.subject_snapshot or {}
    template = outbox.process_template

    if template is None:
        try:
            sent, recipients, subject_text, body_text = send_generic_reminder(
                run, binding, outbox.offset_days, fail_silently=False
            )
        except Exception as exc:
            outbox.attempts += 1
            outbox.last_error = str(exc)
            if outbox.attempts >= MAX_ATTEMPTS:
                outbox.status = NotificationOutbox.STATUS_FAILED
            outbox.save(update_fields=["attempts", "last_error", "status"])
            return
        outbox.status = NotificationOutbox.STATUS_SENT
        outbox.sent_at = now
        outbox.recipients = recipients
        outbox.rendered_subject = subject_text[:255]
        outbox.rendered_body = body_text
        outbox.save(
            update_fields=[
                "status",
                "sent_at",
                "recipients",
                "rendered_subject",
                "rendered_body",
            ]
        )
        ProcessTriggerRun.objects.create(
            process_run=run,
            process_template=None,
            trigger=_trigger_for_offset(outbox.offset_days),
            executed_at=now,
            email_sent=True,
            email_error="",
        )
        subject_name = snapshot.get("name") or snapshot.get("kind") or ""
        log_activity(
            ActivityLog.EVENT_RUN_SENT,
            f"Poslat podsetnik za '{run.process_type.name}' ({subject_name})",
            process_run=run,
            process_binding=binding,
        )
        return

    existing_doc = None
    prior_row = (
        NotificationOutbox.objects.filter(
            process_run=run,
            process_template=template,
            status=NotificationOutbox.STATUS_SENT,
            document_file__isnull=False,
        )
        .exclude(pk=outbox.pk)
        .first()
    )
    if prior_row:
        existing_doc = prior_row.document_file
    else:
        prior_trigger = ProcessTriggerRun.objects.filter(
            process_run=run,
            process_template=template,
            document_file__isnull=False,
        ).first()
        if prior_trigger:
            existing_doc = prior_trigger.document_file

    generated_doc = None
    if template.generate_document and template.document_template_id:
        if existing_doc is not None:
            generated_doc = existing_doc
        else:
            try:
                generated_doc = _generate_document_for_run(
                    run, template, snapshot)
            except Exception as exc:
                logger.exception(
                    "Failed to generate document for outbox id=%s run id=%s: %s",
                    outbox.id,
                    run.id,
                    exc,
                )

    recipients = _resolve_email_recipients(template, binding)
    context = _build_document_context(run, snapshot)
    subject_text = _render_template_body(
        template.email_subject_template or "", context
    )
    body_text = _render_template_body(
        template.email_body_template or "", context
    )

    email_sent = False
    email_error = ""
    try:
        email_sent = _send_email_for_template(
            template,
            binding,
            snapshot,
            run=run,
            generated_document=generated_doc,
            fail_silently=False,
        )
    except Exception as exc:
        email_error = str(exc)
        logger.exception(
            "Failed to send email for outbox id=%s run id=%s: %s",
            outbox.id,
            run.id,
            exc,
        )

    trigger = _trigger_for_offset(outbox.offset_days)

    if email_sent:
        outbox.status = NotificationOutbox.STATUS_SENT
        outbox.sent_at = now
        outbox.recipients = recipients
        outbox.rendered_subject = subject_text[:255]
        outbox.rendered_body = body_text
        outbox.document_file = generated_doc
        outbox.save(update_fields=[
            "status", "sent_at", "recipients", "rendered_subject",
            "rendered_body", "document_file", "attempts",
        ])
        ProcessTriggerRun.objects.create(
            process_run=run,
            process_template=template,
            trigger=trigger,
            executed_at=now,
            email_sent=True,
            email_error="",
            document_file=generated_doc,
        )
        subject_name = snapshot.get("name") or snapshot.get("kind") or ""
        event_map = {
            ProcessTemplate.TRIGGER_ON_LEAD: (
                ActivityLog.EVENT_LEAD_NOTIFIED,
                f"Poslato obaveštenje pre termina za '{run.process_type.name}' ({subject_name})",
            ),
            ProcessTemplate.TRIGGER_ON_SCHEDULED: (
                ActivityLog.EVENT_RUN_SENT,
                f"Podsetnik na dan termina za '{run.process_type.name}' ({subject_name})",
            ),
            ProcessTemplate.TRIGGER_ON_OVERDUE: (
                ActivityLog.EVENT_OVERDUE_REMINDER,
                f"Podsetnik: aktivnost nije završena za '{run.process_type.name}' ({subject_name}), termin: {format_date_display(run.scheduled_for)}",
            ),
        }
        event_type, description = event_map.get(
            trigger,
            (ActivityLog.EVENT_TEMPLATE_EXECUTED,
             f"Izvršen okidač {trigger} za '{run.process_type.name}'"),
        )
        log_activity(
            event_type,
            description,
            process_run=run,
            process_binding=binding,
        )
    else:
        outbox.attempts += 1
        outbox.last_error = email_error or "Mejl nije poslat."
        if outbox.attempts >= MAX_ATTEMPTS:
            outbox.status = NotificationOutbox.STATUS_FAILED
        outbox.save(update_fields=["attempts", "last_error", "status"])
        ProcessTriggerRun.objects.create(
            process_run=run,
            process_template=template,
            trigger=trigger,
            executed_at=now,
            email_sent=False,
            email_error=email_error or "Mejl nije poslat.",
            document_file=generated_doc,
        )
        subject_name = snapshot.get("name") or snapshot.get("kind") or ""
        log_activity(
            ActivityLog.EVENT_EMAIL_ERROR,
            f"Greška pri slanju ({trigger}) za '{run.process_type.name}' ({subject_name}): {(email_error or '')[:200]}",
            process_run=run,
            process_binding=binding,
            extra_data={"email_error": email_error or "Mejl nije poslat."},
        )


def _catch_up_materialize(today: date) -> int:
    open_runs = (
        ProcessRun.objects.filter(status__in=OPEN_RUN_STATUSES)
        .select_related("process_binding", "process_binding__process_type", "process_type")
    )
    total = 0
    for run in open_runs:
        total += materialize_outbox_for_run(run)
    return total


def run_process_reminders(*, today: date | None = None) -> int:
    today = today or date.today()
    _catch_up_materialize(today)

    due_rows = (
        NotificationOutbox.objects.filter(
            status=NotificationOutbox.STATUS_PENDING,
            scheduled_send_on__lte=today,
            attempts__lt=MAX_ATTEMPTS,
        )
        .select_related(
            "process_run",
            "process_run__process_binding",
            "process_run__process_binding__process_type",
            "process_run__process_binding__employee",
            "process_run__process_binding__equipment_item",
            "process_run__process_binding__client_company",
            "process_run__process_type",
            "process_template",
            "process_template__document_template",
            "process_template__notification_role_group",
        )
        .filter(process_run__status__in=OPEN_RUN_STATUSES)
    )
    now = timezone.now()
    n = 0
    for row in due_rows:
        try:
            _send_outbox_row(row, now)
            n += 1
        except Exception as exc:
            logger.exception(
                "Unexpected error processing outbox id=%s: %s", row.id, exc
            )
    if n:
        logger.info("run_process_reminders: processed %s outbox row(s)", n)
    return n
