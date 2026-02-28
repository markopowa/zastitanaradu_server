from datetime import date

from django.core.management.base import BaseCommand

from processes.models import ProcessBinding
from processes.tasks import run_process_binding


class Command(BaseCommand):
    help = "Find ProcessBindings with next_run_at <= today and run each via run_process_binding."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Only list binding IDs that would be run, do not execute.",
        )

    def handle(self, *args, **options):
        today = date.today()
        qs = ProcessBinding.objects.filter(
            is_active=True,
            next_run_at__lte=today,
        ).values_list("id", flat=True)
        binding_ids = list(qs)

        if not binding_ids:
            self.stdout.write(self.style.SUCCESS("No due process bindings."))
            return

        self.stdout.write(
            f"Found {len(binding_ids)} due binding(s): {binding_ids}")

        if options["dry_run"]:
            self.stdout.write("Dry run: not executing run_process_binding.")
            return

        for binding_id in binding_ids:
            self.stdout.write(f"Running binding id={binding_id} ...")
            run_process_binding(binding_id)

        self.stdout.write(self.style.SUCCESS(
            f"Done. Processed {len(binding_ids)} binding(s)."))
