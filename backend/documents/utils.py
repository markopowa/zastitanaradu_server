import json
import logging
import os
import shutil
import subprocess
import tempfile
import threading
import time
import unicodedata
from datetime import date
from pathlib import Path

import fitz
from pdf2image import convert_from_path

from django.conf import settings

from processes.date_format import format_date_display

logger = logging.getLogger(__name__)


class TemplateUnsupportedError(Exception):
    def __init__(self, extension: str) -> None:
        self.extension = extension
        super().__init__(f"Unsupported template file extension: {extension}")


def _resolve_field_value(field_key: str, context: dict) -> str:
    parts = field_key.split(".")
    val: object = context
    for part in parts:
        if isinstance(val, dict):
            val = val.get(part, "")
        else:
            return ""
    return str(val) if val is not None else ""


def convert_document_to_pdf(path: Path) -> Path:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return path
    if suffix not in settings.DOCUMENT_CONVERTIBLE_SUFFIXES:
        raise TemplateUnsupportedError(suffix)
    with tempfile.TemporaryDirectory() as tmp:
        profile_uri = Path(os.path.join(tmp, "louser")).as_uri()
        result = subprocess.run(
            [
                settings.LIBREOFFICE_BIN,
                "-env:UserInstallation=" + profile_uri,
                "--headless",
                "--norestore",
                "--convert-to", "pdf",
                "--outdir", tmp,
                _path_str(path),
            ],
            capture_output=True,
            timeout=120,
            env={**os.environ, "HOME": tmp},
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.decode(errors="replace"))
        pdf_name = path.stem + ".pdf"
        tmp_pdf = Path(tmp) / pdf_name
        if not tmp_pdf.exists():
            pdfs = list(Path(tmp).glob("*.pdf"))
            if not pdfs:
                raise RuntimeError("LibreOffice conversion produced no output")
            tmp_pdf = pdfs[0]
        dest = path.with_suffix(".pdf")
        shutil.move(_path_str(tmp_pdf), _path_str(dest))
    return dest


def _normalize_stem(stem: str) -> str:
    nfd = unicodedata.normalize("NFD", stem)
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def _path_str(path: Path) -> str:
    return unicodedata.normalize("NFC", str(path))


PDF_UNICODE_FONT_NAME = "ProcessDocUnicode"


def _resolve_unicode_font_path() -> str:
    bundled = Path(__file__).resolve().parent / "fonts" / "DejaVuSans.ttf"
    candidates = (
        bundled,
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeui.ttf"),
    )
    for candidate in candidates:
        if candidate.is_file():
            return _path_str(candidate)
    raise RuntimeError(
        "No Unicode font found for PDF generation. "
        "Install fonts-dejavu-core or add DejaVuSans.ttf to documents/fonts/."
    )


def _ensure_page_unicode_font(page: fitz.Page, pages_with_font: set[int]) -> None:
    page_number = page.number
    if page_number in pages_with_font:
        return
    page.insert_font(
        fontname=PDF_UNICODE_FONT_NAME,
        fontfile=_resolve_unicode_font_path(),
    )
    pages_with_font.add(page_number)


def _resolve_file_path(path: Path) -> Path:
    if path.exists():
        return path
    parent = path.parent
    suffix = path.suffix.lower()
    target_stem_norm = _normalize_stem(path.stem)
    for candidate in parent.iterdir():
        if candidate.is_file() and candidate.suffix.lower() == suffix:
            if _normalize_stem(candidate.stem) == target_stem_norm:
                return candidate
    return path


