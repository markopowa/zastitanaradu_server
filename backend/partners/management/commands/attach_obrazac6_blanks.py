import json
import re
import unicodedata
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand

from partners.models import ClientCompany, JobRole

KINDS = {
    "obrazac6": ("obrazac6", "obrazac6_template", "obrazac6_fields"),
    "lzo_revers": ("lzo_revers", "lzo_revers_template", "lzo_revers_fields"),
}


def _load_placements_sidecar(blanks_dir: Path) -> dict:
    sidecar_path = blanks_dir / "placements.json"
    if not sidecar_path.is_file():
        return {}
    try:
        return json.loads(sidecar_path.read_text())
    except (ValueError, OSError):
        return {}


def slug(value):
    normalized = unicodedata.normalize("NFKD", value).encode(
        "ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", normalized.lower()).strip("_")


class Command(BaseCommand):
    help = (
        "Attach the pre-built blank documents (Obrazac 6, LZO revers) to each "
        "JobRole by matching the role name. Idempotent."
    )

    def add_arguments(self, parser):
        parser.add_argument("--company", default=None)
        parser.add_argument("--overwrite", action="store_true")
        parser.add_argument(
            "--kind", choices=list(KINDS) + ["all"], default="all")

    def handle(self, *args, **options):
        blanks_root = Path(settings.BASE_DIR) / "pilot_blanks"
        roles = JobRole.objects.all()
        company = options["company"]
        if company:
            qs = ClientCompany.objects.filter(name__icontains=company)
            roles = roles.filter(client_company__in=qs)

        kinds = list(KINDS) if options["kind"] == "all" else [options["kind"]]

        for kind in kinds:
            prefix, field, fields_field = KINDS[kind]
            blanks_dir = blanks_root / kind
            placements_sidecar = _load_placements_sidecar(blanks_dir)
            attached = 0
            skipped = 0
            fields_seeded = 0
            unmatched = []
            for role in roles:
                if getattr(role, field) and not options["overwrite"]:
                    skipped += 1
                    continue
                path = blanks_dir / f"{prefix}_{slug(role.name)}.docx"
                if not path.exists():
                    unmatched.append(role.name)
                    continue
                with open(path, "rb") as fh:
                    getattr(role, field).save(path.name, File(fh), save=False)
                placements = placements_sidecar.get(path.name)
                update_fields = [field]
                if placements and (
                    not getattr(role, fields_field) or options["overwrite"]
                ):
                    setattr(role, fields_field, placements)
                    update_fields.append(fields_field)
                    fields_seeded += 1
                role.save(update_fields=update_fields)
                attached += 1

            self.stdout.write(self.style.SUCCESS(
                f"{kind}: attached {attached}, skipped {skipped} "
                f"(already had a file), {fields_seeded} field position "
                "set(s) seeded from placements.json."
            ))
            if unmatched:
                self.stdout.write(self.style.WARNING(
                    f"{kind}: no matching blank for: " + ", ".join(unmatched)
                ))
