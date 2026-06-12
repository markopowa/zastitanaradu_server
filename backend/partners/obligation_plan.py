from django.utils import timezone

from processes.models import ProcessBinding, ProcessRun, ProcessType

STATUS_OK = "OK"
STATUS_DUE_SOON = "DUE_SOON"
STATUS_OVERDUE = "OVERDUE"
STATUS_MISSING = "MISSING"
STATUS_EXCLUDED = "EXCLUDED"
STATUS_NOT_APPLICABLE = "NOT_APPLICABLE"

DUE_SOON_DAYS = 30


def _company_has_installation(company, code: str) -> bool:
    installations = company.installations or []
    return code in installations


def evaluate_applicability(process_type: ProcessType, company) -> bool:
    rule = process_type.applicability_rule or {}

    if rule.get("always"):
        return True

    zop_in = rule.get("zop_category_in")
    if zop_in is not None:
        return bool(company.zop_category and company.zop_category in zop_in)

    req_inst = rule.get("requires_installation")
    if req_inst is not None:
        return _company_has_installation(company, req_inst)

    if rule.get("high_risk_only"):
        return bool(company.high_risk_activity)

    return False


def _finding_status_to_plan_status(finding_status: str) -> str:
    from partners.models import CompanyComplianceFinding

    mapping = {
        CompanyComplianceFinding.STATUS_VALID: STATUS_OK,
        CompanyComplianceFinding.STATUS_EXPIRING: STATUS_DUE_SOON,
        CompanyComplianceFinding.STATUS_EXPIRED: STATUS_OVERDUE,
        CompanyComplianceFinding.STATUS_MISSING: STATUS_MISSING,
    }
    return mapping.get(finding_status, STATUS_MISSING)


def _periodic_status_for_company(process_type: ProcessType, company) -> str:
    from partners.models import CompanyComplianceFinding, ComplianceFindingType

    finding_type = ComplianceFindingType.objects.filter(
        process_type=process_type,
        is_active=True,
    ).first()
    if finding_type is not None:
        finding = CompanyComplianceFinding.objects.filter(
            client_company=company,
            finding_type=finding_type,
        ).first()
        raw_status = finding.status if finding else CompanyComplianceFinding.STATUS_MISSING
        return _finding_status_to_plan_status(raw_status)

    subject_kind = process_type.subject_kind
    if subject_kind == ProcessType.SUBJECT_CLIENT_COMPANY:
        bindings = ProcessBinding.objects.filter(
            process_type=process_type,
            client_company=company,
            is_active=True,
        )
    elif subject_kind == ProcessType.SUBJECT_EMPLOYEE:
        bindings = ProcessBinding.objects.filter(
            process_type=process_type,
            employee__client_company=company,
            is_active=True,
        )
    elif subject_kind == ProcessType.SUBJECT_EQUIPMENT:
        bindings = ProcessBinding.objects.filter(
            process_type=process_type,
            equipment_item__client_company=company,
            is_active=True,
        )
    else:
        bindings = ProcessBinding.objects.none()

    if not bindings.exists():
        return STATUS_MISSING

    today = timezone.localdate()
    worst = STATUS_OK

    for binding in bindings.prefetch_related("runs"):
        completed = (
            ProcessRun.objects.filter(
                process_binding=binding,
                status=ProcessRun.STATUS_COMPLETED,
                valid_until__isnull=False,
            )
            .order_by("-valid_until")
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
            worst = _escalate(worst, STATUS_MISSING)
            continue

        if completed is not None:
            days_left = (completed.valid_until - today).days
            if days_left < 0:
                worst = _escalate(worst, STATUS_OVERDUE)
            elif days_left <= DUE_SOON_DAYS:
                worst = _escalate(worst, STATUS_DUE_SOON)
        elif open_run is not None:
            if open_run.scheduled_for and open_run.scheduled_for < today:
                worst = _escalate(worst, STATUS_OVERDUE)
            elif open_run.scheduled_for:
                days_left = (open_run.scheduled_for - today).days
                if days_left <= DUE_SOON_DAYS:
                    worst = _escalate(worst, STATUS_DUE_SOON)

    return worst


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
        applicable = evaluate_applicability(pt, company)
        exclusion = exclusions.get(pt.id)
        excluded = exclusion is not None
        exclusion_reason = exclusion.reason if exclusion else ""

        if excluded:
            row_status = STATUS_EXCLUDED
        elif not applicable:
            row_status = STATUS_NOT_APPLICABLE
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
        })

    return rows
