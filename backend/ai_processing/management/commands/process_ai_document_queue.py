from django.core.management.base import BaseCommand

from documents.models import DocumentFileAIFormat

from ai_processing.worker import process_pending_mapping


class Command(BaseCommand):
    help = "Process pending document AI format jobs."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=50)

    def handle(self, *args, **options):
        limit = max(1, options["limit"])
        qs = (
            DocumentFileAIFormat.objects.filter(
                status=DocumentFileAIFormat.STATUS_PENDING,
            )
            .order_by("id")[:limit]
        )
        n = 0
        for mapping in qs:
            process_pending_mapping(mapping)
            n += 1
        self.stdout.write(self.style.WARNING(
            f"Processed {n} pending AI job(s)."))
