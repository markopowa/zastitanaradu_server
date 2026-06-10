from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from documents.models import DocumentCategory, DocumentFile, DocumentTemplate
from partners.models import (
    ClientCompany,
    CompanyComplianceFinding,
    CompanyDocument,
    Employee,
    RiskAssessmentSection,
    RiskAssessmentSectionRevision,
    RiskLevel,
)
from processes.models import (
    ActivityLog,
    CodeSequence,
    ProcessBinding,
    ProcessRun,
    ProcessTemplate as ObligationTemplate,
    ProcessType,
)

# Identifiers used in instructions/test_flow.md (pilot firm UKRAS DOO).
TEST_COMPANY_Q = (
    Q(name__icontains="UKRAS")
    | Q(tax_id="108277286")
    | Q(registration_number="20644206")
)
TEST_EMPLOYEE_NATIONAL_ID = "0102990710123"
TEST_CATEGORY_NAME = "Lekarski pregledi"
TEST_PROCESS_TYPE_NAME = "Periodični lekarski pregled"
TEST_DOC_TEMPLATE_NAME = "Uput - periodični lekarski pregled"
TEST_RISK_LEVEL_CODE = "TEST"


def _test_querysets():
    companies = ClientCompany.objects.filter(TEST_COMPANY_Q)
    employees = Employee.objects.filter(
        Q(client_company__in=companies)
        | Q(national_id=TEST_EMPLOYEE_NATIONAL_ID)
    )
    bindings = ProcessBinding.objects.filter(
        Q(employee__in=employees) | Q(client_company__in=companies)
    )
    runs = ProcessRun.objects.filter(process_binding__in=bindings)
    documents = CompanyDocument.objects.filter(client_company__in=companies)
    findings = CompanyComplianceFinding.objects.filter(
        client_company__in=companies
    )
    act_sections = RiskAssessmentSection.objects.filter(
        act__client_company__in=companies
    )
    act_revisions = RiskAssessmentSectionRevision.objects.filter(
        section__in=act_sections
    )
    category = DocumentCategory.objects.filter(name__iexact=TEST_CATEGORY_NAME)
    doc_template = DocumentTemplate.objects.filter(
        Q(name__iexact=TEST_DOC_TEMPLATE_NAME) | Q(category__in=category)
    )
    process_type = ProcessType.objects.filter(
        name__iexact=TEST_PROCESS_TYPE_NAME
    )
    obligation_templates = ObligationTemplate.objects.filter(
        Q(process_type__in=process_type)
        | Q(document_template__in=doc_template)
    )
    risk_levels = RiskLevel.objects.filter(code=TEST_RISK_LEVEL_CODE)
    doc_files = DocumentFile.objects.filter(
        Q(category__in=category)
        | Q(process_run_documents__process_run__in=runs)
        | Q(title__icontains="Uput")
        | Q(title__icontains="Obrazac")
    ).distinct()
    return {
        "companies": companies,
        "employees": employees,
        "bindings": bindings,
        "runs": runs,
        "documents": documents,
        "findings": findings,
        "act_sections": act_sections,
        "act_revisions": act_revisions,
        "category": category,
        "doc_template": doc_template,
        "process_type": process_type,
        "obligation_templates": obligation_templates,
        "risk_levels": risk_levels,
        "doc_files": doc_files,
    }


def _counts(qs):
    return {key: queryset.count() for key, queryset in qs.items()}


def _delete_file_fields(instances, *field_names):
    for instance in instances:
        for name in field_names:
            field = getattr(instance, name, None)
            if field:
                field.delete(save=False)


class Command(BaseCommand):
    help = (
        "Delete data created by instructions/test_flow.md "
        "(pilot firm UKRAS and all related records, plus the process and "
        "document configuration entered during the flow)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be deleted without changing the database.",
        )

    def handle(self, *args, **options):
        qs = _test_querysets()
        counts = _counts(qs)

        if options["dry_run"]:
            self.stdout.write("Dry run — nothing deleted:")
            for key, count in counts.items():
                self.stdout.write(f"  {key}: {count}")
            return

        with transaction.atomic():
            # Remove uploaded files from disk before the rows cascade away.
            _delete_file_fields(qs["act_revisions"], "file")
            _delete_file_fields(qs["act_sections"], "current_file")
            _delete_file_fields(qs["documents"], "file")
            _delete_file_fields(qs["findings"], "file")
            _delete_file_fields(
                qs["companies"],
                "risk_assessment_act_file",
                "logo",
            )
            _delete_file_fields(qs["doc_template"], "template_file")
            _delete_file_fields(qs["doc_files"], "file")

            log_deleted, _ = ActivityLog.objects.filter(
                Q(process_run__in=qs["runs"])
                | Q(process_binding__in=qs["bindings"])
            ).delete()
            runs_deleted, runs_breakdown = qs["runs"].delete()
            bindings_deleted, bindings_breakdown = qs["bindings"].delete()
            employees_deleted, _ = qs["employees"].delete()
            companies_deleted, companies_breakdown = qs["companies"].delete()
            obligation_deleted, _ = qs["obligation_templates"].delete()
            process_type_deleted, _ = qs["process_type"].delete()
            doc_template_deleted, _ = qs["doc_template"].delete()
            doc_files_deleted, _ = qs["doc_files"].delete()
            category_deleted, _ = qs["category"].delete()
            risk_levels_deleted, _ = qs["risk_levels"].delete()
            sequences_deleted, _ = CodeSequence.objects.filter(
                name__in=["instruction", "process_type"]
            ).delete()

        parts = [
            f"{log_deleted} activity log",
            f"{runs_deleted} process runs",
            f"{bindings_deleted} bindings",
            f"{employees_deleted} employees",
            f"{companies_deleted} companies",
            f"{obligation_deleted} obligation templates",
            f"{process_type_deleted} process types",
            f"{doc_template_deleted} document templates",
            f"{doc_files_deleted} document files",
            f"{category_deleted} categories",
            f"{risk_levels_deleted} risk levels",
            f"{sequences_deleted} code sequences",
        ]
        for label, breakdown in (
            ("run", runs_breakdown),
            ("binding", bindings_breakdown),
            ("company", companies_breakdown),
        ):
            for model_label, count in sorted(breakdown.items()):
                short = model_label.rsplit(".", 1)[-1]
                parts.append(f"{count} {short} ({label} cascade)")

        self.stdout.write(self.style.SUCCESS(
            f"OK: deleted {', '.join(parts)}."))
