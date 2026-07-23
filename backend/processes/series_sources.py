from partners.models import ClientCompany, Employee

from .models import ProcessRun


def _company_id_for_entity(entity) -> int | None:
    if entity is None:
        return None
    if isinstance(entity, ClientCompany):
        return entity.id
    binding = getattr(entity, "process_binding", None)
    if binding is not None:
        if binding.client_company_id:
            return binding.client_company_id
        if binding.employee_id:
            return binding.employee.client_company_id
        if binding.equipment_item_id:
            return binding.equipment_item.client_company_id
    if hasattr(entity, "client_company_id"):
        return entity.client_company_id
    return None


def _fmt_date(d) -> str:
    if not d:
        return ""
    try:
        return d.strftime("%d.%m.%Y.")
    except AttributeError:
        return str(d)


def _result_data_field(rd, new_key, old_key) -> str:
    if not isinstance(rd, dict):
        return ""
    v = rd.get(new_key)
    if v is not None and str(v).strip() != "":
        return str(v)
    v2 = rd.get(old_key)
    return "" if v2 is None else str(v2)


def completed_medical_exams_for_company(entity, context: dict) -> list[dict]:
    company_id = _company_id_for_entity(entity)
    if company_id is None:
        return []

    runs = (
        ProcessRun.objects.filter(
            status=ProcessRun.STATUS_COMPLETED,
            process_binding__employee__client_company_id=company_id,
            process_type__include_in_medical_exam_record=True,
        )
        .select_related(
            "process_type",
            "process_binding",
            "process_binding__employee",
        )
        .order_by(
            "process_binding__employee__last_name",
            "process_binding__employee__first_name",
            "process_type__name",
            "performed_at",
        )
    )

    rows = []
    for run in runs:
        binding = run.process_binding
        emp = binding.employee
        rd = run.result_data or {}
        interval = (
            binding.custom_period_months
            or run.process_type.default_period_months
            or ""
        )
        rows.append({
            "employee_name": f"{emp.first_name} {emp.last_name}".strip(),
            "job_role_name": emp.high_risk_position_name or "",
            "interval_months": str(interval),
            "performed_at": _fmt_date(run.performed_at),
            "next_exam_date": _fmt_date(run.valid_until),
            "report_number": _result_data_field(
                rd, "report_number", "broj_izvestaja"),
            "fitness_assessment": _result_data_field(
                rd, "fitness_assessment", "ocena_sposobnosti"),
            "measures": _result_data_field(
                rd, "measures_taken", "preduzete_mere"),
        })
    return rows


def high_risk_employees_for_company(entity, context: dict) -> list[dict]:
    company_id = _company_id_for_entity(entity)
    if company_id is None:
        return []

    employees = (
        Employee.objects.filter(client_company_id=company_id)
        .select_related("job_role", "job_role__risk_level", "risk_level_override")
        .order_by("last_name", "first_name")
    )

    rows = []
    for emp in employees:
        level = emp.effective_risk_level
        if level is None or not level.is_high_risk:
            continue
        rows.append({
            "employee_name": f"{emp.first_name} {emp.last_name}".strip(),
            "job_role_name": emp.high_risk_position_name or "",
            "risk_label": level.label,
        })
    return rows


SERIES_SOURCES = {
    "completed_medical_exams_for_company": completed_medical_exams_for_company,
    "high_risk_employees_for_company": high_risk_employees_for_company,
}


def get_series_source(key):
    return SERIES_SOURCES.get(key)