def generate_page_images(template_id: int, source_path: Path) -> list[str]:
    pages_dir = Path(settings.MEDIA_ROOT) / "template_pages" / str(template_id)
    pages_dir.mkdir(parents=True, exist_ok=True)

    existing = sorted(pages_dir.glob("page_*.png"))
    if existing:
        return [
            f"template_pages/{template_id}/{p.name}" for p in existing
        ]

    resolved_path = _resolve_file_path(source_path)
    pdf_path = convert_document_to_pdf(resolved_path)

    paths: list[str] = []
    with tempfile.TemporaryDirectory() as tmp:
        ascii_pdf = Path(tmp) / "document.pdf"
        shutil.copy2(_path_str(pdf_path), str(ascii_pdf))
        image_paths = convert_from_path(
            str(ascii_pdf),
            dpi=150,
            poppler_path=settings.POPPLER_PATH,
            output_folder=tmp,
            fmt="png",
            paths_only=True,
        )
        for i, src in enumerate(image_paths):
            name = f"page_{i}.png"
            shutil.move(_path_str(Path(src)), _path_str(pages_dir / name))
            paths.append(f"template_pages/{template_id}/{name}")

    return paths


def invalidate_page_images(template_id: int) -> None:
    pages_dir = Path(settings.MEDIA_ROOT) / "template_pages" / str(template_id)
    if pages_dir.exists():
        shutil.rmtree(pages_dir)
    with _generation_guard:
        _generation_active.discard(template_id)


# ---------------------------------------------------------------------------
# Asynchronous page-image generation
#
# Rasterizing a large document (LibreOffice -> PDF -> pdftoppm) can take a few
# minutes, which is far longer than the gunicorn worker timeout. So the HTTP
# request only kicks off a background thread and returns immediately; the client
# polls until the images are ready. State is tracked via a small JSON file in
# the pages directory so it is visible across gunicorn workers (shared volume).
# ---------------------------------------------------------------------------

PAGE_STATUS_FILENAME = "_status.json"
# If a "generating" marker is older than this, assume the worker/thread that
# owned it died (e.g. redeploy) and allow a fresh generation to start.
PAGE_GENERATION_STALE_SECONDS = 900

_generation_guard = threading.Lock()
_generation_active: set[int] = set()


def _pages_dir(template_id: int) -> Path:
    return Path(settings.MEDIA_ROOT) / "template_pages" / str(template_id)


def existing_page_urls(template_id: int) -> list[str] | None:
    existing = sorted(_pages_dir(template_id).glob("page_*.png"))
    if existing:
        return [f"template_pages/{template_id}/{p.name}" for p in existing]
    return None


def _write_generation_status(template_id: int, state: str, detail: str = "") -> None:
    pages_dir = _pages_dir(template_id)
    pages_dir.mkdir(parents=True, exist_ok=True)
    status_path = pages_dir / PAGE_STATUS_FILENAME
    tmp_path = pages_dir / (PAGE_STATUS_FILENAME + ".tmp")
    payload = {"state": state, "detail": detail, "ts": time.time()}
    tmp_path.write_text(json.dumps(payload))
    tmp_path.replace(status_path)


def get_page_generation_status(template_id: int) -> dict:
    status_path = _pages_dir(template_id) / PAGE_STATUS_FILENAME
    if not status_path.exists():
        return {"state": "idle", "detail": "", "ts": 0}
    try:
        data = json.loads(status_path.read_text())
    except (ValueError, OSError):
        return {"state": "idle", "detail": "", "ts": 0}
    if data.get("state") == "generating":
        if time.time() - data.get("ts", 0) > PAGE_GENERATION_STALE_SECONDS:
            return {"state": "idle", "detail": "", "ts": data.get("ts", 0)}
    return data


def _run_generation(template_id: int, source_path: Path) -> None:
    try:
        generate_page_images(template_id, source_path)
        _write_generation_status(template_id, "done")
    except Exception as exc:  # noqa: BLE001 - reported back to the client
        logger.error(
            "Async page image generation failed for template %s: %s",
            template_id, exc, exc_info=True,
        )
        _write_generation_status(template_id, "error", str(exc))
    finally:
        with _generation_guard:
            _generation_active.discard(template_id)


def start_page_generation(template_id: int, source_path: Path) -> None:
    """Kick off page-image generation in a background thread (idempotent)."""
    with _generation_guard:
        if template_id in _generation_active:
            return
        _generation_active.add(template_id)
    _write_generation_status(template_id, "generating")
    thread = threading.Thread(
        target=_run_generation,
        args=(template_id, source_path),
        daemon=True,
    )
    thread.start()


