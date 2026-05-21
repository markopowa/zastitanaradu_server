from datetime import date, timedelta

from .models import ProcessBinding, ProcessRun, ProcessTemplate, ProcessTriggerRun
from .utils import execute_template_actions


def binding_lead_days(binding: ProcessBinding) -> int:
    if binding.lead_time_days is not None:
        return binding.lead_time_days
    return binding.process_type.lead_time_days or 0


def run_lead_date(binding: ProcessBinding) -> date | None:
    scheduled = binding.next_run_at
    if not scheduled:
        return None
    return scheduled - timedelta(days=binding_lead_days(binding))


def _templates_for_trigger(process_type_id: int, trigger: str):
    return (
        ProcessTemplate.objects.filter(
            process_type_id=process_type_id,
            trigger=trigger,
        )
        .select_related("document_template")
    )


def execute_templates_for_trigger(
    trigger_label: str,
    trigger_constant: str,
    run: ProcessRun,
    *,
    executed_at,
    executed_by=None,
) -> None:
    binding = run.process_binding
    snapshot = run.subject_snapshot or {}
    for template in _templates_for_trigger(run.process_type_id, trigger_constant):
        generated_document = execute_template_actions(
            trigger_label, run, binding, snapshot, template,
        )
        ProcessTriggerRun.objects.create(
            process_run=run,
            process_template=template,
            trigger=trigger_constant,
            executed_at=executed_at,
            executed_by=executed_by,
            document_file=generated_document,
        )


def trigger_already_executed(run_id: int, trigger: str) -> bool:
    return ProcessTriggerRun.objects.filter(
        process_run_id=run_id,
        trigger=trigger,
    ).exists()
