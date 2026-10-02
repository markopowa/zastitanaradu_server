from django.db import transaction
from django.utils import timezone

from processes.models import NotificationOutbox, ProcessBinding, ProcessRun
from processes.tasks import ensure_process_run_for_binding

OPEN_STATUSES = (ProcessRun.STATUS_PENDING, ProcessRun.STATUS_SENT)


def deactivate_bindings(bindings) -> int:
    count = 0
    with transaction.atomic():
        for binding in bindings.select_for_update():
            open_runs = ProcessRun.objects.filter(
                process_binding=binding,
                status__in=OPEN_STATUSES,
            )
            NotificationOutbox.objects.filter(
                process_run__in=open_runs,
                status=NotificationOutbox.STATUS_PENDING,
            ).update(status=NotificationOutbox.STATUS_CANCELLED)
            open_runs.update(status=ProcessRun.STATUS_CANCELLED)
            binding.is_active = False
            binding.save(update_fields=["is_active"])
            count += 1
    return count


def _employee_bindings(employee):
    return ProcessBinding.objects.filter(
        subject_kind=ProcessBinding.SUBJECT_EMPLOYEE,
        employee=employee,
        is_active=True,
    )


def sync_employee_obligations(employee) -> None:
    from .employee_bindings import ensure_default_bindings_for_employee

    from .obligation_rules import (
        AUTO_EMPLOYEE_CODES,
        MEDICAL_CODES,
        employee_needs,
        is_required,
    )

    if not employee.is_employed:
        deactivate_bindings(_employee_bindings(employee))
        return

    stale_ids = []
    for binding in _employee_bindings(employee).select_related("process_type"):
        pt = binding.process_type
        if not is_required(pt, employee.client_company):
            stale_ids.append(binding.id)
        elif pt.code in AUTO_EMPLOYEE_CODES and not employee_needs(
            pt.code, employee
        ):
            stale_ids.append(binding.id)
        elif pt.code in MEDICAL_CODES and not employee.is_high_risk:
            stale_ids.append(binding.id)
    if stale_ids:
        deactivate_bindings(ProcessBinding.objects.filter(id__in=stale_ids))
    ensure_default_bindings_for_employee(employee)


def sync_role_employees(job_role) -> None:
    for employee in job_role.employees.select_related("job_role__risk_level"):
        sync_employee_obligations(employee)


def sync_risk_level_employees(risk_level) -> None:
    from .models import Employee

    employees = Employee.objects.filter(job_role__risk_level=risk_level)
    for employee in employees.select_related("job_role__risk_level"):
        sync_employee_obligations(employee)


def sync_equipment_obligations(equipment, previous_type_id=None) -> None:
    from .equipment_bindings import ensure_default_bindings_for_equipment

    active = ProcessBinding.objects.filter(
        subject_kind=ProcessBinding.SUBJECT_EQUIPMENT,
        equipment_item=equipment,
        is_active=True,
    )
    if not equipment.is_active:
        deactivate_bindings(active)
        return
    if (
        previous_type_id
        and previous_type_id != equipment.service_process_type_id
    ):
        deactivate_bindings(active.filter(process_type_id=previous_type_id))
    ensure_default_bindings_for_equipment(equipment)


def deactivate_departed_employees() -> int:
    from .models import Employee

    today = timezone.localdate()
    departed = Employee.objects.filter(
        employment_end_date__lte=today,
        process_bindings__is_active=True,
    ).distinct()
    total = 0
    for employee in departed:
        total += deactivate_bindings(_employee_bindings(employee))
    return total


def _company_bindings(company):
    from django.db.models import Q

    return ProcessBinding.objects.filter(
        Q(client_company=company)
        | Q(employee__client_company=company)
        | Q(equipment_item__client_company=company)
    )


def sync_company_obligations(company) -> None:
    from .equipment_bindings import ensure_default_bindings_for_equipment
    from .obligation_rules import is_required

    required = {}
    stale_ids = []
    for binding in _company_bindings(company).filter(
        is_active=True
    ).select_related("process_type"):
        pt = binding.process_type
        if pt.id not in required:
            required[pt.id] = is_required(pt, company)
        if not required[pt.id]:
            stale_ids.append(binding.id)
    if stale_ids:
        deactivate_bindings(ProcessBinding.objects.filter(id__in=stale_ids))

    inactive_company_bindings = ProcessBinding.objects.filter(
        subject_kind=ProcessBinding.SUBJECT_CLIENT_COMPANY,
        client_company=company,
        is_active=False,
    ).select_related("process_type")
    reactivated = set()
    for binding in inactive_company_bindings.order_by("-id"):
        pt = binding.process_type
        if pt.id in reactivated or not is_required(pt, company):
            continue
        if ProcessBinding.objects.filter(
            subject_kind=ProcessBinding.SUBJECT_CLIENT_COMPANY,
            client_company=company,
            process_type=pt,
            is_active=True,
        ).exists():
            continue
        binding.is_active = True
        binding.save(update_fields=["is_active"])
        ensure_process_run_for_binding(binding)
        reactivated.add(pt.id)

    for employee in company.employees.select_related("job_role__risk_level"):
        sync_employee_obligations(employee)
    for equipment in company.equipment_items.filter(is_active=True):
        ensure_default_bindings_for_equipment(equipment)
