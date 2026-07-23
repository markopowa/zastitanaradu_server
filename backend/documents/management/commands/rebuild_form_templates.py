from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from documents.form_templates import TEMPLATE_INTROS, build_form_template
from documents.models import DocumentTemplate
from documents.management.commands.calibrate_template_placements import (
    calibrate_template,
)

TARGETS = [
    ("Uput za prethodni lekarski", "uput_prethodni",
     "UPUT ZA PRETHODNI LEKARSKI PREGLED", "uput_prethodni_lekarski"),
    ("Uput za lekarski", "uput_lekarski",
     "UPUT ZA LEKARSKI PREGLED", "uput_lekarski_pregled"),
    ("Obrazac 6", "obrazac6",
     "OBRAZAC 6 (osposobljenost za bezbedan i zdrav rad)", "obrazac6"),
    ("Karton zaduženja LZO", "lzo_revers",
     "KARTON ZADUŽENJA LIČNE ZAŠTITNE OPREME", "lzo_revers"),
    ("Potvrda po članu 5", "potvrda_clan5",
     "POTVRDA O OSPOSOBLJENOSTI (član 5)", "potvrda_clan5"),
]


class Command(BaseCommand):
    help = (
        "Rebuild the fill templates as clean forms (label and value table, "
        "tags in blank cells), then recalibrate placements from the new tags."
    )

    def handle(self, *args, **options):
        for name_match, intro_key, title, fname in TARGETS:
            t = (
                DocumentTemplate.objects
                .filter(name__icontains=name_match)
                .first()
            )
            if not t:
                self.stdout.write(self.style.WARNING(
                    f"skip: no template matching '{name_match}'"))
                continue
            gc = t.generation_config or {}
            placeholders = gc.get("placeholders") or []
            field_keys = [p.get("fieldKey") for p in placeholders]
            if not field_keys:
                self.stdout.write(self.style.WARNING(
                    f"skip [{t.id}] {t.name}: no existing fields"))
                continue
            content = build_form_template(
                title, TEMPLATE_INTROS.get(intro_key, ""), field_keys)
            gc["mode"] = "VISUAL"
            t.generation_config = gc
            t.template_file.save(f"{fname}.docx", ContentFile(content),
                                 save=False)
            t.save()
            updated, missed = calibrate_template(t)
            self.stdout.write(self.style.SUCCESS(
                f"[{t.id}] {t.name}: rebuilt form, calibrated {updated}, "
                f"missed {missed}"
            ))
