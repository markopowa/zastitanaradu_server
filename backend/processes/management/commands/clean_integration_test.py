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
        "Delete everything created while running the integration test flow "
        "(companies, employees, equipment, documents, acts, obligations, "
        "activities, reminders) and, by default, the seeded catalog too. "
        "Keeps superusers and the APR company registry."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print counts without deleting anything.",
        )
        parser.add_argument(
            "--keep-catalog",
            action="store_true",
            help=(
                "Keep the seeded catalog (obligation types, templates, "
                "document categories, risk levels); delete only test data."
            ),
        )
        parser.add_argument(
            "--include-users",
            action="store_true",
            help="Also delete non-superuser users created during the flow.",
        )

    def handle(self, *args, **options):
        keep_catalog = options["keep_catalog"]
        include_users = options["include_users"]

        groups = list(PROCESS_DATA) + list(COMPANY_DATA)
        if not keep_catalog:
            groups += list(CATALOG_DATA)

        if options["dry_run"]:
            self.stdout.write("Dry run — nothing deleted:")
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
