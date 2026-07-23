from django.core.management.base import BaseCommand
from django.db import transaction

from documents.models import TemplateFieldDefinition
from partners.models import RiskLevel

RISK_LEVELS = [
    {"code": "NIZAK", "label": "Nizak", "score": 2,
     "is_acceptable": True, "is_high_risk": False, "order": 1},
    {"code": "UMEREN", "label": "Umeren", "score": 3,
     "is_acceptable": True, "is_high_risk": False, "order": 2},
    {"code": "DOPUSTIV", "label": "Dopustiv", "score": 4,
     "is_acceptable": True, "is_high_risk": False, "order": 3},
    {"code": "POVECAN", "label": "Povećan", "score": 6,
     "is_acceptable": False, "is_high_risk": True, "order": 4},
]

TEMPLATE_FIELDS = [
    ("employee.full_name", "Ime i prezime",
     TemplateFieldDefinition.CATEGORY_EMPLOYEE),
    ("employee.first_name", "Ime zaposlenog",
     TemplateFieldDefinition.CATEGORY_EMPLOYEE),
    ("employee.last_name", "Prezime zaposlenog",
     TemplateFieldDefinition.CATEGORY_EMPLOYEE),
    ("employee.org_unit", "Organizaciona jedinica",
     TemplateFieldDefinition.CATEGORY_EMPLOYEE),
    ("employee.position", "Pozicija", TemplateFieldDefinition.CATEGORY_EMPLOYEE),
    ("employee.email", "Email zaposlenog",
     TemplateFieldDefinition.CATEGORY_EMPLOYEE),
    ("employee.father_name", "Ime oca", TemplateFieldDefinition.CATEGORY_EMPLOYEE),
    ("employee.national_id", "JMBG", TemplateFieldDefinition.CATEGORY_EMPLOYEE),
    ("employee.date_of_birth", "Datum rođenja",
     TemplateFieldDefinition.CATEGORY_EMPLOYEE),
    ("employee.place_of_birth", "Mesto rođenja",
     TemplateFieldDefinition.CATEGORY_EMPLOYEE),
    ("employee.occupation", "Zanimanje", TemplateFieldDefinition.CATEGORY_EMPLOYEE),
    ("employee.high_risk_position_name", "Radno mesto sa povećanim rizikom",
     TemplateFieldDefinition.CATEGORY_EMPLOYEE),
    ("equipment.name", "Naziv opreme/mašine",
     TemplateFieldDefinition.CATEGORY_EQUIPMENT),
    ("equipment.category", "Kategorija opreme",
     TemplateFieldDefinition.CATEGORY_EQUIPMENT),
    ("equipment.inventory_number", "Inventarski broj",
     TemplateFieldDefinition.CATEGORY_EQUIPMENT),
    ("equipment.location", "Lokacija opreme",
     TemplateFieldDefinition.CATEGORY_EQUIPMENT),
    ("client.name", "Naziv firme", TemplateFieldDefinition.CATEGORY_CLIENT_COMPANY),
    ("client.tax_id", "PIB", TemplateFieldDefinition.CATEGORY_CLIENT_COMPANY),
    ("client.address", "Adresa firme",
     TemplateFieldDefinition.CATEGORY_CLIENT_COMPANY),
    ("client.phone", "Telefon firme", TemplateFieldDefinition.CATEGORY_CLIENT_COMPANY),
    ("client.email", "Email firme", TemplateFieldDefinition.CATEGORY_CLIENT_COMPANY),
    ("client.website", "Web sajt firme",
     TemplateFieldDefinition.CATEGORY_CLIENT_COMPANY),
    ("client.registration_number", "Matični broj",
     TemplateFieldDefinition.CATEGORY_CLIENT_COMPANY),
    ("client.activity_code", "Šifra delatnosti",
     TemplateFieldDefinition.CATEGORY_CLIENT_COMPANY),
    ("client.risk_assessment_act_name", "Naziv Akta o proceni rizika",
     TemplateFieldDefinition.CATEGORY_CLIENT_COMPANY),
    ("client.risk_assessment_act_date", "Datum donošenja Akta o proceni rizika",
     TemplateFieldDefinition.CATEGORY_CLIENT_COMPANY),
    ("scheduled_for", "Datum zakazivanja",
     TemplateFieldDefinition.CATEGORY_PROCESS),
    ("performed_at", "Datum izvođenja", TemplateFieldDefinition.CATEGORY_PROCESS),
    ("valid_until", "Važi do", TemplateFieldDefinition.CATEGORY_PROCESS),
    ("process_type_name", "Vrsta obaveze",
     TemplateFieldDefinition.CATEGORY_PROCESS),
    ("instruction_number", "Broj uputa", TemplateFieldDefinition.CATEGORY_PROCESS),
    ("last_exam_date", "Datum prethodnog pregleda",
     TemplateFieldDefinition.CATEGORY_PROCESS),
    ("year_of_birth", "Godina rođenja", TemplateFieldDefinition.CATEGORY_PROCESS),
    ("date_of_birth", "Datum rođenja", TemplateFieldDefinition.CATEGORY_PROCESS),
    ("training.name", "Naziv obuke", TemplateFieldDefinition.CATEGORY_PROCESS),
    ("client.director_name", "Direktor — ime i prezime",
     TemplateFieldDefinition.CATEGORY_CLIENT_COMPANY),
    ("client.director_phone", "Telefon direktora",
     TemplateFieldDefinition.CATEGORY_CLIENT_COMPANY),
    ("client.director_email", "Email direktora",
     TemplateFieldDefinition.CATEGORY_CLIENT_COMPANY),
    ("client.contact_name", "Lice za kontakt",
     TemplateFieldDefinition.CATEGORY_CLIENT_COMPANY),
    ("client.contact_phone", "Telefon kontakt osobe",
     TemplateFieldDefinition.CATEGORY_CLIENT_COMPANY),
    ("client.contact_email", "Email kontakt osobe",
     TemplateFieldDefinition.CATEGORY_CLIENT_COMPANY),
]


class Command(BaseCommand):
    help = "Seed initial risk levels and template field definitions."

    @transaction.atomic
    def handle(self, *args, **options):
        risk_created = 0
        for data in RISK_LEVELS:
            _, created = RiskLevel.objects.update_or_create(
                code=data["code"],
                defaults={
                    "label": data["label"],
                    "score": data["score"],
                    "is_acceptable": data["is_acceptable"],
                    "is_high_risk": data["is_high_risk"],
                    "order": data["order"],
                },
            )
            risk_created += int(created)

        field_created = 0
        for order, (key, label, category) in enumerate(TEMPLATE_FIELDS, start=1):
            _, created = TemplateFieldDefinition.objects.update_or_create(
                key=key,
                defaults={
                    "label": label,
                    "category": category,
                    "order": order,
                    "is_active": True,
                },
            )
            field_created += int(created)

        self.stdout.write(self.style.SUCCESS(
            f"Risk levels: {risk_created} created, "
            f"{len(RISK_LEVELS) - risk_created} updated. "
            f"Template fields: {field_created} created, "
            f"{len(TEMPLATE_FIELDS) - field_created} updated."
        ))
