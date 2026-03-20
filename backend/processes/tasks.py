from datetime import date, timedelta
import logging

from .models import ProcessBinding, ProcessRun, ProcessTemplate, ProcessType
from .utils import binding_subject_snapshot, execute_template_actions

logger = logging.getLogger(__name__)


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

    pt = binding.process_type
    scheduled_for = binding.next_run_at or date.today()
    snapshot = binding_subject_snapshot(binding)

    run = ProcessRun.objects.create(
        process_binding=binding,
        process_type=pt,
        subject_snapshot=snapshot,
        scheduled_for=scheduled_for,
        status=ProcessRun.STATUS_PENDING,
    )

    templates = ProcessTemplate.objects.filter(
        process_type=pt,
        trigger=ProcessTemplate.TRIGGER_ON_SCHEDULED,
    ).select_related("document_template")

    for template in templates:
        execute_template_actions(
            "ON_SCHEDULED", run, binding, snapshot, template)

    logger.info(
        "ProcessBinding id=%s run id=%s created (PENDING), scheduled_for=%s",
        binding_id,
        run.id,
        scheduled_for,
    )


def run_on_completed_trigger(run: ProcessRun) -> None:
    binding = run.process_binding
    snapshot = run.subject_snapshot or {}
    templates = (
        ProcessTemplate.objects.filter(
            process_type_id=run.process_type_id,
            trigger=ProcessTemplate.TRIGGER_ON_COMPLETED,
        )
        .select_related("document_template")
    )
    for template in templates:
        execute_template_actions(
            "ON_COMPLETED", run, binding, snapshot, template)

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
        next_run_at = base_date + timedelta(days=followup_period_months * 30)
        followup_binding.next_run_at = next_run_at

        if followup_binding.lead_time_days is None:
            followup_binding.lead_time_days = followup_type.lead_time_days

        followup_binding.save()


def run_on_expired_trigger(run: ProcessRun) -> None:
    binding = run.process_binding
    snapshot = run.subject_snapshot or {}
    templates = (
        ProcessTemplate.objects.filter(
            process_type_id=run.process_type_id,
            trigger=ProcessTemplate.TRIGGER_ON_EXPIRED,
        )
        .select_related("document_template")
    )
    for template in templates:
        execute_template_actions(
            "ON_EXPIRED", run, binding, snapshot, template)


def run_expired_reminders() -> None:
    today = date.today()
    runs = (
        ProcessRun.objects.filter(
            status=ProcessRun.STATUS_COMPLETED,
            valid_until__lt=today,
        )
        .select_related("process_binding", "process_type")
    )
    n = 0
    for run in runs:
        try:
            run_on_expired_trigger(run)
            n += 1
        except Exception as e:
            logger.exception(
                "Failed to run ON_EXPIRED for run id=%s: %s", run.id, e
            )
    if n:
        logger.info("run_expired_reminders: processed %s expired run(s)", n)
