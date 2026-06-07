from django.core.management.base import BaseCommand, CommandError

from partners.company_registry import sync_company_registry


class Command(BaseCommand):
    help = (
        "Download open-data company registry JSON and import the current snapshot."
    )

    def handle(self, *args, **options):
        try:
            snapshot = sync_company_registry()
        except (RuntimeError, ValueError) as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(
            self.style.SUCCESS(
                f"Registry snapshot {snapshot.cut_off_date} imported "
                f"({snapshot.company_count} companies)."
            )
        )
