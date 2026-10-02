from django.core.files.base import ContentFile

from documents.models import DocumentCategory, DocumentFile, DocumentTemplate
from documents.word_engine import TemplateError
from processes.models import ProcessBinding, ProcessRun, ProcessRunDocument, ProcessType
from processes.utils import _get_system_user

from .document_service import (
    LZO_REVERS,
    OBRAZAC6,
    POTVRDA_CLAN5,
    DocumentUnavailable,
    render_employee_document,
)
from .models import TrainingType

KIND_OBRAZAC6 = OBRAZAC6
KIND_LZO_REVERS = LZO_REVERS
KIND_POTVRDA_CLAN5 = POTVRDA_CLAN5

PROCESS_CODES = {
    OBRAZAC6: "OSPOSOBLJAVANJE_BZR",
    LZO_REVERS: "LZO_ZADUZENJE",
    POTVRDA_CLAN5: "OSPOSOBLJAVANJE_BZR",
}

TITLES = {
    OBRAZAC6: "Obrazac 6",
    LZO_REVERS: "Karton zaduženja LZO",
    POTVRDA_CLAN5: "Potvrda o osposobljenosti",
}

FILE_PREFIXES = {
    OBRAZAC6: "obrazac6",
    LZO_REVERS: "lzo_revers",
    POTVRDA_CLAN5: "potvrda",
}


def _training_type(training_type_id):
    if not training_type_id:
        raise ValueError("Potrebno je izabrati vrstu obuke.")
    training_type = TrainingType.objects.filter(pk=training_type_id).first()
    if training_type is None:
        raise ValueError("Vrsta obuke nije pronađena.")
    return training_type


def _run_for(employee, process_type):
    binding = (
        ProcessBinding.objects.filter(employee=employee, process_type=process_type)
        .order_by("-is_active", "-id")
        .first()
    )
    if binding is None:
        return None
    completed = (
        binding.runs.filter(status=ProcessRun.STATUS_COMPLETED)
        .order_by("-performed_at", "-id")
        .first()
    )
    return completed or binding.runs.order_by("-id").first()


def generate_employee_document(
    employee, kind: str, training_type_id=None,
) -> tuple[DocumentFile, bytes]:
    if kind not in PROCESS_CODES:
        raise ValueError(f"Nepoznat tip obrasca: {kind}")

    training_type = None
    process_type = None
    if kind == POTVRDA_CLAN5:
        training_type = _training_type(training_type_id)
        process_type = training_type.process_type
    if process_type is None:
        process_type = ProcessType.objects.filter(code=PROCESS_CODES[kind]).first()
    if process_type is None:
        raise ValueError(f"Vrsta obaveze {PROCESS_CODES[kind]} nije podešena.")

    run = _run_for(employee, process_type)
    if run is None:
        raise ValueError(f"Zaposleni nema obavezu {process_type.name}.")

    try:
        content_bytes = render_employee_document(
            kind, employee, run=run, training_type=training_type)
    except (DocumentUnavailable, TemplateError) as exc:
        raise ValueError(str(exc)) from exc

    system_user = _get_system_user()
    if not system_user:
        raise ValueError("Nema sistemskog korisnika za generisanje dokumenta.")

    template = DocumentTemplate.objects.filter(code=kind).first()
    category = (template.category if template else None) or (
        DocumentCategory.objects.first())
    if not category:
        raise ValueError("Nema kategorije dokumenata za generisanje.")

    doc_file = DocumentFile(
        category=category,
        title=f"{TITLES[kind]}, {employee}",
        uploaded_by=system_user,
        valid_from=run.performed_at or run.scheduled_for,
        valid_until=run.valid_until,
    )
    slug = f"{employee.last_name}_{employee.first_name}".replace(" ", "_")
    file_name = f"{FILE_PREFIXES[kind]}_{slug}.docx"
    doc_file.file.save(file_name, ContentFile(content_bytes), save=True)

    ProcessRunDocument.objects.create(
        process_run=run,
        document_file=doc_file,
        usage_kind=ProcessRunDocument.USAGE_CERTIFICATE,
        generated_by_template=None,
    )

    return doc_file, content_bytes
