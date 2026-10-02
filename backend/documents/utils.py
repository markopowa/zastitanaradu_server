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
from pathlib import Path

import docx
import fitz
from docx.enum.text import WD_COLOR_INDEX
from docx.oxml.ns import qn
from pdf2image import convert_from_path

from django.conf import settings


logger = logging.getLogger(__name__)


class TemplateUnsupportedError(Exception):
    def __init__(self, extension: str) -> None:
        self.extension = extension
        super().__init__(f"Unsupported template file extension: {extension}")


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


def make_display_copy(docx_path: Path) -> Path:
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
    template_id: int, source_path: Path,
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
        display_path = make_display_copy(resolved_path)
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



PAGE_STATUS_FILENAME = "_status.json"
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
    template_id: int, source_path: Path,
) -> None:
    try:
        generate_page_images(template_id, source_path)
        _write_generation_status(template_id, "done")
    except Exception as exc:
        logger.error(
            "Async page image generation failed for template %s: %s",
            template_id, exc, exc_info=True,
        )
        _write_generation_status(template_id, "error", str(exc))
    finally:
        with _generation_guard:
            _generation_active.discard(template_id)


def start_page_generation(
    template_id: int, source_path: Path,
) -> None:
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
