from datetime import date

from django.core.management.base import BaseCommand

from processes.tasks import ensure_open_runs_for_active_bindings, process_lead_triggers


class Command(BaseCommand):
    help = (
        "Ensure open activities exist for active bindings, then run ON_LEAD "
        "templates when fire date (termin - lead_time_days) <= today."
    )

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
                f"Dry run for {today}: would ensure open runs and process ON_LEAD."
            )
            return

        created = ensure_open_runs_for_active_bindings()
        processed = process_lead_triggers(today=today)
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {created} run(s), processed {processed} ON_LEAD trigger(s)."
            )
        )
