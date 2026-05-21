import logging
from datetime import date, timedelta

from django.utils import timezone

from .activity_log import log_activity
from .models import ActivityLog, ProcessBinding, ProcessRun, ProcessTemplate, ProcessTriggerRun, ProcessType
from .trigger_utils import execute_templates_for_trigger, run_lead_date, trigger_already_executed
from .utils import binding_subject_snapshot

logger = logging.getLogger(__name__)

OPEN_RUN_STATUSES = (ProcessRun.STATUS_PENDING, ProcessRun.STATUS_SENT)


def get_open_run_for_binding(binding: ProcessBinding) -> ProcessRun | None:
    return (
        ProcessRun.objects.filter(
            process_binding=binding,
            status__in=OPEN_RUN_STATUSES,
        )
        .order_by("-id")
        .first()
    )


def ensure_process_run_for_binding(binding: ProcessBinding) -> ProcessRun | None:
    if not binding.is_active or not binding.next_run_at:
        return None

    existing = get_open_run_for_binding(binding)
    if existing:
        if existing.scheduled_for != binding.next_run_at:
            existing.scheduled_for = binding.next_run_at
            existing.save(update_fields=["scheduled_for"])
        return existing

    pt = binding.process_type
    snapshot = binding_subject_snapshot(binding)
    run = ProcessRun.objects.create(
        process_binding=binding,
        process_type=pt,
        subject_snapshot=snapshot,
        scheduled_for=binding.next_run_at,
        status=ProcessRun.STATUS_PENDING,
    )
    subject = snapshot.get("name") or snapshot.get("kind") or ""
    log_activity(
        ActivityLog.EVENT_RUN_CREATED,
        f"Kreirana aktivnost '{pt.name}' za {subject}, termin: {binding.next_run_at}",
        process_run=run,
        process_binding=binding,
    )
    logger.info(
        "ProcessBinding id=%s run id=%s created (PENDING), scheduled_for=%s",
        binding.id,
        run.id,
        binding.next_run_at,
    )
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
    log_activity(
        ActivityLog.EVENT_LEAD_NOTIFIED,
        f"Obaveštenje pre termina (ON_LEAD) za '{run.process_type.name}' ({subject})",
        process_run=run,
        process_binding=binding,
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
    return _execute_lead_triggers_for_run(
        run,
        binding,
        executed_at=timezone.now(),
    )


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


def process_lead_triggers(*, today: date | None = None) -> int:
    today = today or date.today()
    now = timezone.now()
    runs = (
        ProcessRun.objects.filter(
            status__in=OPEN_RUN_STATUSES,
            process_binding__is_active=True,
            process_binding__next_run_at__isnull=False,
        )
        .select_related(
            "process_binding",
            "process_binding__process_type",
            "process_type",
        )
    )
    processed = 0
    for run in runs:
        binding = run.process_binding
        lead_date = run_lead_date(binding)
        if lead_date is None or lead_date > today:
            continue
        if _execute_lead_triggers_for_run(run, binding, executed_at=now):
            processed += 1
    if processed:
        logger.info("process_lead_triggers: processed %s trigger(s)", processed)
    return processed


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
            f"Šablon ON_COMPLETED izvršen za '{run.process_type.name}' ({subject})",
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
        followup_binding.next_run_at = base_date + timedelta(
            days=followup_period_months * 30
        )

        if followup_binding.lead_time_days is None:
            followup_binding.lead_time_days = followup_type.lead_time_days

        followup_binding.save()
        ensure_process_run_for_binding(followup_binding)


def run_process_reminders(*, today: date | None = None) -> int:
    today = today or date.today()
    n = 0

    scheduled_runs = (
        ProcessRun.objects.filter(
            status__in=OPEN_RUN_STATUSES,
            scheduled_for=today,
        )
        .select_related("process_binding", "process_type")
    )
    now = timezone.now()
    for run in scheduled_runs:
        if trigger_already_executed(run.id, ProcessTemplate.TRIGGER_ON_SCHEDULED):
            continue
        try:
            execute_templates_for_trigger(
                "ON_SCHEDULED",
                ProcessTemplate.TRIGGER_ON_SCHEDULED,
                run,
                executed_at=now,
            )
            n += 1
            snapshot = run.subject_snapshot or {}
            subject = snapshot.get("name") or snapshot.get("kind") or ""
            log_activity(
                ActivityLog.EVENT_RUN_SENT,
                f"Podsetnik na dan termina za '{run.process_type.name}' ({subject})",
                process_run=run,
                process_binding=run.process_binding,
            )
        except Exception as e:
            logger.exception(
                "Failed ON_SCHEDULED for run id=%s: %s", run.id, e
            )

    overdue_runs = (
        ProcessRun.objects.filter(
            status__in=OPEN_RUN_STATUSES,
            scheduled_for__lt=today,
        )
        .select_related("process_binding", "process_type")
    )
    for run in overdue_runs:
        if trigger_already_executed(run.id, ProcessTemplate.TRIGGER_ON_OVERDUE):
            continue
        try:
            execute_templates_for_trigger(
                "ON_OVERDUE",
                ProcessTemplate.TRIGGER_ON_OVERDUE,
                run,
                executed_at=now,
            )
            n += 1
            snapshot = run.subject_snapshot or {}
            subject = snapshot.get("name") or snapshot.get("kind") or ""
            log_activity(
                ActivityLog.EVENT_OVERDUE_REMINDER,
                f"Podsetnik: aktivnost nije završena za '{run.process_type.name}' ({subject}), termin: {run.scheduled_for}",
                process_run=run,
                process_binding=run.process_binding,
            )
        except Exception as e:
            logger.exception(
                "Failed ON_OVERDUE for run id=%s: %s", run.id, e
            )

    if n:
        logger.info("run_process_reminders: processed %s trigger(s)", n)
    return n