def build_preview_context() -> dict:
    birth_date = date(1990, 1, 10)
    return {
        "employee": {
            "first_name": "Marko",
            "last_name": "Marković",
            "org_unit": "Proizvodnja",
            "position": "Operater mašine",
            "email": "marko.markovic@example.rs",
            "father_name": "Petar",
            "national_id": "0101990710123",
            "date_of_birth": format_date_display(birth_date),
            "place_of_birth": "Beograd",
            "occupation": "Mašinovođa",
            "high_risk_position_name": "Rad na visini",
        },
        "client": {
            "name": "Demo DOO",
            "tax_id": "123456789",
            "address": "Bulevar kralja Aleksandra 1, Beograd",
            "phone": "+381 11 123 4567",
            "email": "info@demo.rs",
            "website": "https://demo.rs",
            "registration_number": "12345678",
            "activity_code": "6201",
            "risk_assessment_act_name": "Akt o proceni rizika 2024",
            "risk_assessment_act_date": format_date_display(date(2024, 3, 15)),
            "director_name": "Petar Petrović",
            "director_phone": "+381 60 1112223",
            "director_email": "direktor@demo.rs",
            "contact_name": "Jelena Jelić",
            "contact_phone": "+381 60 3334445",
            "contact_email": "kontakt@demo.rs",
        },
        "equipment": {
            "name": "Kompresor ABC-500",
            "category": "Pneumatska oprema",
            "inventory_number": "INV-0042",
            "location": "Hala 2",
        },
        "scheduled_for": format_date_display(date(2026, 6, 1)),
        "performed_at": format_date_display(date(2026, 6, 7)),
        "valid_until": format_date_display(date(2027, 6, 7)),
        "process_type_name": "Periodični lekarski pregled",
        "instruction_number": "UP-00123",
        "last_exam_date": format_date_display(date(2025, 6, 7)),
        "year_of_birth": "1990",
        "date_of_birth": format_date_display(birth_date),
    }


def fill_pdf_at_coordinates(
    pdf_path: Path,
    placeholders: list[dict],
    context: dict,
) -> bytes:
    pdf_path = convert_document_to_pdf(pdf_path)
    doc = fitz.open(_path_str(pdf_path))
    pages_with_font: set[int] = set()

    for ph in placeholders:
        fixed_text = ph.get("fixedText") or ph.get("staticText")
        if fixed_text is not None and str(fixed_text).strip():
            value = str(fixed_text).strip()
        else:
            field_key = ph.get("fieldKey", "")
            if not field_key:
                continue
            value = _resolve_field_value(field_key, context)
        if not value:
            continue

        page_num = int(ph.get("page", 0))
        if page_num >= len(doc):
            continue
        page = doc[page_num]
        _ensure_page_unicode_font(page, pages_with_font)
        rect = page.rect

        x_pct = float(ph.get("xPct", 0))
        y_pct = float(ph.get("yPct", 0))
        height_pct = float(ph.get("heightPct", 0))

        x = rect.width * x_pct / 100.0
        y_bottom = rect.height * (y_pct + height_pct) / 100.0

        font_size = float(ph.get("fontSize", 10))
        descender = font_size * 0.2
        point = fitz.Point(x, y_bottom - descender)
        page.insert_text(
            point,
            value,
            fontsize=font_size,
            fontname=PDF_UNICODE_FONT_NAME,
        )

    result = doc.tobytes()
    doc.close()
    return result


def merge_section_files_to_pdf(file_paths: list[Path]) -> bytes:
    result = fitz.open()
    try:
        for raw_path in file_paths:
            path = Path(_path_str(raw_path))
            pdf_path = convert_document_to_pdf(path)
            src = fitz.open(_path_str(pdf_path))
            result.insert_pdf(src)
            src.close()
        return result.tobytes()
    finally:
        result.close()
