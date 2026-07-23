from pathlib import Path

from django.conf import settings
from django.db.models import Q

from .models import (
    ClientCompany,
    CompanyComplianceFinding,
    CompanyDocument,
    CompanyDocumentKind,
    RiskAssessmentAct,
)


def _supported_suffixes():
    return {".pdf"} | set(settings.DOCUMENT_CONVERTIBLE_SUFFIXES)


def _check_field(field, supported, paths, skipped):
    if not field:
        skipped[0] += 1
        return
    path = Path(field.path)
    if not path.exists():
        skipped[0] += 1
        return
    if path.suffix.lower() not in supported:
        skipped[0] += 1
        return
    paths.append(path)


def _company_documents(company, supported, paths, skipped):
    documents = list(
        CompanyDocument.objects.filter(client_company=company)
    )
    kind_order = dict(
        CompanyDocumentKind.objects.values_list("code", "order")
    )
    documents.sort(key=lambda d: kind_order.get(d.kind, 10_000))
    for document in documents:
        _check_field(document.file, supported, paths, skipped)


def _risk_assessment_act(company, supported, paths, skipped):
    try:
        act = company.risk_assessment_act
    except RiskAssessmentAct.DoesNotExist:
        return
    for section in act.sections.order_by("order"):
        _check_field(section.current_file, supported, paths, skipped)
    for amendment in act.amendments.order_by("uploaded_at"):
        _check_field(amendment.file, supported, paths, skipped)


def _compliance_findings(company, supported, paths, skipped):
    findings = CompanyComplianceFinding.objects.filter(
        client_company=company,
    ).order_by("finding_type__order")
    for finding in findings:
        _check_field(finding.file, supported, paths, skipped)


def _generated_documents(company, supported, paths, skipped):
    from processes.models import ProcessRunDocument

    prds = (
        ProcessRunDocument.objects.filter(
            Q(process_run__process_binding__employee__client_company_id=company.id)
            | Q(process_run__process_binding__equipment_item__client_company_id=company.id)
            | Q(process_run__process_binding__client_company_id=company.id)
        )
        .select_related("document_file", "process_run__process_binding")
        .order_by("-document_file__uploaded_at", "-id")
    )
    seen = set()
    for prd in prds:
        key = (prd.process_run.process_binding_id, prd.generated_by_template_id)
        if key in seen:
            continue
        seen.add(key)
        _check_field(prd.document_file.file, supported, paths, skipped)


def build_inspection_bundle(company: ClientCompany):
    supported = _supported_suffixes()
    paths: list[Path] = []
    skipped = [0]

    _company_documents(company, supported, paths, skipped)
    _risk_assessment_act(company, supported, paths, skipped)
    _compliance_findings(company, supported, paths, skipped)
    _generated_documents(company, supported, paths, skipped)

    return paths, skipped[0]
