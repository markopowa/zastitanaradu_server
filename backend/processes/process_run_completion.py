import logging
from datetime import date, timedelta

from .models import ProcessRun
from .result_data import normalize_process_run_result_data
from .tasks import run_on_completed_trigger

logger = logging.getLogger(__name__)


def apply_process_run_completion(run, validated_data, *, user=None):
    valid_until = validated_data["valid_until"]
    performed_at = validated_data.get("performed_at") or date.today()
    notes = validated_data.get("notes") or ""
    raw_result = validated_data.get("result_data")
    result_data = (
        normalize_process_run_result_data(raw_result)
        if raw_result is not None
        else None
    )

    run.performed_at = performed_at
    run.valid_until = valid_until
    run.status = ProcessRun.STATUS_COMPLETED
    if notes:
        run.notes = notes
    if result_data is not None:
        run.result_data = result_data
    update_fields = ["performed_at", "valid_until", "status", "notes"]
    if result_data is not None:
        update_fields.append("result_data")
    run.save(update_fields=update_fields)
    logger.info(
        "ProcessRun id=%s completed by user_id=%s (%s), valid_until=%s",
        run.id,
        getattr(user, "id", None) if user is not None else None,
        getattr(user, "username", "") if user is not None else "",
        valid_until,
    )

    binding = run.process_binding
    binding.last_run_at = performed_at
    period_months = (
        binding.custom_period_months or binding.process_type.default_period_months
    )
    if period_months:
        binding.next_run_at = valid_until + timedelta(days=period_months * 30)
    binding.save(update_fields=["last_run_at", "next_run_at"])

    run_on_completed_trigger(run)
    return run
