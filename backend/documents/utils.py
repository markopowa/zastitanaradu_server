import copy
import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
import unicodedata
from datetime import date
from pathlib import Path

import docx
import fitz
from docx.enum.text import WD_COLOR_INDEX
from docx.oxml.ns import qn
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


_DISPLAY_TAG_RE = re.compile(r"\{\{\s*([^{}]+?)\s*\}\}")


def _iter_table_paragraphs(table):
    for row in table.rows:
        for cell in row.cells:
            for para in cell.paragraphs:
                yield para
            for nested_table in cell.tables:
                yield from _iter_table_paragraphs(nested_table)


def _iter_all_paragraphs(doc):
    for para in doc.paragraphs:
        yield para
    for table in doc.tables:
        yield from _iter_table_paragraphs(table)


def _load_field_label_catalog() -> dict:
    from .models import TemplateFieldDefinition

    return dict(
        TemplateFieldDefinition.objects.filter(
            is_active=True).values_list("key", "label")
    )


def _humanize_field_name(field: str) -> str:
    last_segment = field.rsplit(".", 1)[-1]
    words = last_segment.replace("_", " ").strip()
    if not words:
        return field
    return words[:1].upper() + words[1:]


def _display_label_for_key(key: str, catalog: dict) -> str:
    if key.startswith("r."):
        field = key[2:]
        return catalog.get(field) or _humanize_field_name(field)
    return catalog.get(key) or _humanize_field_name(key)


def _badge_text_for_match(key: str, catalog: dict, original: str) -> str:
    label = _display_label_for_key(key, catalog)
    target = len(original)
    if target <= 0:
        return f"[{label}]"
    inner_max = max(1, target - 2)
    inner = label if len(label) <= inner_max else label[:inner_max]
    badge = f"[{inner}]"
    if len(badge) < target:
        badge = f"{badge}{' ' * (target - len(badge))}"
    return badge


def list_docx_placeholder_tags(docx_path: Path) -> list[dict]:
    catalog = _load_field_label_catalog()
    document = docx.Document(_path_str(docx_path))
    seen: set[str] = set()
    out: list[dict] = []
    for para in _iter_all_paragraphs(document):
        for match in _DISPLAY_TAG_RE.finditer(para.text or ""):
            key = (match.group(1) or "").strip()
            if not key or key in seen:
                continue
            seen.add(key)
            out.append({
                "key": key,
                "label": _display_label_for_key(key, catalog),
            })
    return out


def _copy_run_format(run, source_rpr) -> None:
    if source_rpr is None:
        return
    run._element.insert(0, copy.deepcopy(source_rpr))


def _rebuild_paragraph_with_badges(para, catalog: dict) -> bool:
    text = para.text or ""
    if "{{" not in text:
        return False
    matches = list(_DISPLAY_TAG_RE.finditer(text))
    if not matches:
        return False

    base_rpr = None
    if para.runs:
        base_rpr = para.runs[0]._element.find(qn("w:rPr"))

    para.clear()

    pos = 0
    for match in matches:
        if match.start() > pos:
            segment = text[pos:match.start()]
            if segment:
                run = para.add_run(segment)
                _copy_run_format(run, base_rpr)
        label = _badge_text_for_match(match.group(1).strip(), catalog, match.group(0))
        badge_run = para.add_run(label)
        _copy_run_format(badge_run, base_rpr)
        badge_run.font.bold = True
        badge_run.font.highlight_color = WD_COLOR_INDEX.BRIGHT_GREEN
        pos = match.end()
    if pos < len(text):
        segment = text[pos:]
        if segment:
            run = para.add_run(segment)
            _copy_run_format(run, base_rpr)
    return True


_BLANK_FIELD_UNDERSCORES = "_" * 20


def _strip_tags_in_paragraph(para) -> bool:
    text = para.text or ""
    if "{{" not in text:
        return False
    cleaned = _DISPLAY_TAG_RE.sub(_BLANK_FIELD_UNDERSCORES, text)
    base_rpr = None
    if para.runs:
        base_rpr = para.runs[0]._element.find(qn("w:rPr"))
    para.clear()
    if cleaned:
        run = para.add_run(cleaned)
        _copy_run_format(run, base_rpr)
    return True


