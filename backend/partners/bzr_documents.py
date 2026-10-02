from .document_service import (
    PRAVILNIK_BZR,
    PROGRAM_PREDSTAVNICI,
    PROGRAM_RUKOVODIOCI,
    PROGRAM_ZAPOSLENI,
    RAD_OD_KUCE_ANEKS,
    RAD_OD_KUCE_IZJAVA,
    RAD_OD_KUCE_KONTROLNA_LISTA,
    RAD_OD_KUCE_TEST,
    RAD_OD_KUCE_UPUTSTVO,
    render_company_document,
)

BZR_DOCUMENTS = [
    ("pravilnik", "Pravilnik o bezbednosti i zdravlju na radu",
     PRAVILNIK_BZR, "pravilnik_bzr"),
    ("program_zaposleni", "Program obuke zaposlenih",
     PROGRAM_ZAPOSLENI, "program_obuke_zaposleni"),
    ("program_rukovodioci", "Program obuke rukovodilaca",
     PROGRAM_RUKOVODIOCI, "program_obuke_rukovodioci"),
    ("program_predstavnici", "Program obuke predstavnika zaposlenih",
     PROGRAM_PREDSTAVNICI, "program_obuke_predstavnici"),
    ("rok_aneks", "Rad od kuće: Aneks ugovora o radu",
     RAD_OD_KUCE_ANEKS, "rad_od_kuce_aneks"),
    ("rok_kontrolna_lista", "Rad od kuće: Kontrolna lista",
     RAD_OD_KUCE_KONTROLNA_LISTA, "rad_od_kuce_kontrolna_lista"),
    ("rok_izjava", "Rad od kuće: Izjava zaposlenog",
     RAD_OD_KUCE_IZJAVA, "rad_od_kuce_izjava"),
    ("rok_test", "Rad od kuće: Test osposobljenosti",
     RAD_OD_KUCE_TEST, "rad_od_kuce_test"),
    ("rok_uputstvo", "Rad od kuće: Uputstvo za bezbedan rad",
     RAD_OD_KUCE_UPUTSTVO, "rad_od_kuce_uputstvo"),
]

BZR_MAP = {kind: (label, code, fname) for kind, label, code, fname in BZR_DOCUMENTS}


def bzr_document_catalog():
    return [{"kind": kind, "label": label} for kind, label, _, _ in BZR_DOCUMENTS]


def generate_bzr_document(kind, company):
    entry = BZR_MAP.get(kind)
    if not entry:
        return None, None
    _, code, fname = entry
    return render_company_document(code, company), fname
