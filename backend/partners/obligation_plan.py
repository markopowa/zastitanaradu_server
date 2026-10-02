from django.utils import timezone

from processes.models import ProcessBinding, ProcessRun, ProcessType

from .obligation_rules import (
    APPLICABLE,
    UNKNOWN,
    applicability,
    employee_needs,
    is_coverage_any,
)

STATUS_OK = "OK"
STATUS_DUE_SOON = "DUE_SOON"
STATUS_OVERDUE = "OVERDUE"
STATUS_MISSING = "MISSING"
STATUS_EXCLUDED = "EXCLUDED"
STATUS_NOT_APPLICABLE = "NOT_APPLICABLE"
STATUS_NEEDS_PROFILE = "NEEDS_PROFILE"

DUE_SOON_DAYS = 30


def evaluate_applicability(process_type: ProcessType, company) -> bool:
    return applicability(process_type, company) == APPLICABLE


def _periodic_status_for_company(process_type: ProcessType, company) -> str:
    subject_kind = process_type.subject_kind
    if subject_kind == ProcessType.SUBJECT_EMPLOYEE:
        return _employee_obligation_status(process_type, company)[0]
    if subject_kind == ProcessType.SUBJECT_CLIENT_COMPANY:
        bindings = ProcessBinding.objects.filter(
            process_type=process_type,
            client_company=company,
            is_active=True,
        )
    elif subject_kind == ProcessType.SUBJECT_EQUIPMENT:
        bindings = ProcessBinding.objects.filter(
            process_type=process_type,
            equipment_item__client_company=company,
            equipment_item__is_active=True,
            is_active=True,
        )
    else:
        bindings = ProcessBinding.objects.none()

    if not bindings.exists():
        return STATUS_MISSING
    today = timezone.localdate()
    worst = STATUS_OK
    for binding in bindings:
        worst = _escalate(worst, _binding_status(binding, today))
    return worst


def _binding_status(binding, today) -> str:
    completed = (
        ProcessRun.objects.filter(
            process_binding=binding,
            status=ProcessRun.STATUS_COMPLETED,
        )
        .order_by("-performed_at", "-id")
        .first()
    )
    open_run = (
        ProcessRun.objects.filter(
            process_binding=binding,
            status__in=(ProcessRun.STATUS_PENDING, ProcessRun.STATUS_SENT),
        )
        .order_by("-scheduled_for")
        .first()
    )
    if completed is None and open_run is None:
        return STATUS_MISSING
    if completed is not None and completed.valid_until is not None:
        days_left = (completed.valid_until - today).days
        if days_left < 0:
            return STATUS_OVERDUE
        if days_left <= DUE_SOON_DAYS:
            return STATUS_DUE_SOON
        return STATUS_OK
    if completed is not None and open_run is None:
        return STATUS_OK
    if open_run.scheduled_for and open_run.scheduled_for < today:
        return STATUS_OVERDUE
    if open_run.scheduled_for:
        days_left = (open_run.scheduled_for - today).days
        if days_left <= DUE_SOON_DAYS:
            return STATUS_DUE_SOON
    return STATUS_OK


def _employee_obligation_status(process_type: ProcessType, company):
    from partners.models import Employee

    today = timezone.localdate()
    employees = [
        e
        for e in Employee.objects.filter(client_company=company).select_related(
            "job_role__risk_level"
        )
        if e.is_employed
    ]
    bindings = {
        b.employee_id: b
        for b in ProcessBinding.objects.filter(
            process_type=process_type,
            employee__client_company=company,
            is_active=True,
        )
    }

    coverage_any = is_coverage_any(process_type)
    if coverage_any:
        subjects = [e for e in employees if e.id in bindings]
    else:
        subjects = []
        for e in employees:
            needs = employee_needs(process_type.code, e)
            if needs or (needs is None and e.id in bindings):
                subjects.append(e)

    statuses = [
        _binding_status(bindings[e.id], today) if e.id in bindings
        else STATUS_MISSING
        for e in subjects
    ]
    covered = sum(1 for st in statuses if st in (STATUS_OK, STATUS_DUE_SOON))
    counts = {"covered": covered, "total": len(subjects)}

    if coverage_any:
        if STATUS_OK in statuses:
            return STATUS_OK, counts
        if STATUS_DUE_SOON in statuses:
            return STATUS_DUE_SOON, counts
        if STATUS_OVERDUE in statuses:
            return STATUS_OVERDUE, counts
        return STATUS_MISSING, counts

    if not subjects:
        return STATUS_OK, counts
    worst = STATUS_OK
    for st in statuses:
        worst = _escalate(worst, st)
    return worst, counts


