from processes.models import ProcessType


def resolve_period_months(process_type: ProcessType, subject) -> int | None:
    rules = process_type.period_rules or []
    for rule in rules:
        condition = rule.get("when", {})
        months = rule.get("months")
        if months is None:
            continue
        if _matches_condition(condition, subject):
            return int(months)
    return process_type.default_period_months


def _matches_condition(condition: dict, subject) -> bool:
    if not condition:
        return False
    risk = condition.get("risk")
    if risk == "high":
        return _subject_is_high_risk(subject)
    return False


def _subject_is_high_risk(subject) -> bool:
    from partners.models import Employee

    if not isinstance(subject, Employee):
        return False
    rl = subject.effective_risk_level
    if rl is None:
        return False
    return bool(rl.is_high_risk)
