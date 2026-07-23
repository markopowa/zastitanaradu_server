from datetime import date

from django.db.models import Q

from processes.dates import add_months
from processes.models import ProcessBinding, ProcessType
from processes.period_resolution import resolve_period_months
from processes.process_run_completion import apply_process_run_completion
from processes.tasks import get_open_run_for_binding

from .models import TestAttempt, TestQuestion

PASS_THRESHOLD_PCT = 75.0
OSPOSOBLJAVANJE_BZR_CODE = "OSPOSOBLJAVANJE_BZR"


def questions_for_employee(employee):
    qs = TestQuestion.objects.filter(is_active=True)
    if employee.client_company_id:
        qs = qs.filter(
            Q(client_company_id=employee.client_company_id)
            | Q(client_company__isnull=True)
        )
    else:
        qs = qs.filter(client_company__isnull=True)
    return qs.order_by("order", "id")


def grade_answers(employee, answers):
    questions = list(questions_for_employee(employee))
    total = len(questions)
    if total == 0:
        return 0.0, False
    correct = 0
    for question in questions:
        given = answers.get(str(question.id))
        if given is not None and given == question.correct_key:
            correct += 1
    score_pct = round((correct / total) * 100, 2)
    return score_pct, score_pct >= PASS_THRESHOLD_PCT


def complete_osposobljavanje_run(employee):
    process_type = ProcessType.objects.filter(
        code=OSPOSOBLJAVANJE_BZR_CODE).first()
    if process_type is None:
        return None

    binding = (
        ProcessBinding.objects.filter(
            employee=employee,
            process_type=process_type,
            is_active=True,
        )
        .order_by("-id")
        .first()
    )
    if binding is None:
        return None

    run = get_open_run_for_binding(binding)
    if run is None:
        return None

    performed_at = date.today()
    period_months = binding.custom_period_months or resolve_period_months(
        process_type, employee
    )
    valid_until = (
        add_months(performed_at, period_months)
        if period_months
        else performed_at
    )
    apply_process_run_completion(
        run,
        {"performed_at": performed_at, "valid_until": valid_until},
    )
    return run


def create_attempt(employee, answers) -> TestAttempt:
    score_pct, passed = grade_answers(employee, answers)
    run = complete_osposobljavanje_run(employee) if passed else None
    return TestAttempt.objects.create(
        employee=employee,
        score_pct=score_pct,
        passed=passed,
        answers=answers,
        run=run,
    )
