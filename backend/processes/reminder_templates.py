from .models import ProcessTemplate

LEAD = ProcessTemplate.TRIGGER_ON_LEAD
SCHEDULED = ProcessTemplate.TRIGGER_ON_SCHEDULED
COMPLETED = ProcessTemplate.TRIGGER_ON_COMPLETED
OVERDUE = ProcessTemplate.TRIGGER_ON_OVERDUE

CAT_SERVICE = "service"
CAT_TRAINING = "training"
CAT_MEDICAL = "medical"


def _content(category: str, trigger: str, name: str):
    quoted = "„" + name + "”"
    to = (
        ProcessTemplate.EMAIL_TO_MAK
        if trigger == OVERDUE
        else ProcessTemplate.EMAIL_TO_CLIENT_AND_MAK
    )

    if category == CAT_SERVICE:
        if trigger == LEAD:
            return (
                "Podsetnik: " + name + " ističe uskoro",
                "Poštovani,\n\nRok za " + quoted + " ističe {{ scheduled_for }}. "
                "Potrebno je naručiti novi pregled kod ovlašćene organizacije i "
                "otpremiti nalaz u aplikaciju.\n\nS poštovanjem",
                to,
            )
        if trigger == COMPLETED:
            return (
                "Evidentirano: " + name,
                "Poštovani,\n\n" + name + " je evidentiran u aplikaciji. "
                "Važi do {{ valid_until }}.\n\nS poštovanjem",
                to,
            )
        if trigger == OVERDUE:
            return (
                "Prekoračen rok: " + name,
                "Rok za " + quoted + " je istekao ({{ scheduled_for }}) i još nije "
                "obnovljen. Potrebno je hitno naručiti pregled i otpremiti nalaz.",
                to,
            )

    if category == CAT_TRAINING:
        if trigger == LEAD:
            return (
                "Podsetnik: " + name,
                "Poštovani,\n\nBliži se rok za " + quoted + " ({{ scheduled_for }}). "
                "Potrebno je organizovati i evidentirati u aplikaciji.\n\nS poštovanjem",
                to,
            )
        if trigger == OVERDUE:
            return (
                "Prekoračen rok: " + name,
                "Rok za " + quoted + " je prošao ({{ scheduled_for }}) i nije "
                "evidentirano. Potrebno je hitno organizovati.",
                to,
            )

    if category == CAT_MEDICAL:
        if trigger == LEAD:
            return (
                "Podsetnik: " + name,
                "Poštovani,\n\nBliži se rok za " + quoted + " zaposlenog "
                "({{ scheduled_for }}). Potrebno je pripremiti uput.\n\nS poštovanjem",
                to,
            )
        if trigger == COMPLETED:
            return (
                "Evidentiran: " + name,
                "Poštovani,\n\n" + name + " je evidentiran u aplikaciji. "
                "Važi do {{ valid_until }}.\n\nS poštovanjem",
                to,
            )
        if trigger == OVERDUE:
            return (
                "Prekoračen rok: " + name,
                quoted + " — rok je prošao ({{ scheduled_for }}) i nalaz nije "
                "unet u aplikaciju.",
                to,
            )

    return None


def ensure_obligation_templates(process_type, category: str, triggers) -> int:
    created = 0
    for trigger in triggers:
        content = _content(category, trigger, process_type.name)
        if content is None:
            continue
        subject, body, to = content
        _, was_created = ProcessTemplate.objects.get_or_create(
            process_type=process_type,
            trigger=trigger,
            defaults={
                "send_email": True,
                "email_to_kind": to,
                "email_subject_template": subject,
                "email_body_template": body,
            },
        )
        if was_created:
            created += 1
    return created
