import html
import os
import re
from pathlib import Path
from typing import IO

import docx
from docx.oxml.ns import qn as _qn
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph
from pypdf import PdfReader
from pdf2image import convert_from_bytes, convert_from_path
import pytesseract


class TemplateUnsupportedError(Exception):
    def __init__(self, extension: str) -> None:
        self.extension = extension
        super().__init__(f"Unsupported template file extension: {extension}")


class PdfReadError(Exception):
    pass


class PdfNoTextError(Exception):
    pass


_UNDERLINE_PATTERN = re.compile(r"_{3,}")


def _extract_text_from_pdf_reader(reader: PdfReader) -> str:
    texts: list[str] = []

    for page in reader.pages:
        page_text = page.extract_text() or ""
        if page_text:
            texts.append(page_text)

    return "\n".join(texts).strip()


def _extract_text_from_pdf_path(path: Path) -> str:
    try:
        reader = PdfReader(str(path))
    except Exception as exc:
        raise PdfReadError from exc

    raw = _extract_text_from_pdf_reader(reader)
    if not raw:
        raise PdfNoTextError
    return raw


def _iter_block_items(doc: docx.Document):
    body = doc.element.body
    for child in body.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, doc)
        elif isinstance(child, CT_Tbl):
            yield Table(child, doc)


def _extract_text_from_docx_document(doc: docx.Document) -> str:
    lines: list[str] = []
    for block in _iter_block_items(doc):
        if isinstance(block, Paragraph):
            lines.append(block.text or "")
        elif isinstance(block, Table):
            seen_tc_ids: set[int] = set()
            for row in block.rows:
                cell_texts: list[str] = []
                for cell in row.cells:
                    tc_id = id(cell._tc)
                    if tc_id in seen_tc_ids:
                        cell_texts.append("")
                    else:
                        seen_tc_ids.add(tc_id)
                        cell_content = "\n".join(p.text or "" for p in cell.paragraphs)
                        cell_texts.append(cell_content)
                lines.append("\t".join(cell_texts))
            lines.append("")
    return "\n".join(lines).strip()


def _extract_text_from_pdf_filelike(file_obj: IO[bytes]) -> str:
    try:
        reader = PdfReader(file_obj)
    except Exception as exc:
        raise PdfReadError from exc

    raw = _extract_text_from_pdf_reader(reader)
    if not raw:
        raise PdfNoTextError
    return raw


def _extract_text_from_images(images) -> str:
    langs = os.getenv("TESSERACT_LANGS", "srp+eng")
    texts: list[str] = []
    for img in images:
        text = pytesseract.image_to_string(img, lang=langs) or ""
        if text.strip():
            texts.append(text)
    raw = "\n".join(texts).strip()
    if not raw:
        raise PdfNoTextError
    return raw


def _extract_text_from_pdf_path_via_ocr(path: Path) -> str:
    poppler_path = os.getenv("POPPLER_PATH") or None
    images = convert_from_path(str(path), dpi=300, poppler_path=poppler_path)
    return _extract_text_from_images(images)


def _extract_text_from_pdf_bytes_via_ocr(pdf_bytes: bytes) -> str:
    poppler_path = os.getenv("POPPLER_PATH") or None
    images = convert_from_bytes(pdf_bytes, dpi=300, poppler_path=poppler_path)
    return _extract_text_from_images(images)


