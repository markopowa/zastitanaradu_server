import shutil
import subprocess
import tempfile
import unicodedata
from pathlib import Path

import fitz
from django.conf import settings
from pdf2image import convert_from_path


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
        result = subprocess.run(
            [
                settings.LIBREOFFICE_BIN,
                "--headless",
                "--norestore",
                "--convert-to", "pdf",
                "--outdir", tmp,
                _path_str(path),
            ],
            capture_output=True,
            timeout=120,
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

    with tempfile.TemporaryDirectory() as tmp:
        ascii_pdf = Path(tmp) / "document.pdf"
        shutil.copy2(_path_str(pdf_path), str(ascii_pdf))
        images = convert_from_path(
            str(ascii_pdf), dpi=200, poppler_path=settings.POPPLER_PATH
        )

    paths: list[str] = []
    for i, img in enumerate(images):
        name = f"page_{i}.png"
        img.save(_path_str(pages_dir / name), "PNG")
        paths.append(f"template_pages/{template_id}/{name}")

    return paths


def invalidate_page_images(template_id: int) -> None:
    pages_dir = Path(settings.MEDIA_ROOT) / "template_pages" / str(template_id)
    if pages_dir.exists():
        shutil.rmtree(pages_dir)


def fill_pdf_at_coordinates(
    pdf_path: Path,
    placeholders: list[dict],
    context: dict,
) -> bytes:
    pdf_path = convert_document_to_pdf(pdf_path)
    doc = fitz.open(_path_str(pdf_path))

    for ph in placeholders:
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
        rect = page.rect

        x_pct = float(ph.get("xPct", 0))
        y_pct = float(ph.get("yPct", 0))

        x = rect.width * x_pct / 100.0
        y = rect.height * y_pct / 100.0

        font_size = float(ph.get("fontSize", 10))
        point = fitz.Point(x, y + font_size)
        page.insert_text(
            point,
            value,
            fontsize=font_size,
            fontname="helv",
        )

    result = doc.tobytes()
    doc.close()
    return result