def make_clean_copy(docx_path: Path) -> Path:
    """Return the path to a temp copy of docx_path with `{{ key }}` tags
    removed (no badge, no highlight). Used as the plain background for the
    visual field editor so the interactive markers are the only overlay."""
    document = docx.Document(_path_str(docx_path))
    changed = False
    for para in _iter_all_paragraphs(document):
        if _strip_tags_in_paragraph(para):
            changed = True

    tmp_dir = Path(tempfile.mkdtemp(prefix="template_clean_"))
    tmp_path = tmp_dir / docx_path.name
    if changed:
        document.save(_path_str(tmp_path))
    else:
        shutil.copy2(_path_str(docx_path), _path_str(tmp_path))
    return tmp_path


def make_display_copy(docx_path: Path) -> Path:
    """Return the path to a temp copy of docx_path with `{{ key }}` tags
    replaced by green highlighted badges showing the human field label.
    The original file is never modified."""
    catalog = _load_field_label_catalog()
    document = docx.Document(_path_str(docx_path))
    changed = False
    for para in _iter_all_paragraphs(document):
        if _rebuild_paragraph_with_badges(para, catalog):
            changed = True

    tmp_dir = Path(tempfile.mkdtemp(prefix="template_display_"))
    tmp_path = tmp_dir / docx_path.name
    if changed:
        document.save(_path_str(tmp_path))
    else:
        shutil.copy2(_path_str(docx_path), _path_str(tmp_path))
    return tmp_path


def generate_page_images(
    template_id: int, source_path: Path, use_badges: bool = False,
) -> list[str]:
    pages_dir = Path(settings.MEDIA_ROOT) / "template_pages" / str(template_id)
    pages_dir.mkdir(parents=True, exist_ok=True)

    existing = sorted(pages_dir.glob("page_*.png"))
    if existing:
        return [
            f"template_pages/{template_id}/{p.name}" for p in existing
        ]

    resolved_path = _resolve_file_path(source_path)

    render_path = resolved_path
    display_tmp_dir: Path | None = None
    if resolved_path.suffix.lower() == ".docx":
        display_path = (
            make_display_copy(resolved_path)
            if use_badges
            else make_clean_copy(resolved_path)
        )
        display_tmp_dir = display_path.parent
        render_path = display_path

    try:
        pdf_path = convert_document_to_pdf(render_path)

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
    finally:
        if display_tmp_dir is not None:
            shutil.rmtree(_path_str(display_tmp_dir), ignore_errors=True)


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


def _run_generation(
    template_id: int, source_path: Path, use_badges: bool = False,
) -> None:
    try:
        generate_page_images(template_id, source_path, use_badges=use_badges)
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


def start_page_generation(
    template_id: int, source_path: Path, use_badges: bool = False,
) -> None:
    """Kick off page-image generation in a background thread (idempotent)."""
    with _generation_guard:
        if template_id in _generation_active:
            return
        _generation_active.add(template_id)
    _write_generation_status(template_id, "generating")
    thread = threading.Thread(
        target=_run_generation,
        args=(template_id, source_path),
        kwargs={"use_badges": use_badges},
        daemon=True,
    )
    thread.start()


