from django.utils import timezone

from processes.models import ProcessBinding, ProcessType
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
    inactive = (
        ProcessBinding.objects.filter(
            process_type=process_type,
            subject_kind=ProcessBinding.SUBJECT_EMPLOYEE,
            employee=employee,
            is_active=False,
        )
        .order_by("-id")
        .first()
    )
    if inactive is not None:
        inactive.is_active = True
        if inactive.next_run_at is None:
            inactive.next_run_at = next_run_at
        inactive.save(update_fields=["is_active", "next_run_at"])
        return inactive
    return ProcessBinding.objects.create(
        process_type=process_type,
        subject_kind=ProcessBinding.SUBJECT_EMPLOYEE,
        employee=employee,
        is_active=True,
        next_run_at=next_run_at,
    )


def ensure_default_bindings_for_employee(employee) -> None:
    from .obligation_rules import AUTO_EMPLOYEE_CODES, employee_needs, is_required

    if not employee.is_employed:
        return
    today = timezone.localdate()
    company = employee.client_company

    for code in AUTO_EMPLOYEE_CODES:
        if not employee_needs(code, employee):
            continue
        pt = _get_active_type(code)
        if pt is None or not is_required(pt, company):
            continue
        if _has_active_binding(pt, employee):
            continue
        binding = _create_binding(pt, employee, today)
        ensure_process_run_for_binding(binding)
