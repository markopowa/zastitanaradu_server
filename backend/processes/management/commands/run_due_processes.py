from datetime import date

from django.core.management.base import BaseCommand

from partners.obligation_sync import deactivate_departed_employees
from processes.tasks import ensure_open_runs_for_active_bindings


class Command(BaseCommand):
    help = "Ensure open activities exist for active bindings."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Only report counts, do not execute.",
        )

    def handle(self, *args, **options):
        today = date.today()
        if options["dry_run"]:
            self.stdout.write(
                f"Dry run for {today}: would ensure open runs for active bindings."
            )
            return

        deactivated = deactivate_departed_employees()
        created = ensure_open_runs_for_active_bindings()
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Deactivated {deactivated} binding(s) of departed "
                f"employees, created {created} run(s)."
            )
        )
