from django.utils import timezone

from processes.dates import add_months
from processes.models import ProcessBinding, ProcessType
from processes.period_resolution import resolve_period_months
from processes.tasks import ensure_process_run_for_binding


def _get_active_type(code: str):
    try:
        return ProcessType.objects.get(code=code, is_active=True)
    except ProcessType.DoesNotExist:
        return None


def _has_active_binding(process_type: ProcessType, employee) -> bool:
    return ProcessBinding.objects.filter(
        process_type=process_type,
        subject_kind=ProcessBinding.SUBJECT_EMPLOYEE,
        employee=employee,
        is_active=True,
    ).exists()


def _create_binding(process_type: ProcessType, employee, next_run_at) -> ProcessBinding:
    return ProcessBinding.objects.create(
        process_type=process_type,
        subject_kind=ProcessBinding.SUBJECT_EMPLOYEE,
        employee=employee,
        is_active=True,
        next_run_at=next_run_at,
    )


def ensure_default_bindings_for_employee(employee) -> None:
    today = timezone.localdate()

    rl = employee.effective_risk_level
    is_high_risk = bool(rl and rl.is_high_risk)

    for code in ("OSPOSOBLJAVANJE_BZR", "ZOP_OBUKA", "LZO_ZADUZENJE"):
        pt = _get_active_type(code)
        if pt is None:
            continue
        if _has_active_binding(pt, employee):
            continue
        binding = _create_binding(pt, employee, today)
        ensure_process_run_for_binding(binding)

    if is_high_risk:
        pt_prethodni = _get_active_type("PRETHODNI_LEKARSKI")
        if pt_prethodni is not None and not _has_active_binding(pt_prethodni, employee):
            binding = _create_binding(pt_prethodni, employee, today)
            ensure_process_run_for_binding(binding)

        pt_lekarski = _get_active_type("LEKARSKI_PREGLED")
        if pt_lekarski is not None and not _has_active_binding(pt_lekarski, employee):
            period = resolve_period_months(pt_lekarski, employee) or 12
            next_run_at = add_months(today, period)
            _create_binding(pt_lekarski, employee, next_run_at)
