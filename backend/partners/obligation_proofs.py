import os

from django.db import transaction
from django.utils import timezone

from documents.models import DocumentCategory, DocumentFile
from processes.dates import add_months
from processes.models import ProcessBinding, ProcessRun, ProcessRunDocument, ProcessType
from processes.period_resolution import resolve_period_months
from processes.process_run_completion import apply_process_run_completion
from processes.tasks import ensure_process_run_for_binding, get_open_run_for_binding

from .obligation_rules import is_required


class ProofError(Exception):
    pass


def _subject_filter(subject):
    from .models import ClientCompany, Employee, EquipmentItem

    if isinstance(subject, Employee):
        return ProcessBinding.SUBJECT_EMPLOYEE, {"employee": subject}
    if isinstance(subject, EquipmentItem):
        return ProcessBinding.SUBJECT_EQUIPMENT, {"equipment_item": subject}
    if isinstance(subject, ClientCompany):
        return ProcessBinding.SUBJECT_CLIENT_COMPANY, {"client_company": subject}
    raise ProofError("Nepoznat subjekt obaveze.")


def _binding_for(process_type, subject, performed_at):
    subject_kind, lookup = _subject_filter(subject)
    bindings = ProcessBinding.objects.filter(
        process_type=process_type, subject_kind=subject_kind, **lookup)
    binding = bindings.filter(is_active=True).order_by("-id").first()
    if binding is None:
        binding = bindings.order_by("-id").first()
        if binding is not None:
            binding.is_active = True
            binding.save(update_fields=["is_active"])
    if binding is None:
        binding = ProcessBinding.objects.create(
            process_type=process_type,
            subject_kind=subject_kind,
            is_active=True,
            next_run_at=performed_at,
            **lookup,
        )
    if binding.next_run_at is None:
        binding.next_run_at = performed_at
        binding.save(update_fields=["next_run_at"])
    return binding


def _attach(run, uploaded, user):
    category = DocumentCategory.objects.order_by("id").first()
    if category is None:
        raise ProofError("Nema kategorije dokumenata.")
    doc_file = DocumentFile(
        category=category,
        title=os.path.splitext(uploaded.name)[0],
        uploaded_by=user,
        valid_from=run.performed_at,
        valid_until=run.valid_until,
    )
    doc_file.file = uploaded
    doc_file.save()
    ProcessRunDocument.objects.create(
        process_run=run,
        document_file=doc_file,
        usage_kind=ProcessRunDocument.USAGE_REPORT,
    )


def record_proof(process_type, subject, *, performed_at, valid_until=None,
                 uploaded=None, user=None, notes=""):
    with transaction.atomic():
        binding = _binding_for(process_type, subject, performed_at)
        run = get_open_run_for_binding(binding) or ensure_process_run_for_binding(
            binding)
        if run is None:
            raise ProofError("Obaveza nije aktivna.")
        if valid_until is None:
            period = binding.custom_period_months or resolve_period_months(
                process_type, subject)
            valid_until = add_months(performed_at, period) if period else None
        apply_process_run_completion(
            run,
            {
                "performed_at": performed_at,
                "valid_until": valid_until,
                "notes": notes,
            },
            user=user,
        )
        if uploaded is not None:
            if user is None:
                raise ProofError("Nepoznat korisnik za prilog.")
            _attach(run, uploaded, user)
        binding.refresh_from_db()
        ensure_process_run_for_binding(binding)
    return run


def _latest_completed(binding):
    if binding is None:
        return None
    return (
        ProcessRun.objects.filter(
            process_binding=binding,
            status=ProcessRun.STATUS_COMPLETED,
        )
        .order_by("-performed_at", "-id")
        .first()
    )


def _document_of(run, request):
    if run is None:
        return None, ""
    prd = (
        run.documents.select_related("document_file")
        .order_by("-id")
        .first()
    )
    if prd is None or not prd.document_file.file:
        return None, ""
    url = prd.document_file.file.url
    if request is not None:
        url = request.build_absolute_uri(url)
    return url, prd.document_file.title


def company_obligation_rows(company, request=None):
    from .obligation_plan import STATUS_MISSING, _binding_status

    today = timezone.localdate()
    types = ProcessType.objects.filter(
        is_active=True,
        shape=ProcessType.SHAPE_PERIODIC,
        subject_kind=ProcessType.SUBJECT_CLIENT_COMPANY,
    ).order_by("name")
    rows = []
    for pt in types:
        binding = (
            ProcessBinding.objects.filter(
                process_type=pt,
                subject_kind=ProcessBinding.SUBJECT_CLIENT_COMPANY,
                client_company=company,
                is_active=True,
            )
            .order_by("-id")
            .first()
        )
        if binding is None and not is_required(pt, company):
            continue
        last = _latest_completed(binding)
        document_url, document_name = _document_of(last, request)
        rows.append({
            "process_type": pt.id,
            "process_type_name": pt.name,
            "process_type_code": pt.code,
            "period_months": resolve_period_months(pt, company),
            "binding": binding.id if binding else None,
            "performed_at": last.performed_at if last else None,
            "valid_until": last.valid_until if last else None,
            "document_url": document_url,
            "document_name": document_name,
            "status": (
                _binding_status(binding, today) if binding else STATUS_MISSING
            ),
        })
    return rows


def complete_obligation_for_training(training, user=None):
    process_type = training.training_type.process_type
    if process_type is None or training.completed_at is None:
        return None
    employee = training.employee
    already_newer = ProcessRun.objects.filter(
        process_binding__employee=employee,
        process_binding__process_type=process_type,
        status=ProcessRun.STATUS_COMPLETED,
        performed_at__gte=training.completed_at,
    ).exists()
    if already_newer:
        return None
    return record_proof(
        process_type,
        employee,
        performed_at=training.completed_at,
        valid_until=training.valid_until,
        user=user,
        notes=f"Obuka: {training.training_type.name}",
    )
