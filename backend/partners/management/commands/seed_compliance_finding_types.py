from django.core.management.base import BaseCommand
from django.db import transaction

from partners.models import ComplianceFindingType
from processes.models import ProcessType
from processes.reminder_templates import (
    CAT_SERVICE,
    COMPLETED,
    LEAD,
    OVERDUE,
    ensure_obligation_templates,
)

FINDING_TYPE_PROCESS_TYPES = [
    {
        "code": "WORK_EQUIPMENT",
        "name": "Stručni nalaz o pregledu i proveri opreme za rad",
        "order": 1,
        "process_type": {
            "code": "STRUCNI_NALAZ_OPREMA",
            "name": "Stručni nalaz — oprema za rad",
            "subject_kind": ProcessType.SUBJECT_CLIENT_COMPANY,
            "domain": ProcessType.DOMAIN_BZNR,
            "shape": ProcessType.SHAPE_PERIODIC,
            "proof_kind": ProcessType.PROOF_UPLOAD,
            "default_period_months": 36,
            "reminder_offsets": [-30, 7, 15, 30],
            "applicability_rule": {"always": True},
            "include_in_medical_exam_record": False,
        },
    },
    {
        "code": "ELECTRICAL_INSTALLATIONS",
        "name": "Stručni nalaz o pregledu i proveri električnih instalacija",
        "order": 2,
        "process_type": {
            "code": "STRUCNI_NALAZ_ELEKTRO",
            "name": "Stručni nalaz — električne instalacije",
            "subject_kind": ProcessType.SUBJECT_CLIENT_COMPANY,
            "domain": ProcessType.DOMAIN_BZNR,
            "shape": ProcessType.SHAPE_PERIODIC,
            "proof_kind": ProcessType.PROOF_UPLOAD,
            "default_period_months": 36,
            "reminder_offsets": [-30, 7, 15, 30],
            "applicability_rule": {"always": True},
            "include_in_medical_exam_record": False,
        },
    },
    {
        "code": "WORK_ENV_SUMMER",
        "name": "Stručni nalaz o ispitivanju uslova radne sredine — letnji period",
        "order": 3,
        "process_type": {
            "code": "STRUCNI_NALAZ_RADNA_SREDINA_LETO",
            "name": "Stručni nalaz — radna sredina (letnji period)",
            "subject_kind": ProcessType.SUBJECT_CLIENT_COMPANY,
            "domain": ProcessType.DOMAIN_BZNR,
            "shape": ProcessType.SHAPE_PERIODIC,
            "proof_kind": ProcessType.PROOF_UPLOAD,
            "default_period_months": 36,
            "reminder_offsets": [-30, 7, 15, 30],
            "applicability_rule": {"always": True},
            "include_in_medical_exam_record": False,
        },
    },
    {
        "code": "WORK_ENV_WINTER",
        "name": "Stručni nalaz o ispitivanju uslova radne sredine — zimski period",
        "order": 4,
        "process_type": {
            "code": "STRUCNI_NALAZ_RADNA_SREDINA_ZIMA",
            "name": "Stručni nalaz — radna sredina (zimski period)",
            "subject_kind": ProcessType.SUBJECT_CLIENT_COMPANY,
            "domain": ProcessType.DOMAIN_BZNR,
            "shape": ProcessType.SHAPE_PERIODIC,
            "proof_kind": ProcessType.PROOF_UPLOAD,
            "default_period_months": 36,
            "reminder_offsets": [-30, 7, 15, 30],
            "applicability_rule": {"always": True},
            "include_in_medical_exam_record": False,
        },
    },
    {
        "code": "LIGHTNING_PROTECTION",
        "name": "Stručni nalaz o pregledu i proveri gromobranskih instalacija",
        "order": 5,
        "process_type": {
            "code": "STRUCNI_NALAZ_GROMOBRANSKA",
            "name": "Stručni nalaz — gromobranske instalacije",
            "subject_kind": ProcessType.SUBJECT_CLIENT_COMPANY,
            "domain": ProcessType.DOMAIN_BZNR,
            "shape": ProcessType.SHAPE_PERIODIC,
            "proof_kind": ProcessType.PROOF_UPLOAD,
            "default_period_months": 36,
            "reminder_offsets": [-30, 7, 15, 30],
            "applicability_rule": {"requires_installation": "LIGHTNING_PROTECTION"},
            "include_in_medical_exam_record": False,
        },
    },
    {
        "code": "MONITORING_PLAN",
        "name": "Plan i program monitoringa uslova radne sredine",
        "order": 6,
        "process_type": {
            "code": "MONITORING_PLAN_RADNA_SREDINA",
            "name": "Plan i program monitoringa radne sredine",
            "subject_kind": ProcessType.SUBJECT_CLIENT_COMPANY,
            "domain": ProcessType.DOMAIN_BZNR,
            "shape": ProcessType.SHAPE_PERIODIC,
            "proof_kind": ProcessType.PROOF_UPLOAD,
            "default_period_months": 36,
            "reminder_offsets": [-30, 7, 15, 30],
            "applicability_rule": {"always": True},
            "include_in_medical_exam_record": False,
        },
    },
]


class Command(BaseCommand):
    help = "Seed compliance finding types and link them to catalog ProcessTypes."

    @transaction.atomic
    def handle(self, *args, **options):
        created_ft = 0
        created_pt = 0
        linked_ft = 0
        reminder_templates_created = 0

        for data in FINDING_TYPE_PROCESS_TYPES:
            pt_data = data["process_type"]
            pt, pt_was_created = ProcessType.objects.get_or_create(
                code=pt_data["code"],
                defaults={
                    "name": pt_data["name"],
                    "subject_kind": pt_data["subject_kind"],
                    "domain": pt_data["domain"],
                    "shape": pt_data["shape"],
                    "proof_kind": pt_data["proof_kind"],
                    "default_period_months": pt_data["default_period_months"],
                    "reminder_offsets": pt_data["reminder_offsets"],
                    "applicability_rule": pt_data["applicability_rule"],
                    "is_active": True,
                    "include_in_medical_exam_record": pt_data["include_in_medical_exam_record"],
                },
            )
            if pt_was_created:
                created_pt += 1

            ft, ft_was_created = ComplianceFindingType.objects.get_or_create(
                code=data["code"],
                defaults={
                    "name": data["name"],
                    "default_validity_months": 36,
                    "is_active": True,
                    "order": data["order"],
                    "process_type": pt,
                },
            )
            if ft_was_created:
                created_ft += 1
            elif ft.process_type_id is None:
                ft.process_type = pt
                ft.save(update_fields=["process_type"])
                linked_ft += 1

            reminder_templates_created += ensure_obligation_templates(
                pt, CAT_SERVICE, [LEAD, COMPLETED, OVERDUE]
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Finding types: {created_ft} created, {linked_ft} linked, "
                f"{len(FINDING_TYPE_PROCESS_TYPES) - created_ft - linked_ft} existing left untouched. "
                f"Process types: {created_pt} created. "
                f"{reminder_templates_created} reminder template(s) created.",
            ),
        )
