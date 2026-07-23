import io

import docx

from django.core.files.base import ContentFile

from documents.models import DocumentCategory, DocumentFile, DocumentTemplate
from documents.utils import generate_visual_pdf
from processes.models import ProcessBinding, ProcessRun, ProcessRunDocument, ProcessType
from processes.utils import (
    _build_document_context,
    _get_system_user,
    apply_docx_fill,
    binding_subject_snapshot,
)
from .models import TrainingType

KIND_OBRAZAC6 = "OBRAZAC6"
KIND_LZO_REVERS = "LZO_REVERS"
KIND_POTVRDA_CLAN5 = "POTVRDA_CLAN5"

KIND_CONFIG = {
    KIND_OBRAZAC6: {
        "role_field": "obrazac6_template",
        "role_fields_field": "obrazac6_fields",
        "template_name": "Obrazac 6 — evidencija o osposobljenosti za bezbedan rad",
        "process_code": "OSPOSOBLJAVANJE_BZR",
        "file_prefix": "obrazac6",
    },
    KIND_LZO_REVERS: {
        "role_field": "lzo_revers_template",
        "role_fields_field": "lzo_revers_fields",
        "template_name": "Karton zaduženja LZO (revers)",
        "process_code": "LZO_ZADUZENJE",
        "file_prefix": "lzo_revers",
    },
    KIND_POTVRDA_CLAN5: {
        "template_name": "Potvrda po članu 5",
        "process_code": "OSPOSOBLJAVANJE_BZR",
        "file_prefix": "potvrda_clan5",
    },
}


def _resolve_blank_file(employee, kind: str, config: dict, training_type_id):
    if kind == KIND_POTVRDA_CLAN5:
        if not training_type_id:
            raise ValueError("Potrebno je izabrati vrstu obuke.")
        training_type = TrainingType.objects.filter(pk=training_type_id).first()
        if not training_type:
            raise ValueError("Vrsta obuke nije pronađena.")
        if not training_type.potvrda_template:
            raise ValueError(
                "Vrsta obuke nema blanko potvrdu — otpremite je na vrsti obuke."
            )
        return training_type.potvrda_template, training_type.potvrda_fields or []

    role = getattr(employee, "job_role", None)
    blank_file = getattr(role, config["role_field"], None) if role else None
    if not role or not blank_file:
        raise ValueError(
            "Radno mesto nema blanko obrazac — otpremite ga na radnom mestu."
        )
    blank_placements = getattr(role, config["role_fields_field"], None) or []
    return blank_file, blank_placements


def generate_employee_document(
    employee, kind: str, training_type_id=None,
) -> tuple[DocumentFile, bytes]:
    config = KIND_CONFIG.get(kind)
    if not config:
        raise ValueError(f"Nepoznat tip obrasca: {kind}")

    if kind in (KIND_OBRAZAC6, KIND_LZO_REVERS):
        blank_file, blank_placements = None, []
    else:
        blank_file, blank_placements = _resolve_blank_file(
            employee, kind, config, training_type_id)

    doc_template = DocumentTemplate.objects.filter(
        name=config["template_name"],
    ).first()
    if not doc_template:
        raise ValueError(f"Šablon dokumenta „{config['template_name']}” nije podešen.")

    process_type = ProcessType.objects.filter(code=config["process_code"]).first()
    if not process_type:
        raise ValueError(f"Vrsta obaveze {config['process_code']} nije podešena.")

    binding = (
        ProcessBinding.objects.filter(employee=employee, process_type=process_type)
        .order_by("-id")
        .first()
    )
    run = None
    if binding:
        run = (
            binding.runs.filter(
                status__in=[ProcessRun.STATUS_PENDING, ProcessRun.STATUS_SENT],
            )
            .order_by("-id")
            .first()
        )
        if not run:
            run = binding.runs.order_by("-id").first()
    if not binding or not run:
        raise ValueError(f"Zaposleni nema obavezu {process_type.name}.")

    snapshot = binding_subject_snapshot(binding)
    context = _build_document_context(run, snapshot)
    if kind == KIND_POTVRDA_CLAN5 and training_type_id:
        training_type = TrainingType.objects.filter(pk=training_type_id).first()
        if training_type:
            context["training"] = {"name": training_type.name}
    generation_config = doc_template.generation_config or {}
    mode = generation_config.get("mode")

    if kind == KIND_OBRAZAC6:
        from .obrazac6 import generate_obrazac6
        content_bytes = generate_obrazac6(
            employee,
            context,
            doc_template.template_file,
            generation_config.get("placeholders") or [],
        )
        extension = "pdf"
    elif kind == KIND_LZO_REVERS:
        from .lzo_revers import generate_lzo_revers
        content_bytes = generate_lzo_revers(employee)
        extension = "docx"
    elif mode == "VISUAL":
        content_bytes = generate_visual_pdf(
            doc_template,
            context,
            blank_file=blank_file,
            blank_placements=blank_placements,
            entity=run,
        )
        extension = "pdf"
    else:
        with blank_file.open("rb") as fh:
            doc = docx.Document(io.BytesIO(fh.read()))
        apply_docx_fill(doc, mode, generation_config, context)
        buf = io.BytesIO()
        doc.save(buf)
        buf.seek(0)
        content_bytes = buf.read()
        extension = "docx"

    system_user = _get_system_user()
    if not system_user:
        raise ValueError("Nema sistemskog korisnika za generisanje dokumenta.")

    category = doc_template.category or DocumentCategory.objects.first()
    if not category:
        raise ValueError("Nema kategorije dokumenata za generisanje.")

    doc_file = DocumentFile(
        category=category,
        title=f"{doc_template.name} – {employee}",
        uploaded_by=system_user,
        valid_from=run.scheduled_for,
        valid_until=run.valid_until,
    )
    file_name = f"{config['file_prefix']}_{employee.id}_{run.id}.{extension}"
    doc_file.file.save(file_name, ContentFile(content_bytes), save=True)
    doc_file.save()

    ProcessRunDocument.objects.create(
        process_run=run,
        document_file=doc_file,
        usage_kind=ProcessRunDocument.USAGE_REPORT,
        generated_by_template=None,
    )

    return doc_file, content_bytes
