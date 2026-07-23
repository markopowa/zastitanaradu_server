def _pravilnik(company):
    from .bzr_pravilnik import generate_pravilnik
    return generate_pravilnik(company)


def _program(kind):
    def gen(company):
        from .bzr_programi import generate_program
        return generate_program(company, kind)
    return gen


def _rok(kind):
    def gen(company):
        from .bzr_rad_od_kuce import generate_rad_od_kuce
        return generate_rad_od_kuce(company, kind)
    return gen


BZR_DOCUMENTS = [
    ("pravilnik", "Pravilnik o bezbednosti i zdravlju na radu",
     _pravilnik, "pravilnik_bzr"),
    ("program_zaposleni", "Program osposobljavanja (zaposleni)",
     _program("zaposleni"), "program_osposobljavanja_zaposleni"),
    ("program_rukovodioci", "Program osposobljavanja (rukovodioci)",
     _program("rukovodioci"), "program_osposobljavanja_rukovodioci"),
    ("program_predstavnici",
     "Program osposobljavanja (predstavnici zaposlenih)",
     _program("predstavnici"), "program_osposobljavanja_predstavnici"),
    ("rok_aneks", "Rad od kuće: Aneks ugovora o radu",
     _rok("aneks"), "rad_od_kuce_aneks"),
    ("rok_kontrolna_lista", "Rad od kuće: Kontrolna lista",
     _rok("kontrolna_lista"), "rad_od_kuce_kontrolna_lista"),
    ("rok_izjava", "Rad od kuće: Izjava zaposlenog",
     _rok("izjava"), "rad_od_kuce_izjava"),
    ("rok_test", "Rad od kuće: Test osposobljenosti",
     _rok("test"), "rad_od_kuce_test"),
    ("rok_uputstvo", "Rad od kuće: Uputstvo za bezbedan rad",
     _rok("uputstvo"), "rad_od_kuce_uputstvo"),
]

BZR_MAP = {
    kind: (label, fn, fname)
    for kind, label, fn, fname in BZR_DOCUMENTS
}


def bzr_document_catalog():
    return [{"kind": kind, "label": label}
            for kind, label, _, _ in BZR_DOCUMENTS]


def generate_bzr_document(kind, company):
    entry = BZR_MAP.get(kind)
    if not entry:
        return None, None
    label, fn, fname = entry
    return fn(company), fname
