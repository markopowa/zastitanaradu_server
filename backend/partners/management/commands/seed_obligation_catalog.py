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
    "PP_APARATI_HIDROSTATICKO": (CAT_SERVICE, [LEAD, OVERDUE]),
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
        "code": "PP_APARATI_HIDROSTATICKO",
        "name": "PP aparati — hidrostatičko ispitivanje",
        "subject_kind": ProcessType.SUBJECT_EQUIPMENT,
        "domain": ProcessType.DOMAIN_ZOP,
        "shape": ProcessType.SHAPE_PERIODIC,
        "proof_kind": ProcessType.PROOF_UPLOAD,
        "legal_basis": "Zakon o ZOP čl. 44; Pravilnik 52/2015",
        "default_period_months": 60,
        "period_rules": [],
        "reminder_offsets": [-14, 7, 15, 30],
        "applicability_rule": {"requires_installation": "FIRE_EXTINGUISHERS"},
        "company_document_kind": "",
        "include_in_medical_exam_record": False,
    },
    {
        "code": "PRVA_POMOC_OBUKA",
        "name": "Osposobljavanje za pružanje prve pomoći",
        "subject_kind": ProcessType.SUBJECT_EMPLOYEE,
        "domain": ProcessType.DOMAIN_BZNR,
        "shape": ProcessType.SHAPE_PERIODIC,
        "proof_kind": ProcessType.PROOF_UPLOAD,
        "legal_basis": "Pravilnik o načinu pružanja prve pomoći (Sl. glasnik RS 109/2016) čl. 13",
        "default_period_months": 60,
        "period_rules": [],
        "reminder_offsets": [-15, 7, 15, 30],
        "applicability_rule": {"always": True},
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
        "legal_basis": "Pravilnik o hidrantskoj mreži za gašenje požara (Sl. list SFRJ 30/91)",
        "default_period_months": 12,
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
        "legal_basis": "Zakon o zaštiti od požara, čl. 44",
        "default_period_months": 6,
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

        uput_header = (
            "Poslodavac: {{ client.name }}\n"
            "Matični broj iz jedinstvenog registra: {{ client.registration_number }}\n"
            "Adresa: {{ client.address }}\n"
            "Šifra delatnosti: {{ client.activity_code }}\n\n"
            "Datum: {{ scheduled_for }}\n"
            "Broj uputa: {{ instruction_number }}\n\n"
        )
        uput_identification = (
            "{{ employee.first_name }} {{ employee.father_name }} {{ employee.last_name }}, "
            "rođen(a) {{ date_of_birth }} u {{ employee.place_of_birth }}, "
            "JMBG {{ employee.national_id }}, po zanimanju {{ employee.occupation }}, "
            "koji(a) treba da radi na radnom mestu {{ employee.high_risk_position_name }}, "
            "radi ocene ispunjenosti posebnih zdravstvenih sposobnosti za obavljanje poslova "
            "na tom radnom mestu – koje je Aktom o proceni rizika {{ client.name }} "
            "({{ client.risk_assessment_act_name }}, {{ client.risk_assessment_act_date }}) "
            "utvrđeno kao radno mesto sa povećanim rizikom.\n\n"
        )
        uput_footer_fields = (
            "• Kratak opis poslova na radnom mestu: "
            "_______________________________________________\n\n"
            "• Procenjeni rizici na radnom mestu i u radnoj okolini – utvrđeni Aktom o "
            "proceni rizika (opasnosti i štetnosti sa izmerenim vrednostima): "
            "_______________________________________________\n\n"
            "• Posebni zdravstveni uslovi utvrđeni Aktom o proceni rizika – koje "
            "zaposleni(a) mora ispunjavati: "
            "_______________________________________________\n\n"
            "                                                        Poslodavac\n"
            "                                                        (M.P.)\n"
            "                                                        {{ client.name }}\n"
        )

        prethodni_uput_body = (
            "UPUT ZA PRETHODNI LEKARSKI PREGLED ZAPOSLENOG(E)\n\n"
            + uput_header
            + "Upućuje se na PRETHODNI pregled "
            + uput_identification
            + uput_footer_fields
        )
        periodicni_uput_body = (
            "UPUT ZA PERIODIČNI LEKARSKI PREGLED ZAPOSLENOG\n\n"
            + uput_header
            + "Upućuje se na PERIODIČNI/KONTROLNI pregled "
            + uput_identification
            + "Pri prethodnom/periodičnom pregledu obavljenom "
            "{{ last_exam_date }} u zdravstvenoj ustanovi "
            "_______________________________ - službi medicine rada, "
            "utvrđeno je: "
            "_______________________________________________\n\n"
            + uput_footer_fields
        )

        prethodni_uput_template, prethodni_uput_created = (
            DocumentTemplate.objects.get_or_create(
                name="Uput za prethodni lekarski pregled",
                defaults={
                    "context_type": DocumentTemplate.CONTEXT_EMPLOYEE,
                    "description": "Uput za prethodni lekarski pregled — Obrazac 1",
                    "template_body": prethodni_uput_body,
                    "generation_config": {"mode": "TEMPLATE_BODY"},
                },
            )
        )

        periodicni_uput_template, periodicni_uput_created = (
            DocumentTemplate.objects.get_or_create(
                name="Uput za lekarski pregled",
                defaults={
                    "context_type": DocumentTemplate.CONTEXT_EMPLOYEE,
                    "description": "Uput za periodični lekarski pregled — Obrazac 2",
                    "template_body": periodicni_uput_body,
                    "generation_config": {"mode": "TEMPLATE_BODY"},
                },
            )
        )

        uput_templates_synced = 0
        if (
            not prethodni_uput_created
            and not prethodni_uput_template.template_file
            and prethodni_uput_template.template_body != prethodni_uput_body
        ):
            prethodni_uput_template.template_body = prethodni_uput_body
            prethodni_uput_template.save(update_fields=["template_body"])
            uput_templates_synced += 1
        if (
            not periodicni_uput_created
            and not periodicni_uput_template.template_file
            and periodicni_uput_template.template_body != periodicni_uput_body
        ):
            periodicni_uput_template.template_body = periodicni_uput_body
            periodicni_uput_template.save(update_fields=["template_body"])
            uput_templates_synced += 1

        uput_email_subject = "Uput za lekarski pregled — {{ employee.first_name }} {{ employee.last_name }}"
        uput_email_body = (
            "Poštovani,\n\n"
            "U prilogu se nalazi uput za lekarski pregled za zaposlenog "
            "{{ employee.first_name }} {{ employee.last_name }} ({{ process_type_name }}), "
            "zakazan za {{ scheduled_for }}.\n\n"
            "S poštovanjem"
        )

        uput_document_templates = {
            "PRETHODNI_LEKARSKI": prethodni_uput_template,
            "LEKARSKI_PREGLED": periodicni_uput_template,
        }

        uput_pt_created = 0
        for medical_code, document_template in uput_document_templates.items():
            try:
                medical_pt = ProcessType.objects.get(code=medical_code)
            except ProcessType.DoesNotExist:
                continue
            process_template, was_created = ProcessTemplate.objects.get_or_create(
                process_type=medical_pt,
                trigger=ProcessTemplate.TRIGGER_ON_SCHEDULED,
                generate_document=True,
                defaults={
                    "document_template": document_template,
                    "send_email": True,
                    "attach_generated_document": True,
                    "email_to_kind": ProcessTemplate.EMAIL_TO_CLIENT_MAIN,
                    "email_subject_template": uput_email_subject,
                    "email_body_template": uput_email_body,
                },
            )
            if was_created:
                uput_pt_created += 1
            elif process_template.document_template_id != document_template.id:
                process_template.document_template = document_template
                process_template.save(update_fields=["document_template"])

        reminder_templates_created = 0
        for code, (category, triggers) in OBLIGATION_TEMPLATE_PLAN.items():
            try:
                process_type = ProcessType.objects.get(code=code)
            except ProcessType.DoesNotExist:
                continue
            reminder_templates_created += ensure_obligation_templates(
                process_type, category, triggers
            )

        try:
            prethodni = ProcessType.objects.get(code="PRETHODNI_LEKARSKI")
            periodicni = ProcessType.objects.get(code="LEKARSKI_PREGLED")
            ProcessTemplate.objects.filter(
                process_type=prethodni,
                trigger=ProcessTemplate.TRIGGER_ON_COMPLETED,
            ).update(followup_process_type=periodicni)
        except ProcessType.DoesNotExist:
            pass

        self.stdout.write(
            self.style.SUCCESS(
                f"Obligation catalog: {created} created, {skipped} existing left untouched. "
                f"Uput DocumentTemplate(s): {int(prethodni_uput_created) + int(periodicni_uput_created)} created, "
                f"{uput_templates_synced} synced. "
                f"{uput_pt_created} uput ProcessTemplate(s) created. "
                f"{reminder_templates_created} reminder template(s) created.",
            ),
        )
