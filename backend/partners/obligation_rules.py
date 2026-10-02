from processes.models import ProcessType

ALL_EMPLOYEES_CODES = ("OSPOSOBLJAVANJE_BZR", "ZOP_OBUKA")
LZO_CODE = "LZO_ZADUZENJE"
PRELIMINARY_EXAM_CODE = "PRETHODNI_LEKARSKI"
PERIODIC_EXAM_CODE = "LEKARSKI_PREGLED"
AUTO_EMPLOYEE_CODES = ALL_EMPLOYEES_CODES + (LZO_CODE, PRELIMINARY_EXAM_CODE)
MEDICAL_CODES = (PRELIMINARY_EXAM_CODE, PERIODIC_EXAM_CODE)

INSTALLATION_CODES = (
    "HYDRANT_NETWORK",
    "FIRE_ALARM_SYSTEM",
    "LIGHTNING_PROTECTION",
    "STABLE_EXTINGUISHING_SYSTEM",
    "FIRE_EXTINGUISHERS",
)

APPLICABLE = "APPLICABLE"
NOT_APPLICABLE = "NOT_APPLICABLE"
UNKNOWN = "UNKNOWN"


def applicability(process_type: ProcessType, company) -> str:
    rule = process_type.applicability_rule or {}

    if rule.get("always"):
        return APPLICABLE

    zop_in = rule.get("zop_category_in")
    if zop_in is not None:
        if not company.zop_category:
            return UNKNOWN
        return APPLICABLE if company.zop_category in zop_in else NOT_APPLICABLE

    required_installation = rule.get("requires_installation")
    if required_installation is not None:
        if company.installations is None:
            return UNKNOWN
        if required_installation in company.installations:
            return APPLICABLE
        return NOT_APPLICABLE

    if rule.get("high_risk_only"):
        return APPLICABLE if company.has_high_risk_roles else NOT_APPLICABLE

    return APPLICABLE


def is_excluded(process_type: ProcessType, company) -> bool:
    from .models import CompanyObligationExclusion

    return CompanyObligationExclusion.objects.filter(
        client_company=company,
        process_type=process_type,
    ).exists()


def is_required(process_type: ProcessType, company) -> bool:
    if company is None:
        return True
    if not process_type.is_active:
        return False
    if is_excluded(process_type, company):
        return False
    return applicability(process_type, company) == APPLICABLE


def employee_needs(code: str, employee) -> bool | None:
    if not employee.is_employed:
        return False
    if code in ALL_EMPLOYEES_CODES:
        return True
    if code == LZO_CODE:
        return bool(
            employee.job_role_id and employee.job_role.lzo_items.exists())
    if code == PRELIMINARY_EXAM_CODE:
        return employee.is_high_risk
    return None


def is_coverage_any(process_type: ProcessType) -> bool:
    rule = process_type.applicability_rule or {}
    return rule.get("coverage") == "any"
