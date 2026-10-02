from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import ProtectedError

from partners.management.commands.seed_compliance_finding_types import (
    FINDING_TYPE_PROCESS_TYPES,
)
from partners.management.commands.seed_obligation_catalog import CATALOG
from partners.obligation_sync import deactivate_bindings
from processes.models import ProcessBinding, ProcessRun, ProcessType

PROCESS_TYPE_SYNC_FIELDS = (
    "name",
    "subject_kind",
    "domain",
    "shape",
    "proof_kind",
    "default_period_months",
    "legal_basis",
    "period_rules",
    "reminder_offsets",
    "applicability_rule",
    "company_document_kind",
    "include_in_medical_exam_record",
)


def canonical_codes():
    codes = {entry["code"] for entry in CATALOG}
    codes |= {item["process_type"]["code"]
              for item in FINDING_TYPE_PROCESS_TYPES}
    return codes


def _sync_process_type_fields(pt, data):
    updates = {}
    for field in PROCESS_TYPE_SYNC_FIELDS:
        if field not in data:
            continue
        if getattr(pt, field) != data[field]:
            updates[field] = data[field]
    if updates:
        for field, value in updates.items():
            setattr(pt, field, value)
        pt.save(update_fields=list(updates.keys()))
    return bool(updates)


def sync_canonical_fields():
    updated_pt = 0

    for entry in CATALOG:
        try:
            pt = ProcessType.objects.get(code=entry["code"])
        except ProcessType.DoesNotExist:
            continue
        if _sync_process_type_fields(pt, entry):
            updated_pt += 1

    for item in FINDING_TYPE_PROCESS_TYPES:
        pt_data = item["process_type"]
        try:
            pt = ProcessType.objects.get(code=pt_data["code"])
        except ProcessType.DoesNotExist:
            continue
        if _sync_process_type_fields(pt, pt_data):
            updated_pt += 1

    return updated_pt


class Command(BaseCommand):
    help = (
        "Ensure the canonical obligation catalog exists and remove every "
        "ProcessType outside it (leftover test or manual rows)."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument(
            "--delete",
            action="store_true",
            help="Delete strays without completed activities; otherwise deactivate them.",
        )
        parser.add_argument(
            "--no-seed",
            action="store_true",
            help="Skip ensuring the canonical catalog before reconciling.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        do_delete = options["delete"]

        updated_pt = 0
        if not options["no_seed"] and not dry_run:
            call_command("seed_compliance_finding_types")
            call_command("seed_obligation_catalog")
            updated_pt = sync_canonical_fields()

        canonical = canonical_codes()
        strays = ProcessType.objects.exclude(
            code__in=canonical).order_by("code")

        deleted = 0
        deactivated = 0
        for pt in strays:
            if dry_run:
                self.stdout.write(f"  stray: {pt.code} — {pt.name}")
                continue
            has_history = ProcessRun.objects.filter(
                process_type=pt,
                status=ProcessRun.STATUS_COMPLETED,
            ).exists()
            if do_delete and not has_history:
                ProcessRun.objects.filter(process_type=pt).delete()
                ProcessBinding.objects.filter(process_type=pt).delete()
                pt.templates.all().delete()
                try:
                    pt.delete()
                    deleted += 1
                    continue
                except ProtectedError:
                    pass
            deactivate_bindings(
                ProcessBinding.objects.filter(process_type=pt, is_active=True)
            )
            if pt.is_active:
                pt.is_active = False
                pt.save(update_fields=["is_active"])
                deactivated += 1

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"Dry run: {strays.count()} stray ProcessType(s) outside the "
                    f"canonical {len(canonical)} would be "
                    f"{'deleted/deactivated' if do_delete else 'deactivated'}."
                )
            )
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"Catalog reconciled: {len(canonical)} canonical kept, "
                f"{deleted} deleted, {deactivated} deactivated, "
                f"{updated_pt} ProcessType(s) synced."
            )
        )
