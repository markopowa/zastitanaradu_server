from django.core.management.base import BaseCommand
from django.db import transaction

from processes.models import ActivityLog, ProcessBinding


class Command(BaseCommand):
    help = (
        "Delete all process bindings, runs, and related rows "
        "(run documents, notes, tasks, trigger runs, activity log)."
    )

    def handle(self, *args, **options):
        with transaction.atomic():
            log_count, _ = ActivityLog.objects.all().delete()
            binding_count, breakdown = ProcessBinding.objects.all().delete()

        parts = [f"{log_count} activity log"]
        for model_label, count in sorted(breakdown.items()):
            short = model_label.rsplit(".", 1)[-1]
            parts.append(f"{count} {short}")

        self.stdout.write(
            self.style.SUCCESS(f"OK: deleted {', '.join(parts)}."),
        )
