import docx

from .bzr_docx_common import (
    new_doc,
    title,
    subtitle,
    heading,
    para,
    bullet,
    numbered,
    spacer,
    company_header,
    signatures,
    director_name,
    finalize,
)


def generate_lzo_revers(employee) -> bytes:
    doc = new_doc()

    company = getattr(employee, "client_company", None)
    if company is not None:
        company_header(doc, company)
        spacer(doc)

    title(doc, "KARTON ZADUŽENJA LIČNOM ZAŠTITNOM OPREMOM")
    subtitle(doc, "(revers)")
    spacer(doc)

    first_name = getattr(employee, "first_name", "") or ""
    last_name = getattr(employee, "last_name", "") or ""
    full_name = " ".join(part for part in [first_name, last_name] if part).strip()
    national_id = getattr(employee, "national_id", "") or ""

    role = getattr(employee, "job_role", None)
    role_name = getattr(role, "name", "") if role is not None else ""

    para(
        doc,
        "Zaposleni {name}, JMBG {jmbg}, radno mesto {role}.".format(
            name=full_name or "(nije uneto)",
            jmbg=national_id or "(nije uneto)",
            role=role_name or "(nije uneto)",
        ),
    )
    spacer(doc)

    if role is not None:
        lzo_items = list(role.lzo_items.all())
    else:
        lzo_items = []

    if lzo_items:
        headers = [
            "Redni broj",
            "Naziv sredstva i opreme LZO",
            "Standard (SRPS EN)",
            "Rok upotrebe (meseci)",
            "Datum zaduženja",
            "Potpis",
        ]
        table = doc.add_table(rows=1, cols=len(headers))
        table.style = "Table Grid"
        header_cells = table.rows[0].cells
        for cell, text in zip(header_cells, headers):
            cell.text = ""
            run = cell.paragraphs[0].add_run(text)
            run.bold = True

        for index, item in enumerate(lzo_items, start=1):
            name = getattr(item, "name", "") or ""
            standard = getattr(item, "standard", "") or ""
            interval_months = getattr(item, "interval_months", None)
            interval_text = str(interval_months) if interval_months is not None else ""

            row_cells = table.add_row().cells
            row_cells[0].text = str(index)
            row_cells[1].text = name
            row_cells[2].text = standard
            row_cells[3].text = interval_text
            row_cells[4].text = ""
            row_cells[5].text = ""
    else:
        para(
            doc,
            "Za ovo radno mesto nije propisana lična zaštitna oprema.",
        )

    spacer(doc)
    para(
        doc,
        "Lična zaštitna oprema propisana je Aktom o proceni rizika "
        "na radnom mestu i u radnoj okolini.",
    )

    signatures(
        doc,
        left="Zaposleni (potpis)",
        right="Lice za bezbednost i zdravlje na radu",
    )

    return finalize(doc)
