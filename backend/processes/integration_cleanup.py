from django.db import transaction
from django.db.models import Q

from partners.models import (
    ClientCompany,
    CompanyComplianceFinding,
    CompanyDocument,
    JobRole,
    RiskAssessmentActAmendment,
    RiskAssessmentSection,
    RiskAssessmentSectionRevision,
)

TEST_COMPANY_FILTER = (
    Q(name__icontains="UKRAS TEST")
    | Q(name__icontains="VERIFY_TMP")
    | Q(name__istartswith="AUDIT TMP")
    | Q(notes="Integration test")
    | Q(notes="Test")
    | Q(tax_id="108277286")
)

FILE_FIELDS = {
    CompanyComplianceFinding: ("file",),
    RiskAssessmentSectionRevision: ("file",),
    RiskAssessmentActAmendment: ("file",),
    RiskAssessmentSection: ("current_file",),
    CompanyDocument: ("file",),
    JobRole: (
        "obrazac6_template",
        "lzo_revers_template",
        "potvrda_clan5_template",
    ),
    ClientCompany: ("risk_assessment_act_file", "logo"),
}


def test_company_queryset():
    return ClientCompany.objects.filter(TEST_COMPANY_FILTER).order_by("id")


def preview_test_companies():
    return [
        {
            "id": c.id,
            "name": c.name,
            "tax_id": c.tax_id,
            "notes": c.notes or "",
        }
        for c in test_company_queryset()
    ]


def _purge_files_for_companies(company_ids):
    if not company_ids:
        return
    for model, field_names in FILE_FIELDS.items():
        if model is ClientCompany:
            qs = model.objects.filter(id__in=company_ids)
        elif model is JobRole:
            qs = model.objects.filter(client_company_id__in=company_ids)
        elif model is CompanyDocument:
            qs = model.objects.filter(client_company_id__in=company_ids)
        elif model is CompanyComplianceFinding:
            qs = model.objects.filter(client_company_id__in=company_ids)
        elif model is RiskAssessmentSection:
            qs = model.objects.filter(act__client_company_id__in=company_ids)
        elif model is RiskAssessmentSectionRevision:
            qs = model.objects.filter(
                section__act__client_company_id__in=company_ids
            )
        elif model is RiskAssessmentActAmendment:
            qs = model.objects.filter(act__client_company_id__in=company_ids)
        else:
            continue
        for instance in qs.iterator():
            for name in field_names:
                field = getattr(instance, name, None)
                if field:
                    field.delete(save=False)


def delete_test_companies(*, dry_run=False):
    companies = preview_test_companies()
    if dry_run:
        return {"dry_run": True, "deleted": 0, "companies": companies}
    ids = [c["id"] for c in companies]
    if not ids:
        return {"dry_run": False, "deleted": 0, "companies": []}
    with transaction.atomic():
        _purge_files_for_companies(ids)
        deleted_count, _ = ClientCompany.objects.filter(id__in=ids).delete()
    return {
        "dry_run": False,
        "deleted": deleted_count,
        "companies": companies,
    }
