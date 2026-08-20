import logging
import re
import shutil
import tempfile
from pathlib import Path

import docx
import fitz
from docx.enum.text import WD_COLOR_INDEX
from docx.oxml.ns import qn

from .utils import (
    _copy_run_format,
    _iter_table_paragraphs,
    _path_str,
    convert_document_to_pdf,
)

logger = logging.getLogger(__name__)

TAG_RE = re.compile(r"\{\{\s*([^{}]+?)\s*\}\}")

MIN_FONT_SIZE = 6.0
MAX_FONT_SIZE = 48.0


def _paragraph_tag_keys(paragraph) -> list[str]:
    return TAG_RE.findall(paragraph.text or "")


def _iter_table_rows(document: docx.Document):
    for table_index, table in enumerate(document.tables):
        for row_index, row in enumerate(table.rows):
            yield table_index, row_index, row


def _unique_row_cells(row) -> list[tuple[int, object]]:
    """python-docx repeats the same underlying cell object for every column
    a horizontally merged cell spans, so a naive `enumerate(row.cells)`
    would count one physical (merged) cell's tag once per spanned column.
    Keep only the first column index for each distinct cell."""
    seen_tc_ids: set[int] = set()
    unique: list[tuple[int, object]] = []
    for col_index, cell in enumerate(row.cells):
        tc_id = id(cell._tc)
        if tc_id in seen_tc_ids:
            continue
        seen_tc_ids.add(tc_id)
        unique.append((col_index, cell))
    return unique


def _row_tag_cells(row) -> list[tuple[int, str]]:
    cells = []
    for col_index, cell in _unique_row_cells(row):
        keys = TAG_RE.findall(cell.text or "")
        if keys:
            cells.append((col_index, keys[0]))
    return cells


def _calibration_marker(index: int) -> str:
    return f"PZ{index:04d}"


def _series_row_id_set(plan: dict) -> set[tuple[int, int]]:
    return {(s["table"], s["row"]) for s in plan["series_rows"]}


def _rebuild_paragraph_with_calibration_markers(
    para,
    keys_out: list[str],
    marker_index: list[int],
) -> bool:
    text = para.text or ""
    if "{{" not in text:
        return False
    matches = list(TAG_RE.finditer(text))
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
        key = match.group(1).strip()
        marker = _calibration_marker(marker_index[0])
        marker_index[0] += 1
        keys_out.append(key)
        badge_run = para.add_run(f" {marker} ")
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


def _replace_cell_with_calibration_marker(cell, marker: str) -> None:
    for para in cell.paragraphs:
        para.clear()
    para = cell.paragraphs[0]
    badge_run = para.add_run(f" {marker} ")
    badge_run.font.bold = True
    badge_run.font.highlight_color = WD_COLOR_INDEX.BRIGHT_GREEN


def make_calibration_copy(original_path: Path) -> tuple[Path, list[str], list[dict]]:
    document = docx.Document(_path_str(original_path))
    plan = extract_tag_plan(document)
    series_row_ids = _series_row_id_set(plan)
    occurrence_keys: list[str] = []
    marker_index = [0]

    for para in document.paragraphs:
        _rebuild_paragraph_with_calibration_markers(
            para, occurrence_keys, marker_index)

    for table_index, row_index, row in _iter_table_rows(document):
        if (table_index, row_index) in series_row_ids:
            continue
        for _col_index, cell in _unique_row_cells(row):
            for para in cell.paragraphs:
                _rebuild_paragraph_with_calibration_markers(
                    para, occurrence_keys, marker_index)
            for nested_table in cell.tables:
                for para in _iter_table_paragraphs(nested_table):
                    _rebuild_paragraph_with_calibration_markers(
                        para, occurrence_keys, marker_index)

    series_specs: list[dict] = []
    for series in plan["series_rows"]:
        table = document.tables[series["table"]]
        row = table.rows[series["row"]]
        columns: list[tuple[str, str]] = []
        for col_index, key in series["columns"]:
            marker = _calibration_marker(marker_index[0])
            marker_index[0] += 1
            _replace_cell_with_calibration_marker(row.cells[col_index], marker)
            columns.append((key, marker))
        series_specs.append({
            "table": series["table"],
            "columns": columns,
        })

    tmp_dir = Path(tempfile.mkdtemp(prefix="template_calibration_"))
    tmp_path = tmp_dir / original_path.name
    document.save(_path_str(tmp_path))
    return tmp_path, occurrence_keys, series_specs


def _search_unique_marker(
    pdf_doc: fitz.Document,
    marker: str,
) -> tuple[int, fitz.Rect] | None:
    hits = _search_label_all_pages(pdf_doc, marker)
    if not hits:
        return None
    if len(hits) > 1:
        hits.sort(key=lambda item: (item[0], item[1].y0, item[1].x0))
    return hits[0]


def extract_tag_plan(document: docx.Document) -> dict:
    """Walk the document in reading order and split tag occurrences into
    two groups: series rows (a table row where at least one cell holds an
    ``r.*`` tag — one placeholder is derived per row) and everything else
    (one occurrence per tag, duplicates included, in reading order)."""
    series_rows = []
    series_row_ids = set()
    for table_index, row_index, row in _iter_table_rows(document):
        cells = _row_tag_cells(row)
        if cells and any(key.startswith("r.") for _, key in cells):
            series_rows.append({
                "table": table_index,
                "row": row_index,
                "columns": cells,
            })
            series_row_ids.add((table_index, row_index))

    occurrences: list[str] = []
    for para in document.paragraphs:
        occurrences.extend(_paragraph_tag_keys(para))
    for table_index, row_index, row in _iter_table_rows(document):
        if (table_index, row_index) in series_row_ids:
            continue
        for _col_index, cell in _unique_row_cells(row):
            for para in cell.paragraphs:
                occurrences.extend(_paragraph_tag_keys(para))
            for nested_table in cell.tables:
                for para in _iter_table_paragraphs(nested_table):
                    occurrences.extend(_paragraph_tag_keys(para))

    return {"occurrences": occurrences, "series_rows": series_rows}


