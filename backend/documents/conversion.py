import os
import subprocess
import tempfile
from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile


class ConversionError(Exception):
    pass


def _libreoffice_bin() -> str:
    return getattr(settings, "LIBREOFFICE_PATH", None) or getattr(
        settings, "LIBREOFFICE_BIN", "soffice"
    )


def _is_office_file(name: str) -> bool:
    suffix = Path(name).suffix.lower()
    return suffix in {".doc", ".docx", ".odt", ".rtf", ".xlsx", ".pptx"}


def convert_office_to_pdf(uploaded_file) -> ContentFile:
    name = uploaded_file.name or "upload.docx"

    with tempfile.TemporaryDirectory() as tmpdir:
        src_path = os.path.join(tmpdir, os.path.basename(name))
        uploaded_file.seek(0)
        with open(src_path, "wb") as fh:
            for chunk in uploaded_file.chunks():
                fh.write(chunk)

        try:
            result = subprocess.run(
                [
                    _libreoffice_bin(),
                    "--headless",
                    "--norestore",
                    "--convert-to", "pdf",
                    "--outdir", tmpdir,
                    src_path,
                ],
                capture_output=True,
                timeout=120,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
            raise ConversionError(str(exc)) from exc

        if result.returncode != 0:
            raise ConversionError(result.stderr.decode(errors="replace"))

        stem = Path(src_path).stem
        pdf_path = os.path.join(tmpdir, stem + ".pdf")
        if not os.path.exists(pdf_path):
            pdfs = list(Path(tmpdir).glob("*.pdf"))
            if not pdfs:
                raise ConversionError("LibreOffice produced no PDF output")
            pdf_path = str(pdfs[0])

        with open(pdf_path, "rb") as fh:
            pdf_bytes = fh.read()

    pdf_name = Path(name).stem + ".pdf"
    return ContentFile(pdf_bytes, name=pdf_name)
