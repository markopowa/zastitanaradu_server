from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from documents.models import (
    DocumentAIFormat,
    DocumentCategory,
    DocumentFile,
    DocumentFileAIFormat,
    DocumentTemplate,
    TemplateFieldDefinition,
)
from partners.models import (
    ClientCompany,
    CompanyComplianceFinding,
    CompanyDocument,
    CompanyObligationExclusion,
    ComplianceFindingType,
    ContactPerson,
    Employee,
    EquipmentItem,
    JobRole,
    RiskAssessmentAct,
    RiskAssessmentActAmendment,
    RiskAssessmentSection,
    RiskAssessmentSectionRevision,
    RiskLevel,
)
from processes.integration_cleanup import delete_test_companies
from processes.models import (
    ActivityLog,
    CodeSequence,
    NotificationOutbox,
    ProcessBinding,
    ProcessNote,
    ProcessRun,
    ProcessRunDocument,
    ProcessTemplate,
    ProcessTriggerRun,
    ProcessType,
    TaskAssignment,
)

User = get_user_model()


def _purge_files(model, *field_names):
    for instance in model.objects.all().iterator():
        for name in field_names:
            field = getattr(instance, name, None)
            if field:
                field.delete(save=False)


PROCESS_DATA = [
    ActivityLog,
    ProcessNote,
    TaskAssignment,
    ProcessRunDocument,
    NotificationOutbox,
    ProcessTriggerRun,
    ProcessRun,
    ProcessBinding,
]

COMPANY_DATA = [
    CompanyComplianceFinding,
    RiskAssessmentSectionRevision,
    RiskAssessmentActAmendment,
    RiskAssessmentSection,
    RiskAssessmentAct,
    CompanyDocument,
    CompanyObligationExclusion,
    EquipmentItem,
    ContactPerson,
    Employee,
    JobRole,
    ClientCompany,
]

CATALOG_DATA = [
    ComplianceFindingType,
    ProcessTemplate,
    ProcessType,
    DocumentFileAIFormat,
    TemplateFieldDefinition,
    DocumentFile,
    DocumentTemplate,
    DocumentCategory,
    DocumentAIFormat,
    RiskLevel,
    CodeSequence,
]

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
    DocumentFile: ("file",),
    DocumentTemplate: ("template_file",),
}


class Command(BaseCommand):
    help = (
        "Clean integration-test data. Default: only test companies "
        "(UKRAS TEST / VERIFY_TMP / notes=Integration test). "
        "Use --purge-all for the nuclear wipe (optionally keep catalog)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be deleted without deleting.",
        )
        parser.add_argument(
            "--purge-all",
            action="store_true",
            help=(
                "Delete ALL companies/process data (and catalog unless "
                "--keep-catalog). Dangerous on production."
            ),
        )
        parser.add_argument(
            "--keep-catalog",
            action="store_true",
            help="With --purge-all: keep seeded catalog rows.",
        )
        parser.add_argument(
            "--include-users",
            action="store_true",
            help="With --purge-all: also delete non-superuser users.",
        )

    def handle(self, *args, **options):
        if not options["purge_all"]:
            result = delete_test_companies(dry_run=options["dry_run"])
            companies = result["companies"]
            if options["dry_run"]:
                self.stdout.write("Dry run — test companies:")
                if not companies:
                    self.stdout.write("  (none)")
                    return
                for c in companies:
                    self.stdout.write(
                        f"  #{c['id']} {c['name']} PIB={c['tax_id']}"
                    )
                return
            names = ", ".join(c["name"] for c in companies) or "nothing"
            self.stdout.write(self.style.SUCCESS(
                f"OK: deleted {result['deleted']} rows for: {names}."
            ))
            return

        keep_catalog = options["keep_catalog"]
        include_users = options["include_users"]

        groups = list(PROCESS_DATA) + list(COMPANY_DATA)
        if not keep_catalog:
            groups += list(CATALOG_DATA)

        if options["dry_run"]:
            self.stdout.write("Dry run — purge-all:")
            for model in groups:
                self.stdout.write(
                    f"  {model.__name__}: {model.objects.count()}"
                )
            if include_users:
                self.stdout.write(
                    "  Users (non-superuser): "
                    f"{User.objects.filter(is_superuser=False).count()}"
                )
            return

        deleted = []
        with transaction.atomic():
            for model in groups:
                field_names = FILE_FIELDS.get(model)
                if field_names:
                    _purge_files(model, *field_names)
                count, _ = model.objects.all().delete()
                if count:
                    deleted.append(f"{count} {model.__name__}")
            if include_users:
                users_deleted, _ = User.objects.filter(
                    is_superuser=False
                ).delete()
                if users_deleted:
                    deleted.append(f"{users_deleted} users")

        summary = ", ".join(deleted) if deleted else "nothing (already empty)"
        self.stdout.write(self.style.SUCCESS(f"OK: deleted {summary}."))
