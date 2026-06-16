from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import ProtectedError

from partners.management.commands.seed_compliance_finding_types import (
    FINDING_TYPE_PROCESS_TYPES,
)
from partners.management.commands.seed_obligation_catalog import CATALOG
from processes.models import ProcessBinding, ProcessRun, ProcessType


def canonical_codes():
    codes = {entry["code"] for entry in CATALOG}
    codes |= {item["process_type"]["code"] for item in FINDING_TYPE_PROCESS_TYPES}
    return codes


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
            help="Delete strays without activities; otherwise deactivate them.",
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

        if not options["no_seed"] and not dry_run:
            call_command("seed_compliance_finding_types")
            call_command("seed_obligation_catalog")

        canonical = canonical_codes()
        strays = ProcessType.objects.exclude(code__in=canonical).order_by("code")

        deleted = 0
        deactivated = 0
        for pt in strays:
            if dry_run:
                self.stdout.write(f"  stray: {pt.code} — {pt.name}")
                continue
            if do_delete:
                ProcessRun.objects.filter(process_type=pt).delete()
                ProcessBinding.objects.filter(process_type=pt).delete()
                pt.templates.all().delete()
                try:
                    pt.delete()
                    deleted += 1
                    continue
                except ProtectedError:
                    pass
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
                f"{deleted} deleted, {deactivated} deactivated."
            )
        )
