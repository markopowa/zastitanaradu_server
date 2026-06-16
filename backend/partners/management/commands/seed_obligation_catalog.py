from django.core.management.base import BaseCommand
from django.db import transaction

from documents.models import DocumentTemplate
from processes.models import ProcessTemplate, ProcessType
from processes.reminder_templates import (
    CAT_MEDICAL,
    CAT_SERVICE,
    CAT_TRAINING,
    COMPLETED,
    LEAD,
    OVERDUE,
    ensure_obligation_templates,
)

OBLIGATION_TEMPLATE_PLAN = {
    "LEKARSKI_PREGLED": (CAT_MEDICAL, [LEAD, COMPLETED, OVERDUE]),
    "PRETHODNI_LEKARSKI": (CAT_MEDICAL, [COMPLETED, OVERDUE]),
    "OSPOSOBLJAVANJE_BZR": (CAT_TRAINING, [LEAD, OVERDUE]),
    "ZOP_OBUKA": (CAT_TRAINING, [LEAD, OVERDUE]),
    "LZO_ZADUZENJE": (CAT_TRAINING, [LEAD]),
    "PP_APARATI_SERVIS": (CAT_SERVICE, [LEAD, OVERDUE]),
    "HIDRANTI_ISPITIVANJE": (CAT_SERVICE, [LEAD, OVERDUE]),
    "HIDRANTSKA_CREVA": (CAT_SERVICE, [LEAD, OVERDUE]),
    "SDP_PREGLED": (CAT_SERVICE, [LEAD, OVERDUE]),
}

