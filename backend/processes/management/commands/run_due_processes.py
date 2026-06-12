from datetime import date

from django.core.management.base import BaseCommand

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

        created = ensure_open_runs_for_active_bindings()
        self.stdout.write(
            self.style.SUCCESS(f"Done. Created {created} run(s).")
        )