def build_preview_context() -> dict:
    birth_date = date(1990, 1, 10)
    return {
        "employee": {
            "first_name": "Marko",
            "last_name": "Marković",
            "full_name": "Marko Marković",
            "org_unit": "Proizvodnja",
            "position": "Operater mašine",
            "email": "marko.markovic@example.rs",
            "father_name": "Petar",
            "national_id": "0101990710121",
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


def _draw_text_at_pct(
    page: fitz.Page,
    x_pct: float,
    y_pct: float,
    height_pct: float,
    font_size: float,
    value: str,
) -> None:
    rect = page.rect
    x = rect.width * x_pct / 100.0
    y_bottom = rect.height * (y_pct + height_pct) / 100.0
    descender = font_size * 0.2
    point = fitz.Point(x, y_bottom - descender)
    page.insert_text(
        point,
        value,
        fontsize=font_size,
        fontname=PDF_UNICODE_FONT_NAME,
    )


def _draw_series_placeholder(
    doc: fitz.Document,
    ph: dict,
    context: dict,
    entity,
    pages_with_font: set[int],
) -> None:
    from processes.series_sources import get_series_source

    series_key = ph.get("seriesSource")
    columns = ph.get("columns") or []
    if not series_key or not columns:
        return

    source_fn = get_series_source(series_key)
    if source_fn is None or entity is None:
        return
    rows = source_fn(entity, context) or []
    if not rows:
        return

    page_num = int(ph.get("page", 0))
    if page_num >= len(doc):
        return
    page = doc[page_num]
    _ensure_page_unicode_font(page, pages_with_font)

    y_start = float(ph.get("yPct", 0))
    row_height = float(ph.get("rowHeightPct", 0))
    default_font_size = float(ph.get("fontSize", 10))
    max_rows = ph.get("maxRowsPerPage")
    max_rows = int(max_rows) if max_rows not in (None, "") else None

    for i, row in enumerate(rows):
        if max_rows is not None and i >= max_rows:
            logger.warning(
                "Series '%s' has %d rows but maxRowsPerPage is %d; "
                "remaining rows were not drawn (v1 does not paginate).",
                series_key, len(rows), max_rows,
            )
            break
        row_y_pct = y_start + i * row_height
        if row_height > 0 and row_y_pct + row_height > 100.0:
            logger.warning(
                "Series '%s' row %d falls past the page bottom; "
                "remaining rows were clamped (v1 does not paginate).",
                series_key, i,
            )
            break

        row_data = dict(row) if isinstance(row, dict) else {}
        row_data.setdefault("rbr", i + 1)
        row_context = dict(context)
        row_context["r"] = row_data

        for col in columns:
            fixed_text = col.get("fixedText") or col.get("staticText")
            if fixed_text is not None and str(fixed_text).strip():
                value = str(fixed_text).strip()
            else:
                field = col.get("field", "")
                value = _resolve_field_value(field, row_context) if field else ""
            if not value:
                continue
            font_size = float(col.get("fontSize", default_font_size))
            _draw_text_at_pct(
                page,
                float(col.get("xPct", 0)),
                row_y_pct,
                row_height,
                font_size,
                value,
            )


def fill_pdf_at_coordinates(
    pdf_path: Path,
    placeholders: list[dict],
    context: dict,
    entity=None,
) -> bytes:
    pdf_path = convert_document_to_pdf(pdf_path)
    doc = fitz.open(_path_str(pdf_path))
    pages_with_font: set[int] = set()

    for ph in placeholders:
        if ph.get("seriesSource"):
            _draw_series_placeholder(doc, ph, context, entity, pages_with_font)
            continue

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

        font_size = float(ph.get("fontSize", 10))
        _draw_text_at_pct(
            page,
            float(ph.get("xPct", 0)),
            float(ph.get("yPct", 0)),
            float(ph.get("heightPct", 0)),
            font_size,
            value,
        )

    result = doc.tobytes()
    doc.close()
    return result


def resolve_visual_fill(
    doc_template,
    blank_file=None,
    blank_placements=None,
):
    """Resolve which file to fill and which placement list to use for VISUAL
    mode generation: the role/training blank (file + its own JSON placements)
    takes priority over the master DocumentTemplate when both are set."""
    generation_config = getattr(doc_template, "generation_config", None) or {}
    master_placements = generation_config.get("placeholders") or []
    fill_file = blank_file if blank_file else getattr(
        doc_template, "template_file", None)
    placements = (
        blank_placements if blank_placements else master_placements
    )
    return fill_file, placements


def generate_visual_pdf(
    doc_template,
    context: dict,
    blank_file=None,
    blank_placements=None,
    entity=None,
) -> bytes:
    fill_file, placements = resolve_visual_fill(
        doc_template, blank_file, blank_placements)
    if not fill_file:
        raise ValueError(
            "Nema fajla za popunjavanje (ni blanko obrazac ni master šablon "
            "nemaju otpremljen fajl)."
        )
    file_path = Path(fill_file.path)
    return fill_pdf_at_coordinates(file_path, placements, context, entity=entity)


def merge_section_files_to_pdf(file_paths: list[Path]) -> bytes:
    result = fitz.open()
    try:
        for raw_path in file_paths:
            path = Path(_path_str(raw_path))
            try:
                pdf_path = convert_document_to_pdf(path)
                src = fitz.open(_path_str(pdf_path))
            except Exception:
                logger.warning(
                    "merge_section_files_to_pdf: skipping unreadable file %s",
                    path,
                )
                continue
            result.insert_pdf(src)
            src.close()
        if result.page_count == 0:
            result.new_page()
        return result.tobytes()
    finally:
        result.close()
