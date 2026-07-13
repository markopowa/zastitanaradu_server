import re
import unicodedata
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand

from partners.models import ClientCompany, JobRole

BLANKS_DIR = Path(settings.BASE_DIR) / "pilot_blanks" / "obrazac6"


def slug(value):
    normalized = unicodedata.normalize("NFKD", value).encode(
        "ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", normalized.lower()).strip("_")


class Command(BaseCommand):
    help = (
        "Attach the pre-built blank Obrazac 6 (.docx) to each JobRole by "
        "matching the role name. Idempotent; overwrites the existing file."
    )

    def add_arguments(self, parser):
        parser.add_argument("--company", default=None)
        parser.add_argument("--overwrite", action="store_true")

    def handle(self, *args, **options):
        roles = JobRole.objects.all()
        company = options["company"]
        if company:
            qs = ClientCompany.objects.filter(name__icontains=company)
            roles = roles.filter(client_company__in=qs)

        attached = 0
        skipped = 0
        unmatched = []
        for role in roles:
            if role.obrazac6_template and not options["overwrite"]:
                skipped += 1
                continue
            path = BLANKS_DIR / f"obrazac6_{slug(role.name)}.docx"
            if not path.exists():
                unmatched.append(role.name)
                continue
            with open(path, "rb") as fh:
                role.obrazac6_template.save(path.name, File(fh), save=True)
            attached += 1

        self.stdout.write(self.style.SUCCESS(
            f"Attached {attached}, skipped {skipped} (already had a file)."
        ))
        if unmatched:
            self.stdout.write(self.style.WARNING(
                "No matching blank for: " + ", ".join(unmatched)
            ))
