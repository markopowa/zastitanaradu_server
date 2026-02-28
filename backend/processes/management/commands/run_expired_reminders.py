from django.core.management.base import BaseCommand

from processes.tasks import run_expired_reminders


class Command(BaseCommand):
    help = (
        "Send ON_EXPIRED reminder emails for all completed runs whose valid_until "
        "has passed. Run daily (e.g. via cron)."
    )

    def handle(self, *args, **options):
        run_expired_reminders()
        self.stdout.write(self.style.SUCCESS("Expired reminders done."))
