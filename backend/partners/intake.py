from datetime import datetime

from django.utils import timezone

from .models import ClientIntakeLink, ClientIntakeSubmission, Employee, EquipmentItem, JobRole


def build_intake_public_url(link: ClientIntakeLink, request) -> str:
    path = f"/intake/{link.token}/"
    if request is not None:
        return request.build_absolute_uri(path)
    return path


def send_intake_link_email(link: ClientIntakeLink, to_email: str, request=None) -> bool:
    from core.email_sender import get_email_sender

    url = build_intake_public_url(link, request)
    company_name = link.client_company.name
    subject = f"Upitnik za {company_name}"
    body = (
        f"Poštovani,\n\n"
        f"Molimo Vas da popunite upitnik za novog zaposlenog ili opremu putem sledećeg linka:\n"
        f"{url}\n\n"
        f"Hvala."
    )
    return get_email_sender().send(
        recipients=[to_email],
        subject=subject,
        body=body,
    )


def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def approve_employee_submission(submission: ClientIntakeSubmission, user) -> Employee:
    from .employee_bindings import ensure_default_bindings_for_employee

    data = submission.data
    company = submission.link.client_company
    position = (data.get("position") or "").strip()
    job_role = None
    if position:
        job_role = JobRole.objects.filter(
            client_company=company, name=position).first()

    employee = Employee.objects.create(
        client_company=company,
        first_name=(data.get("first_name") or "").strip(),
        last_name=(data.get("last_name") or "").strip(),
        email=(data.get("email") or "").strip(),
        position=position,
        national_id=(data.get("national_id") or "").strip(),
        date_of_birth=_parse_date(data.get("date_of_birth")),
        job_role=job_role,
    )
    ensure_default_bindings_for_employee(employee)

    submission.status = ClientIntakeSubmission.STATUS_APPROVED
    submission.reviewed_by = user
    submission.reviewed_at = timezone.now()
    submission.save(update_fields=["status", "reviewed_by", "reviewed_at"])
    return employee


def approve_equipment_submission(submission: ClientIntakeSubmission, user) -> EquipmentItem:
    from .equipment_bindings import ensure_default_bindings_for_equipment

    data = submission.data
    company = submission.link.client_company

    equipment = EquipmentItem.objects.create(
        client_company=company,
        name=(data.get("name") or "").strip(),
        category=(data.get("category") or "").strip(),
        inventory_number=(data.get("inventory_number") or "").strip(),
        location=(data.get("location") or "").strip(),
    )
    ensure_default_bindings_for_equipment(equipment)

    submission.status = ClientIntakeSubmission.STATUS_APPROVED
    submission.reviewed_by = user
    submission.reviewed_at = timezone.now()
    submission.save(update_fields=["status", "reviewed_by", "reviewed_at"])
    return equipment


def reject_submission(submission: ClientIntakeSubmission, user) -> None:
    submission.status = ClientIntakeSubmission.STATUS_REJECTED
    submission.reviewed_by = user
    submission.reviewed_at = timezone.now()
    submission.save(update_fields=["status", "reviewed_by", "reviewed_at"])
