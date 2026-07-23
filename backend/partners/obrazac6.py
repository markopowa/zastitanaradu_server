import io
from pathlib import Path

import docx

from documents.utils import fill_pdf_at_coordinates

CELL_MAP = [
    ("Naziv radnog mesta", "role_name"),
    ("Opis poslova na tom radnom mestu", "role_description"),
    ("Slučaj, odnosno razlog", "razlog"),
    ("Opasnosti, odnosno štetnosti", "opasnosti"),
    ("Konkretne mere", "mere"),
]


def build_obrazac6_data(employee):
    role = getattr(employee, "job_role", None)
    hazards = list(role.hazards.select_related("hazard").all()) if role else []
    opasnosti = "\n".join(
        f"{i}. {h.hazard.label}" for i, h in enumerate(hazards, 1))
    mere = "\n".join(
        f"{i}. {h.mere}" for i, h in enumerate(hazards, 1) if (h.mere or "").strip())
    lzo = list(role.lzo_items.all()) if role else []
    return {
        "role_name": role.name if role else "",
        "role_description": (getattr(role, "description", "") or "") if role else "",
        "razlog": "01",
        "opasnosti": opasnosti,
        "mere": mere,
        "lzo": lzo,
    }


def _set_cell(cell, text):
    for p in list(cell.paragraphs):
        for r in list(p.runs):
            r._element.getparent().remove(r._element)
    lines = (text or "").split("\n")
    p0 = cell.paragraphs[0]
    p0.add_run(lines[0])
    for line in lines[1:]:
        para = cell.add_paragraph()
        para.add_run(line)


def _fill_cells(doc, data):
    for table in doc.tables:
        for row in table.rows:
            label = (row.cells[0].text or "").strip()
            for prefix, key in CELL_MAP:
                if label.startswith(prefix):
                    for idx in range(2, len(row.cells)):
                        _set_cell(row.cells[idx], data[key])
                    break
        _fill_lzo_rows(table, data.get("lzo") or [])


def _fill_lzo_rows(table, lzo):
    if not lzo:
        return
    rows = table.rows
    start = end = None
    for i, row in enumerate(rows):
        label = (row.cells[0].text or "").strip()
        if label.startswith("Naziv lične zaštitne opreme"):
            start = i + 1
        elif start is not None and label.startswith("Opasnosti"):
            end = i
            break
    if start is None:
        return
    if end is None:
        end = len(rows)
    slots = rows[start:end]
    for item, row in zip(lzo, slots):
        _set_cell(row.cells[0], getattr(item, "name", "") or "")


def generate_obrazac6(employee, context, template_file, placements) -> bytes:
    data = build_obrazac6_data(employee)
    with template_file.open("rb") as fh:
        doc = docx.Document(io.BytesIO(fh.read()))
    _fill_cells(doc, data)
    import tempfile
    tmp = Path(tempfile.mkdtemp()) / "obrazac6.docx"
    doc.save(str(tmp))
    return fill_pdf_at_coordinates(tmp, placements or [], context)