def _escalate(current: str, candidate: str) -> str:
    priority = {STATUS_OK: 0, STATUS_DUE_SOON: 1,
                STATUS_OVERDUE: 2, STATUS_MISSING: 3}
    if priority.get(candidate, 0) > priority.get(current, 0):
        return candidate
    return current


def _living_document_status(process_type: ProcessType, company) -> str:
    from partners.models import CompanyDocument

    kind = process_type.company_document_kind
    if not kind:
        return STATUS_MISSING

    if process_type.code == "AKT_PROCENA_RIZIKA":
        return _risk_assessment_act_status(company)

    exists = CompanyDocument.objects.filter(
        client_company=company,
        kind=kind,
    ).exists()
    return STATUS_OK if exists else STATUS_MISSING


def _risk_assessment_act_status(company) -> str:
    from partners.models import RiskAssessmentAct

    try:
        act = company.risk_assessment_act
    except Exception:
        return STATUS_MISSING

    sections = act.sections.all()
    if sections.count() < 3:
        return STATUS_DUE_SOON
    if all(s.current_file for s in sections):
        return STATUS_OK
    return STATUS_DUE_SOON


def _appointment_status(process_type: ProcessType, company) -> str:
    from partners.models import CompanyDocument

    kind = process_type.company_document_kind
    if not kind:
        return STATUS_MISSING
    exists = CompanyDocument.objects.filter(
        client_company=company,
        kind=kind,
    ).exists()
    return STATUS_OK if exists else STATUS_MISSING


def obligation_status(process_type: ProcessType, company) -> str:
    shape = process_type.shape
    if shape == ProcessType.SHAPE_PERIODIC:
        return _periodic_status_for_company(process_type, company)
    if shape == ProcessType.SHAPE_LIVING_DOCUMENT:
        return _living_document_status(process_type, company)
    if shape == ProcessType.SHAPE_APPOINTMENT:
        return _appointment_status(process_type, company)
    return STATUS_MISSING


def build_obligation_plan(company):
    from partners.models import CompanyObligationExclusion

    active_types = ProcessType.objects.filter(
        is_active=True).order_by("domain", "code")
    exclusions = {
        exc.process_type_id: exc
        for exc in CompanyObligationExclusion.objects.filter(
            client_company=company,
        ).select_related("process_type")
    }

    rows = []
    for pt in active_types:
        applicability_state = applicability(pt, company)
        applicable = applicability_state == APPLICABLE
        exclusion = exclusions.get(pt.id)
        excluded = exclusion is not None
        exclusion_reason = exclusion.reason if exclusion else ""
        counts = None

        if excluded:
            row_status = STATUS_EXCLUDED
        elif applicability_state == UNKNOWN:
            row_status = STATUS_NEEDS_PROFILE
        elif not applicable:
            row_status = STATUS_NOT_APPLICABLE
        elif (
            pt.shape == ProcessType.SHAPE_PERIODIC
            and pt.subject_kind == ProcessType.SUBJECT_EMPLOYEE
        ):
            row_status, counts = _employee_obligation_status(pt, company)
        else:
            row_status = obligation_status(pt, company)

        rows.append({
            "process_type": {
                "id": pt.id,
                "code": pt.code,
                "name": pt.name,
                "domain": pt.domain,
                "shape": pt.shape,
                "legal_basis": pt.legal_basis,
            },
            "applicable": applicable,
            "excluded": excluded,
            "exclusion_reason": exclusion_reason,
            "status": row_status,
            "counts": counts,
        })

    return rows
