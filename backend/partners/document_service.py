from pathlib import Path

from django.conf import settings

from documents.word_engine import render_docx

from .document_contexts import company_document_context, employee_document_context

UPUT_PRETHODNI = "UPUT_PRETHODNI"
UPUT_PERIODICNI = "UPUT_PERIODICNI"
OBRAZAC6 = "OBRAZAC6"
POTVRDA_CLAN5 = "POTVRDA_CLAN5"
LZO_REVERS = "LZO_REVERS"
OBRAZAC1 = "OBRAZAC1"
REGISTAR_RM = "REGISTAR_RM"
AKT_PROCENA_RIZIKA = "AKT_PROCENA_RIZIKA"
PRAVILNIK_BZR = "PRAVILNIK_BZR"
PROGRAM_ZAPOSLENI = "PROGRAM_ZAPOSLENI"
PROGRAM_RUKOVODIOCI = "PROGRAM_RUKOVODIOCI"
PROGRAM_PREDSTAVNICI = "PROGRAM_PREDSTAVNICI"
RAD_OD_KUCE_ANEKS = "RAD_OD_KUCE_ANEKS"
RAD_OD_KUCE_KONTROLNA_LISTA = "RAD_OD_KUCE_KONTROLNA_LISTA"
RAD_OD_KUCE_IZJAVA = "RAD_OD_KUCE_IZJAVA"
RAD_OD_KUCE_TEST = "RAD_OD_KUCE_TEST"
RAD_OD_KUCE_UPUTSTVO = "RAD_OD_KUCE_UPUTSTVO"

MASTER_FILES = {
    UPUT_PRETHODNI: "uput_prethodni.docx",
    UPUT_PERIODICNI: "uput_periodicni.docx",
    OBRAZAC6: "obrazac6_master.docx",
    POTVRDA_CLAN5: "potvrda_clan5_master.docx",
    LZO_REVERS: "lzo_revers_master.docx",
    OBRAZAC1: "obrazac1_master.docx",
    REGISTAR_RM: "registar_rm_master.docx",
    AKT_PROCENA_RIZIKA: "akt_procena_rizika.docx",
    PRAVILNIK_BZR: "pravilnik_bzr.docx",
    PROGRAM_ZAPOSLENI: "program_zaposleni.docx",
    PROGRAM_RUKOVODIOCI: "program_rukovodioci.docx",
    PROGRAM_PREDSTAVNICI: "program_predstavnici.docx",
    RAD_OD_KUCE_ANEKS: "rad_od_kuce_aneks.docx",
    RAD_OD_KUCE_KONTROLNA_LISTA: "rad_od_kuce_kontrolna_lista.docx",
    RAD_OD_KUCE_IZJAVA: "rad_od_kuce_izjava.docx",
    RAD_OD_KUCE_TEST: "rad_od_kuce_test.docx",
    RAD_OD_KUCE_UPUTSTVO: "rad_od_kuce_uputstvo.docx",
}

EMPLOYEE_CODES = (
    UPUT_PRETHODNI, UPUT_PERIODICNI, OBRAZAC6, POTVRDA_CLAN5, LZO_REVERS,
)
COMPANY_CODES = tuple(code for code in MASTER_FILES if code not in EMPLOYEE_CODES)

ROLE_BLANK_FIELDS = {
    OBRAZAC6: "obrazac6_template",
    LZO_REVERS: "lzo_revers_template",
    POTVRDA_CLAN5: "potvrda_clan5_template",
}

UPUT_CODE_BY_PROCESS_TYPE = {
    "PRETHODNI_LEKARSKI": UPUT_PRETHODNI,
    "LEKARSKI_PREGLED": UPUT_PERIODICNI,
}


class DocumentUnavailable(Exception):
    pass


def master_path(code):
    return Path(settings.BASE_DIR) / "master_templates" / MASTER_FILES[code]


def _read_word(field_file):
    if not field_file or not field_file.name.lower().endswith(".docx"):
        return None
    with field_file.open("rb") as handle:
        return handle.read()


def template_bytes(code, employee=None, training_type=None):
    from documents.models import DocumentTemplate

    if code == POTVRDA_CLAN5 and training_type is not None:
        content = _read_word(training_type.potvrda_template)
        if content:
            return content
    role = getattr(employee, "job_role", None) if employee else None
    field = ROLE_BLANK_FIELDS.get(code)
    if role is not None and field:
        content = _read_word(getattr(role, field))
        if content:
            return content
    template = DocumentTemplate.objects.filter(code=code).first()
    if template is not None:
        content = _read_word(template.template_file)
        if content:
            return content
    path = master_path(code)
    if not path.is_file():
        raise DocumentUnavailable(f"Šablon {code} nije podešen.")
    return path.read_bytes()


def render_employee_document(code, employee, run=None, training_type=None):
    context = employee_document_context(employee, run=run, training_type=training_type)
    return render_docx(template_bytes(code, employee, training_type), context)


def render_company_document(code, company):
    context = company_document_context(company)
    return render_docx(template_bytes(code), context)