CATALOG = [
    {
        "code": "OSPOSOBLJAVANJE_BZR",
        "name": "Osposobljavanje zaposlenih za bezbedan rad",
        "subject_kind": ProcessType.SUBJECT_EMPLOYEE,
        "domain": ProcessType.DOMAIN_BZNR,
        "shape": ProcessType.SHAPE_PERIODIC,
        "proof_kind": ProcessType.PROOF_UPLOAD,
        "legal_basis": "Zakon o BZR 35/2023, čl. 33-34",
        "default_period_months": 36,
        "period_rules": [{"when": {"risk": "high"}, "months": 12}],
        "reminder_offsets": [-15, 7, 15, 30],
        "applicability_rule": {"always": True},
        "company_document_kind": "",
        "include_in_medical_exam_record": False,
    },
    {
        "code": "LEKARSKI_PREGLED",
        "name": "Periodični lekarski pregled",
        "subject_kind": ProcessType.SUBJECT_EMPLOYEE,
        "domain": ProcessType.DOMAIN_BZNR,
        "shape": ProcessType.SHAPE_PERIODIC,
        "proof_kind": ProcessType.PROOF_UPLOAD,
        "legal_basis": "Zakon o BZR 35/2023, čl. 56",
        "default_period_months": None,
        "period_rules": [{"when": {"risk": "high"}, "months": 12}],
        "reminder_offsets": [-30, 0, 7, 15, 30],
        "applicability_rule": {"high_risk_only": True},
        "company_document_kind": "",
        "include_in_medical_exam_record": True,
    },
    {
        "code": "PRETHODNI_LEKARSKI",
        "name": "Prethodni lekarski pregled",
        "subject_kind": ProcessType.SUBJECT_EMPLOYEE,
        "domain": ProcessType.DOMAIN_BZNR,
        "shape": ProcessType.SHAPE_PERIODIC,
        "proof_kind": ProcessType.PROOF_UPLOAD,
        "legal_basis": "Zakon o BZR 35/2023, čl. 56",
        "default_period_months": None,
        "period_rules": [],
        "reminder_offsets": [0, 7, 15, 30],
        "applicability_rule": {"high_risk_only": True},
        "company_document_kind": "",
        "include_in_medical_exam_record": True,
    },
    {
        "code": "ZOP_OBUKA",
        "name": "Osnovna obuka i provera znanja iz ZOP",
        "subject_kind": ProcessType.SUBJECT_EMPLOYEE,
        "domain": ProcessType.DOMAIN_ZOP,
        "shape": ProcessType.SHAPE_PERIODIC,
        "proof_kind": ProcessType.PROOF_UPLOAD,
        "legal_basis": "Zakon o ZOP, čl. 53",
        "default_period_months": 36,
        "period_rules": [],
        "reminder_offsets": [-15, 7, 15, 30],
        "applicability_rule": {"always": True},
        "company_document_kind": "",
        "include_in_medical_exam_record": False,
    },
    {
        "code": "LZO_ZADUZENJE",
        "name": "Zaduženje lične zaštitne opreme",
        "subject_kind": ProcessType.SUBJECT_EMPLOYEE,
        "domain": ProcessType.DOMAIN_BZNR,
        "shape": ProcessType.SHAPE_PERIODIC,
        "proof_kind": ProcessType.PROOF_UPLOAD,
        "legal_basis": "Zakon o BZR 35/2023, čl. 15",
        "default_period_months": 12,
        "period_rules": [],
        "reminder_offsets": [-15],
        "applicability_rule": {"always": True},
        "company_document_kind": "",
        "include_in_medical_exam_record": False,
    },
    {
        "code": "PP_APARATI_SERVIS",
        "name": "Servis PP aparata",
        "subject_kind": ProcessType.SUBJECT_EQUIPMENT,
        "domain": ProcessType.DOMAIN_ZOP,
        "shape": ProcessType.SHAPE_PERIODIC,
        "proof_kind": ProcessType.PROOF_UPLOAD,
        "legal_basis": "Zakon o ZOP, čl. 43-44",
        "default_period_months": 6,
        "period_rules": [],
        "reminder_offsets": [-14, 7, 15, 30],
        "applicability_rule": {"requires_installation": "FIRE_EXTINGUISHERS"},
        "company_document_kind": "",
        "include_in_medical_exam_record": False,
    },
    {
        "code": "HIDRANTI_ISPITIVANJE",
        "name": "Ispitivanje hidrantske mreže",
        "subject_kind": ProcessType.SUBJECT_CLIENT_COMPANY,
        "domain": ProcessType.DOMAIN_ZOP,
        "shape": ProcessType.SHAPE_PERIODIC,
        "proof_kind": ProcessType.PROOF_UPLOAD,
        "legal_basis": "",
        "default_period_months": 6,
        "period_rules": [],
        "reminder_offsets": [-14, 7, 15, 30],
        "applicability_rule": {"requires_installation": "HYDRANT_NETWORK"},
        "company_document_kind": "",
        "include_in_medical_exam_record": False,
    },
    {
        "code": "HIDRANTSKA_CREVA",
        "name": "Ispitivanje creva hidrantske mreže",
        "subject_kind": ProcessType.SUBJECT_CLIENT_COMPANY,
        "domain": ProcessType.DOMAIN_ZOP,
        "shape": ProcessType.SHAPE_PERIODIC,
        "proof_kind": ProcessType.PROOF_UPLOAD,
        "legal_basis": "",
        "default_period_months": 12,
        "period_rules": [],
        "reminder_offsets": [-14, 7, 15, 30],
        "applicability_rule": {"requires_installation": "HYDRANT_NETWORK"},
        "company_document_kind": "",
        "include_in_medical_exam_record": False,
    },
    {
        "code": "SDP_PREGLED",
        "name": "Stručni pregled stabilne instalacije za dojavu požara",
        "subject_kind": ProcessType.SUBJECT_CLIENT_COMPANY,
        "domain": ProcessType.DOMAIN_ZOP,
        "shape": ProcessType.SHAPE_PERIODIC,
        "proof_kind": ProcessType.PROOF_UPLOAD,
        "legal_basis": "",
        "default_period_months": 12,
        "period_rules": [],
        "reminder_offsets": [-14, 7, 15, 30],
        "applicability_rule": {"requires_installation": "FIRE_ALARM_SYSTEM"},
        "company_document_kind": "",
        "include_in_medical_exam_record": False,
    },
]


