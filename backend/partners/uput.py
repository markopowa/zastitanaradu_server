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


def _fmt_date(value):
    if value is None:
        return ""
    try:
        return value.strftime("%d.%m.%Y.")
    except Exception:
        return str(value)


def _full_name(employee):
    parts = [
        getattr(employee, "first_name", "") or "",
        getattr(employee, "last_name", "") or "",
    ]
    return " ".join(p for p in parts if p).strip()


def _position_name(employee, role):
    high_risk = getattr(employee, "high_risk_position_name", "") or ""
    if high_risk:
        return high_risk
    if role is not None:
        return getattr(role, "name", "") or ""
    return ""


def _hazard_labels(role):
    if role is None:
        return []
    try:
        items = list(role.hazards.select_related("hazard").all())
    except Exception:
        return []
    labels = []
    for item in items:
        hazard = getattr(item, "hazard", None)
        label = getattr(hazard, "label", "") if hazard is not None else ""
        if label:
            labels.append(label)
    return labels


def generate_uput(employee, kind="periodicni", performed_on=None) -> bytes:
    role = getattr(employee, "job_role", None)
    company = getattr(employee, "client_company", None)

    is_prethodni = kind == "prethodni"
    vrsta_pregleda = "prethodni" if is_prethodni else "periodični"

    doc = new_doc()

    if company is not None:
        company_header(doc, company)
    spacer(doc)

    if is_prethodni:
        title(doc, "UPUT ZA PRETHODNI LEKARSKI PREGLED")
    else:
        title(doc, "UPUT ZA PERIODIČNI LEKARSKI PREGLED")
    subtitle(
        doc,
        "za radno mesto sa povećanim rizikom, u skladu sa Zakonom o bezbednosti i "
        "zdravlju na radu (Sl. glasnik RS, br. 35/2023) i Pravilnikom o prethodnim "
        "i periodičnim lekarskim pregledima zaposlenih na radnim mestima sa "
        "povećanim rizikom",
    )
    spacer(doc)

    company_name = getattr(company, "name", "") if company is not None else ""
    full_name = _full_name(employee)
    date_of_birth = _fmt_date(getattr(employee, "date_of_birth", None))
    place_of_birth = getattr(employee, "place_of_birth", "") or ""
    national_id = getattr(employee, "national_id", "") or ""
    occupation = getattr(employee, "occupation", "") or ""
    position = _position_name(employee, role)

    para(
        doc,
        "Poslodavac "
        + (company_name or "______________________")
        + " upućuje zaposlenog "
        + (full_name or "______________________")
        + ", rođen(a) "
        + (date_of_birth or "______________")
        + " u mestu "
        + (place_of_birth or "______________")
        + ", JMBG "
        + (national_id or "______________")
        + ", po zanimanju "
        + (occupation or "______________")
        + ", na "
        + vrsta_pregleda
        + " lekarski pregled za radno mesto sa povećanim rizikom "
        + (position or "______________________")
        + ".",
    )
    spacer(doc)

    heading(doc, "Podaci o zaposlenom")
    para(doc, "Ime i prezime: " + (full_name or "______________________"))
    para(doc, "Datum rođenja: " + (date_of_birth or "______________"))
    para(doc, "Mesto rođenja: " + (place_of_birth or "______________"))
    para(doc, "JMBG: " + (national_id or "______________"))
    para(doc, "Zanimanje: " + (occupation or "______________"))
    spacer(doc)

    heading(doc, "Podaci o radnom mestu")
    para(doc, "Radno mesto sa povećanim rizikom: " + (position or "______________________"))
    role_description = getattr(role, "description", "") if role is not None else ""
    if role_description:
        para(doc, "Opis poslova: " + role_description)
    para(
        doc,
        "Povećani rizik na navedenom radnom mestu utvrđen je Aktom o proceni rizika "
        "poslodavca.",
    )
    spacer(doc)

    heading(doc, "Opasnosti i štetnosti na radnom mestu")
    hazards = _hazard_labels(role)
    if hazards:
        para(doc, "Zaposleni je na radnom mestu izložen sledećim opasnostima i štetnostima:")
        for label in hazards:
            bullet(doc, label)
    else:
        para(
            doc,
            "Opasnosti i štetnosti za navedeno radno mesto nisu unete u evidenciju.",
        )
    spacer(doc)

    heading(doc, "Podaci o uputu")
    para(doc, "Broj uputa: ______________")
    para(doc, "Datum: ______________")
    para(doc, "Zdravstvena ustanova: ______________________________________________")
    spacer(doc)

    para(
        doc,
        "Zdravstvena ustanova se moli da izvrši "
        + vrsta_pregleda
        + " lekarski pregled zaposlenog i dostavi izveštaj o oceni radne sposobnosti "
        "za navedeno radno mesto.",
    )
    spacer(doc)

    signatures(doc, left="Lice za bezbednost i zdravlje na radu", right="Poslodavac")

    return finalize(doc)