def build_template_preview_html(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".docx":
        doc = docx.Document(path)
        parts: list[str] = []
        parts.append(
            "<!doctype html><html><head><meta charset='utf-8'>"
            "<style>body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.4}"
            "table{border-collapse:collapse;margin:10px 0;width:100%}"
            "td,th{border:1px solid #555;padding:4px 6px;vertical-align:top;}</style>"
            "</head><body>"
        )
        for block in _iter_block_items(doc):
            if isinstance(block, Paragraph):
                text = html.escape(block.text or "")
                if text:
                    parts.append(f"<div>{text}</div>")
            elif isinstance(block, Table):
                parts.append("<table>")
                for row in block.rows:
                    parts.append("<tr>")
                    for cell in row.cells:
                        cell_text = "\n".join(p.text or "" for p in cell.paragraphs)
                        parts.append(f"<td>{html.escape(cell_text)}</td>")
                    parts.append("</tr>")
                parts.append("</table>")
        parts.append("</body></html>")
        return "".join(parts)
    if suffix == ".pdf":
        raw = _extract_text_from_pdf_path(path)
        escaped = html.escape(raw)
        return (
            "<!doctype html><html><head><meta charset='utf-8'>"
            "<style>body{font-family:monospace;font-size:11pt;white-space:pre-wrap}</style>"
            "</head><body><pre>"
            f"{escaped}"
            "</pre></body></html>"
        )
    return ""


def build_template_body_from_document_path(path: Path) -> str:
    suffix = path.suffix.lower()

    if suffix == ".docx":
        doc = docx.Document(path)
        return _extract_text_from_docx_document(doc)

    if suffix == ".pdf":
        try:
            return _extract_text_from_pdf_path(path)
        except (PdfReadError, PdfNoTextError):
            return _extract_text_from_pdf_path_via_ocr(path)

    if suffix in {".txt", ".jinja", ".jinja2"}:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            raw = f.read()
        return raw

    raise TemplateUnsupportedError(suffix)


def build_template_body_from_uploaded_file(uploaded_file) -> str:

    name = getattr(uploaded_file, "name", "") or ""
    suffix = Path(name).suffix.lower()

    if suffix == ".docx":
        doc = docx.Document(uploaded_file)
        return _extract_text_from_docx_document(doc)

    if suffix == ".pdf":
        try:
            return _extract_text_from_pdf_filelike(uploaded_file)
        except (PdfReadError, PdfNoTextError):
            try:
                uploaded_file.seek(0)
            except (AttributeError, OSError):
                pass
            pdf_bytes = uploaded_file.read()
            if not pdf_bytes:
                raise PdfNoTextError
            return _extract_text_from_pdf_bytes_via_ocr(pdf_bytes)

    if suffix in {".txt", ".jinja", ".jinja2"}:
        raw_bytes = uploaded_file.read()
        raw = raw_bytes.decode("utf-8", errors="ignore")
        return raw

    raise TemplateUnsupportedError(suffix or "<no-extension>")


def _vmerge_status(cell) -> str:
    vMerge = cell._tc.find(_qn("w:vMerge"))
    if vMerge is None:
        return "none"
    return "restart" if vMerge.get(_qn("w:val")) == "restart" else "continue"


def parse_docx_structure(path: Path) -> list[dict]:
    doc = docx.Document(str(path))
    result: list[dict] = []
    table_counter = 0
    para_counter = 0

    for block in _iter_block_items(doc):
        if isinstance(block, Paragraph):
            result.append({
                "id": f"p_{para_counter}",
                "type": "paragraph",
                "block_index": para_counter,
                "text": block.text or "",
            })
            para_counter += 1
        elif isinstance(block, Table):
            rows = []
            for ri, row in enumerate(block.rows):
                cells = []
                seen_tc_ids: set[int] = set()
                for ci, cell in enumerate(row.cells):
                    tc_id = id(cell._tc)
                    if tc_id in seen_tc_ids:
                        continue
                    seen_tc_ids.add(tc_id)

                    cell_text = "\n".join(p.text or "" for p in cell.paragraphs)
                    is_vmerge_cont = _vmerge_status(cell) == "continue"

                    cells.append({
                        "id": f"t_{table_counter}_r_{ri}_c_{ci}",
                        "type": "table_cell",
                        "table_index": table_counter,
                        "row_index": ri,
                        "cell_index": ci,
                        "text": cell_text,
                        "vmerge_continuation": is_vmerge_cont,
                    })
                rows.append({"row_index": ri, "cells": cells})
            result.append({
                "id": f"t_{table_counter}",
                "type": "table",
                "table_index": table_counter,
                "rows": rows,
            })
            table_counter += 1

    return result


def parse_pdf_structure(path: Path) -> list[dict]:
    raw = build_template_body_from_document_path(path)
    if not raw:
        return []
    lines = [line.strip() for line in raw.splitlines()]
    blocks: list[dict] = []
    idx = 0
    for line in lines:
        if not line:
            continue
        blocks.append(
            {
                "id": f"p_{idx}",
                "type": "paragraph",
                "block_index": idx,
                "text": line,
            }
        )
        idx += 1
    return blocks


def _resolve_field_value(field_key: str, context: dict) -> str:
    parts = field_key.split(".")
    val: object = context
    for part in parts:
        if isinstance(val, dict):
            val = val.get(part, "")
        else:
            return ""
    return str(val) if val is not None else ""


def _set_cell_text_preserve_format(cell, value: str) -> None:
    para = cell.paragraphs[0]
    if para.runs:
        para.runs[0].text = value
        for run in para.runs[1:]:
            run.text = ""
    else:
        para.add_run(value)
    for extra_para in cell.paragraphs[1:]:
        for run in extra_para.runs:
            run.text = ""


def fill_docx_from_placeholders(
    doc: docx.Document,
    placeholders: list[dict],
    context: dict,
) -> None:
    cell_fills: dict[tuple[int, int, int], str] = {}
    para_fills: dict[int, str] = {}

    for ph in placeholders:
        field_key = ph.get("fieldKey", "")
        docx_ref = ph.get("docx_ref") or {}
        if not field_key or not docx_ref:
            continue
        value = _resolve_field_value(field_key, context)
        ref_type = docx_ref.get("type")

        if ref_type == "table_cell":
            key = (
                int(docx_ref.get("table_index", 0)),
                int(docx_ref.get("row_index", 0)),
                int(docx_ref.get("cell_index", 0)),
            )
            cell_fills[key] = value
        elif ref_type == "paragraph":
            para_fills[int(docx_ref.get("block_index", 0))] = value

    for (ti, ri, ci), value in cell_fills.items():
        try:
            cell = doc.tables[ti].rows[ri].cells[ci]
            _set_cell_text_preserve_format(cell, value)
        except (IndexError, Exception):
            pass

    if para_fills:
        para_counter = 0
        for block in _iter_block_items(doc):
            if isinstance(block, Paragraph):
                if para_counter in para_fills:
                    value = para_fills[para_counter]
                    if block.runs:
                        block.runs[0].text = value
                        for run in block.runs[1:]:
                            run.text = ""
                    else:
                        block.add_run(value)
                para_counter += 1