class Command(BaseCommand):
    help = "Seed the obligation catalog (periodic obligations only)."

    @transaction.atomic
    def handle(self, *args, **options):
        created = 0
        skipped = 0
        for entry in CATALOG:
            code = entry["code"]
            defaults = {k: v for k, v in entry.items() if k != "code"}
            defaults["is_active"] = True
            _, was_created = ProcessType.objects.get_or_create(
                code=code,
                defaults=defaults,
            )
            if was_created:
                created += 1
            else:
                skipped += 1

        uput_template, uput_tpl_created = DocumentTemplate.objects.get_or_create(
            name="Uput za lekarski pregled",
            defaults={
                "context_type": DocumentTemplate.CONTEXT_EMPLOYEE,
                "description": "Uput za lekarski pregled — generisani poziv",
                "template_body": (
                    "UPUT ZA LEKARSKI PREGLED\n\n"
                    "Firma: {{ client.name }}\n"
                    "PIB: {{ client.tax_id }}\n"
                    "Adresa: {{ client.address }}\n\n"
                    "Zaposleni: {{ employee.first_name }} {{ employee.last_name }}\n"
                    "JMBG: {{ employee.national_id }}\n"
                    "Datum rođenja: {{ date_of_birth }}\n"
                    "Zanimanje: {{ employee.occupation }}\n"
                    "Radno mesto: {{ employee.high_risk_position_name }}\n\n"
                    "Vrsta pregleda: {{ process_type_name }}\n"
                    "Datum uputa: {{ scheduled_for }}\n"
                    "Broj uputa: {{ instruction_number }}\n"
                ),
                "generation_config": {"mode": "TEMPLATE_BODY"},
            },
        )

        uput_email_subject = "Uput za lekarski pregled — {{ employee.first_name }} {{ employee.last_name }}"
        uput_email_body = (
            "Poštovani,\n\n"
            "U prilogu se nalazi uput za lekarski pregled za zaposlenog "
            "{{ employee.first_name }} {{ employee.last_name }} ({{ process_type_name }}), "
            "zakazan za {{ scheduled_for }}.\n\n"
            "S poštovanjem"
        )

        uput_pt_created = 0
        for medical_code in ("PRETHODNI_LEKARSKI", "LEKARSKI_PREGLED"):
            try:
                medical_pt = ProcessType.objects.get(code=medical_code)
            except ProcessType.DoesNotExist:
                continue
            _, was_created = ProcessTemplate.objects.get_or_create(
                process_type=medical_pt,
                trigger=ProcessTemplate.TRIGGER_ON_SCHEDULED,
                generate_document=True,
                defaults={
                    "document_template": uput_template,
                    "send_email": True,
                    "attach_generated_document": True,
                    "email_to_kind": ProcessTemplate.EMAIL_TO_CLIENT_MAIN,
                    "email_subject_template": uput_email_subject,
                    "email_body_template": uput_email_body,
                },
            )
            if was_created:
                uput_pt_created += 1

        reminder_templates_created = 0
        for code, (category, triggers) in OBLIGATION_TEMPLATE_PLAN.items():
            try:
                process_type = ProcessType.objects.get(code=code)
            except ProcessType.DoesNotExist:
                continue
            reminder_templates_created += ensure_obligation_templates(
                process_type, category, triggers
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Obligation catalog: {created} created, {skipped} existing left untouched. "
                f"Uput DocumentTemplate {'created' if uput_tpl_created else 'existing'}. "
                f"{uput_pt_created} uput ProcessTemplate(s) created. "
                f"{reminder_templates_created} reminder template(s) created.",
            ),
        )
