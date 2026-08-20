import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from documents.tag_placement_migration import derive_placements, strip_tags_from_docx
from documents.uput_template_tags import restore_uput_tags_file
from partners.management.commands.add_setup import MASTER_TEMPLATE_DIR_NAME

SIDEcar_NAMES = {
    "uput_prethodni.docx": "Uput za prethodni lekarski pregled",
    "uput_periodicni.docx": "Uput za lekarski pregled",
}


class Command(BaseCommand):
    help = (
        "Restore {{ tags }} in uput master templates, re-derive VISUAL "
        "placements with unique calibration markers, update placements.json, "
        "then strip tags again."
    )

    def handle(self, *args, **options):
        master_dir = Path(settings.BASE_DIR) / MASTER_TEMPLATE_DIR_NAME
        sidecar_path = master_dir / "placements.json"
        sidecar = {}
        if sidecar_path.exists():
            sidecar = json.loads(sidecar_path.read_text(encoding="utf-8"))

        for filename, sidecar_key in SIDEcar_NAMES.items():
            path = master_dir / filename
            if not path.is_file():
                self.stdout.write(self.style.WARNING(f"skip missing {filename}"))
                continue
            periodic = filename == "uput_periodicni.docx"
            if not restore_uput_tags_file(path, periodic=periodic):
                self.stdout.write(self.style.WARNING(
                    f"skip {filename}: could not restore tags"))
                continue
            placements, warnings = derive_placements(path)
            for warning in warnings:
                self.stdout.write(self.style.WARNING(f"  {warning}"))
            strip_tags_from_docx(path)
            sidecar[sidecar_key] = {
                "mode": "VISUAL",
                "placeholders": placements,
            }
            self.stdout.write(self.style.SUCCESS(
                f"{sidecar_key}: {len(placements)} placement(s)"))

        sidecar_path.write_text(
            json.dumps(sidecar, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        self.stdout.write(self.style.SUCCESS(f"Wrote {sidecar_path}"))
