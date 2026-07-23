from pathlib import Path

import fitz
from django.core.management.base import BaseCommand

from documents.models import DocumentTemplate
from documents.utils import convert_document_to_pdf, invalidate_page_images


def _find_tag_rect(doc, key):
    for page_idx, page in enumerate(doc):
        for pattern in (f"{{{{{key}}}}}", f"{{{{ {key} }}}}"):
            rects = page.search_for(pattern)
            if rects:
                return page_idx, rects[0], page.rect.width, page.rect.height
    return None


def calibrate_template(template) -> tuple[int, int]:
    gc = template.generation_config or {}
    placeholders = gc.get("placeholders") or []
    if not placeholders or not template.template_file:
        return 0, 0
    pdf_path = convert_document_to_pdf(Path(template.template_file.path))
    doc = fitz.open(str(pdf_path))
    updated = 0
    missed = 0
    try:
        for ph in placeholders:
            key = ph.get("fieldKey")
            if not key or key == "__fixed_text__":
                continue
            found = _find_tag_rect(doc, key)
            if not found:
                missed += 1
                continue
            page_idx, rect, pw, ph_h = found
            ph["page"] = page_idx
            ph["xPct"] = round(rect.x0 / pw * 100, 3)
            ph["yPct"] = round(rect.y0 / ph_h * 100, 3)
            ph["widthPct"] = round(rect.width / pw * 100, 3)
            ph["heightPct"] = round(rect.height / ph_h * 100, 3)
            ph["fontSize"] = max(8, min(13, round(rect.height * 0.72)))
            updated += 1
    finally:
        doc.close()
    gc["placeholders"] = placeholders
    template.generation_config = gc
    template.save(update_fields=["generation_config"])
    invalidate_page_images(template.id)
    return updated, missed


class Command(BaseCommand):
    help = (
        "Recalibrate visual placeholder coordinates and font size from the "
        "actual {{tag}} positions rendered in the template document."
    )

    def add_arguments(self, parser):
        parser.add_argument("--template-id", type=int, default=None)
        parser.add_argument("--name", default=None)

    def handle(self, *args, **options):
        qs = DocumentTemplate.objects.exclude(template_file="")
        if options["template_id"]:
            qs = qs.filter(pk=options["template_id"])
        if options["name"]:
            qs = qs.filter(name__icontains=options["name"])
        for t in qs:
            updated, missed = calibrate_template(t)
            self.stdout.write(self.style.SUCCESS(
                f"[{t.id}] {t.name}: calibrated {updated}, missed {missed}"
            ))
