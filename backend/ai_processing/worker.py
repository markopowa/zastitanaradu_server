import logging
from pathlib import Path

import fitz
import pytesseract
from django.utils import timezone
from pdf2image import convert_from_path

from documents.models import DocumentFileAIFormat

logger = logging.getLogger(__name__)


def _document_path(document_file) -> Path | None:
    f = document_file.file
    if not f:
        return None
    try:
        p = Path(f.path)
    except Exception:
        return None
    return p if p.is_file() else None


def _extract_pdf_text_fitz(path: Path) -> str:
    doc = fitz.open(path)
    try:
        parts = []
        for page in doc:
            parts.append(page.get_text() or "")
        return "\n".join(parts).strip()
    finally:
        doc.close()


def _extract_pdf_text_ocr(path: Path, max_pages: int = 5) -> str:
    images = convert_from_path(
        str(path),
        first_page=1,
        last_page=max_pages,
        dpi=200,
    )
    parts = []
    for img in images:
        parts.append(pytesseract.image_to_string(img) or "")
    return "\n".join(parts).strip()


def process_pending_mapping(mapping: DocumentFileAIFormat) -> None:
    DocumentFileAIFormat.objects.filter(pk=mapping.pk).update(
        status=DocumentFileAIFormat.STATUS_IN_PROGRESS,
        error_message="",
    )
    mapping.refresh_from_db()

    doc_file = mapping.document_file
    path = _document_path(doc_file)
    if path is None:
        mapping.status = DocumentFileAIFormat.STATUS_FAILED
        mapping.error_message = "Document file is missing or unreadable."
        mapping.save(update_fields=["status", "error_message"])
        return

    suffix = path.suffix.lower()
    text = ""
    try:
        if suffix == ".pdf":
            text = _extract_pdf_text_fitz(path)
            if len(text) < 40:
                ocr = _extract_pdf_text_ocr(path)
                if len(ocr) > len(text):
                    text = ocr
        elif suffix == ".txt":
            text = path.read_text(encoding="utf-8", errors="replace").strip()
        else:
            mapping.status = DocumentFileAIFormat.STATUS_FAILED
            mapping.error_message = (
                f"AI extraction supports PDF and TXT only; received {suffix}."
            )
            mapping.save(update_fields=["status", "error_message"])
            return
    except Exception as e:
        logger.exception(
            "AI extraction failed for DocumentFileAIFormat id=%s", mapping.id
        )
        mapping.status = DocumentFileAIFormat.STATUS_FAILED
        mapping.error_message = str(e)[:2000]
        mapping.save(update_fields=["status", "error_message"])
        return

    if not text.strip():
        mapping.status = DocumentFileAIFormat.STATUS_FAILED
        mapping.error_message = "No text could be extracted from the document."
        mapping.save(update_fields=["status", "error_message"])
        return

    mapping.status = DocumentFileAIFormat.STATUS_DONE
    mapping.error_message = ""
    mapping.parsed_at = timezone.now()
    mapping.save(update_fields=["status", "error_message", "parsed_at"])