def has_tags(document: docx.Document) -> bool:
    plan = extract_tag_plan(document)
    return bool(plan["occurrences"] or plan["series_rows"])


def _search_label_all_pages(pdf_doc: fitz.Document, label: str) -> list[tuple[int, fitz.Rect]]:
    results = []
    for page_num in range(len(pdf_doc)):
        page = pdf_doc[page_num]
        for rect in page.search_for(label):
            results.append((page_num, rect))
    return results


def _font_size_from_rect_height(height_pt: float) -> float:
    size = round(height_pt / 1.15, 1)
    return max(MIN_FONT_SIZE, min(MAX_FONT_SIZE, size))


def _placement_from_rect(field_key: str, page_num: int, rect: fitz.Rect, page_rect: fitz.Rect) -> dict:
    return {
        "fieldKey": field_key,
        "page": page_num,
        "xPct": round(rect.x0 / page_rect.width * 100, 2),
        "yPct": round(rect.y0 / page_rect.height * 100, 2),
        "widthPct": round(rect.width / page_rect.width * 100, 2),
        "heightPct": round(rect.height / page_rect.height * 100, 2),
        "fontSize": _font_size_from_rect_height(rect.height),
    }


def derive_placements(
    original_path: Path,
    series_source_map: dict | None = None,
    catalog: dict | None = None,
) -> tuple[list[dict], list[str]]:
    document = docx.Document(_path_str(original_path))
    plan = extract_tag_plan(document)
    warnings: list[str] = []
    if not plan["occurrences"] and not plan["series_rows"]:
        return [], warnings

    calibration_path, occurrence_keys, series_specs = make_calibration_copy(
        original_path)
    if occurrence_keys != plan["occurrences"]:
        warnings.append(
            f"{original_path.name}: calibration key order mismatch "
            f"({len(occurrence_keys)} vs {len(plan['occurrences'])})."
        )

    try:
        pdf_path = convert_document_to_pdf(calibration_path)
        pdf_doc = fitz.open(_path_str(pdf_path))
        try:
            placeholders: list[dict] = []

            for idx, key in enumerate(occurrence_keys):
                marker = _calibration_marker(idx)
                hit = _search_unique_marker(pdf_doc, marker)
                if hit is None:
                    warnings.append(
                        f"{original_path.name}: could not locate marker "
                        f"'{marker}' for tag '{key}'."
                    )
                    continue
                page_num, rect = hit
                placeholders.append(_placement_from_rect(
                    key, page_num, rect, pdf_doc[page_num].rect))

            for series in series_specs:
                col_hits = []
                for key, marker in series["columns"]:
                    hit = _search_unique_marker(pdf_doc, marker)
                    if hit is None:
                        warnings.append(
                            f"{original_path.name}: could not locate series "
                            f"marker '{marker}' for column '{key}'."
                        )
                        continue
                    page_num, rect = hit
                    col_hits.append((key, page_num, rect))
                if not col_hits:
                    continue
                page_num_used = col_hits[0][1]
                page_rect = pdf_doc[page_num_used].rect
                y0 = min(rect.y0 for _key, _p, rect in col_hits)
                row_height = max(rect.height for _key, _p, rect in col_hits)
                columns = [
                    {
                        "field": key,
                        "xPct": round(rect.x0 / page_rect.width * 100, 2),
                        "widthPct": round(rect.width / page_rect.width * 100, 2),
                    }
                    for key, _p, rect in col_hits
                ]
                source = (series_source_map or {}).get(series["table"], "")
                placeholders.append({
                    "seriesSource": source,
                    "page": page_num_used,
                    "yPct": round(y0 / page_rect.height * 100, 2),
                    "rowHeightPct": round(row_height / page_rect.height * 100, 2),
                    "fontSize": _font_size_from_rect_height(row_height),
                    "columns": columns,
                })

            return placeholders, warnings
        finally:
            pdf_doc.close()
    finally:
        shutil.rmtree(_path_str(calibration_path.parent), ignore_errors=True)


def _replace_paragraph_text_preserve_format(para, new_text: str) -> None:
    base_rpr = None
    if para.runs:
        base_rpr = para.runs[0]._element.find(qn("w:rPr"))
    para.clear()
    if new_text:
        run = para.add_run(new_text)
        _copy_run_format(run, base_rpr)


def strip_tags_from_docx(path: Path) -> bool:
    """Remove every `{{ ... }}` tag from `path`'s paragraphs (top-level and
    inside tables, recursively), saving the file in place. Returns True if
    anything changed."""
    document = docx.Document(_path_str(path))
    changed = False

    def _strip_paragraph(para) -> None:
        nonlocal changed
        text = para.text or ""
        if "{{" not in text:
            return
        new_text = TAG_RE.sub("", text)
        if new_text != text:
            changed = True
            _replace_paragraph_text_preserve_format(para, new_text)

    for para in document.paragraphs:
        _strip_paragraph(para)
    for table in document.tables:
        for para in _iter_table_paragraphs(table):
            _strip_paragraph(para)

    if changed:
        document.save(_path_str(path))
    return changed
