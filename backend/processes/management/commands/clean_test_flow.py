from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from documents.models import DocumentCategory, DocumentFile, DocumentTemplate
from partners.models import ClientCompany, Employee
from processes.models import (
    ActivityLog,
    CodeSequence,
    ProcessBinding,
    ProcessRun,
    ProcessTemplate as ObligationTemplate,
    ProcessType,
)

TEST_COMPANY_Q = Q(name__icontains="Test firma") | Q(tax_id="123456789")
TEST_CATEGORY_NAME = "Lekarski pregledi"
TEST_PROCESS_TYPE_NAME = "Periodični lekarski pregled"
TEST_DOC_TEMPLATE_NAME = "Uput - periodični lekarski pregled"
TEST_EMPLOYEE_NATIONAL_ID = "0102990710123"


def _test_querysets():
    companies = ClientCompany.objects.filter(TEST_COMPANY_Q)
    employees = Employee.objects.filter(
        Q(client_company__in=companies) | Q(national_id=TEST_EMPLOYEE_NATIONAL_ID)
    )
    bindings = ProcessBinding.objects.filter(employee__in=employees)
    runs = ProcessRun.objects.filter(process_binding__in=bindings)
    category = DocumentCategory.objects.filter(name=TEST_CATEGORY_NAME)
    doc_template = DocumentTemplate.objects.filter(name=TEST_DOC_TEMPLATE_NAME)
    process_type = ProcessType.objects.filter(name=TEST_PROCESS_TYPE_NAME)
    obligation_templates = ObligationTemplate.objects.filter(
        process_type__in=process_type
    )
    doc_files = DocumentFile.objects.filter(
        Q(category__in=category)
        | Q(process_run_documents__process_run__in=runs)
        | Q(title__icontains="Uput")
    ).distinct()
    return {
        "companies": companies,
        "employees": employees,
        "bindings": bindings,
        "runs": runs,
        "category": category,
        "doc_template": doc_template,
        "process_type": process_type,
        "obligation_templates": obligation_templates,
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
        "(test companies, employees, bindings, runs, document and process config)."
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
            log_deleted, _ = ActivityLog.objects.filter(
                Q(process_run__in=qs["runs"]) | Q(process_binding__in=qs["bindings"])
            ).delete()
            runs_deleted, runs_breakdown = qs["runs"].delete()
            bindings_deleted, bindings_breakdown = qs["bindings"].delete()
            employees_deleted, _ = qs["employees"].delete()
            _delete_file_fields(
                qs["companies"],
                "risk_assessment_act_file",
                "logo",
            )
            companies_deleted, companies_breakdown = qs["companies"].delete()
            obligation_deleted, _ = qs["obligation_templates"].delete()
            process_type_deleted, _ = qs["process_type"].delete()
            _delete_file_fields(qs["doc_template"], "template_file")
            doc_template_deleted, _ = qs["doc_template"].delete()
            _delete_file_fields(qs["doc_files"], "file")
            doc_files_deleted, _ = qs["doc_files"].delete()
            category_deleted, _ = qs["category"].delete()
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

        self.stdout.write(self.style.SUCCESS(f"OK: deleted {', '.join(parts)}."))
