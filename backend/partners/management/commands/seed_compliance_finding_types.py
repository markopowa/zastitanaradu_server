from django.core.management.base import BaseCommand
from django.db import transaction

from partners.models import ComplianceFindingType

FINDING_TYPES = [
    {
        "code": "WORK_EQUIPMENT",
        "name": "Stručni nalaz o pregledu i proveri opreme za rad",
        "order": 1,
    },
    {
        "code": "ELECTRICAL_INSTALLATIONS",
        "name": "Stručni nalaz o pregledu i proveri električnih instalacija",
        "order": 2,
    },
    {
        "code": "WORK_ENV_SUMMER",
        "name": "Stručni nalaz o ispitivanju uslova radne sredine — letnji period",
        "order": 3,
    },
    {
        "code": "WORK_ENV_WINTER",
        "name": "Stručni nalaz o ispitivanju uslova radne sredine — zimski period",
        "order": 4,
    },
    {
        "code": "LIGHTNING_PROTECTION",
        "name": "Stručni nalaz o pregledu i proveri gromobranskih instalacija",
        "order": 5,
    },
    {
        "code": "MONITORING_PLAN",
        "name": "Plan i program monitoringa uslova radne sredine",
        "order": 6,
    },
]


class Command(BaseCommand):
    help = "Seed compliance finding types."

    @transaction.atomic
    def handle(self, *args, **options):
        created = 0
        for data in FINDING_TYPES:
            _, was_created = ComplianceFindingType.objects.update_or_create(
                code=data["code"],
                defaults={
                    "name": data["name"],
                    "default_validity_months": 36,
                    "is_active": True,
                    "order": data["order"],
                },
            )
            created += int(was_created)
        self.stdout.write(
            self.style.SUCCESS(
                f"Compliance finding types: {created} created, "
                f"{len(FINDING_TYPES) - created} updated.",
            ),
        )
