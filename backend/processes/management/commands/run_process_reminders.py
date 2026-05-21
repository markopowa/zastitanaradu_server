from datetime import date

from django.core.management.base import BaseCommand

from processes.tasks import run_process_reminders


class Command(BaseCommand):
    help = (
        "Run ON_SCHEDULED templates when today is the appointment date, and "
        "ON_OVERDUE templates for open runs past that date."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--date",
            dest="as_of",
            metavar="YYYY-MM-DD",
            help="Run as if today were this date (for testing).",
        )

    def handle(self, *args, **options):
        as_of = options.get("as_of")
        today = date.fromisoformat(as_of) if as_of else date.today()
        n = run_process_reminders(today=today)
        self.stdout.write(self.style.SUCCESS(f"Processed {n} trigger(s)."))
