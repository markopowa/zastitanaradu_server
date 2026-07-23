from django.core.management.base import BaseCommand

from partners.models import JobRole

FILE_FIELDS = ["obrazac6_template", "lzo_revers_template", "potvrda_clan5_template"]
JSON_FIELDS = ["obrazac6_fields", "lzo_revers_fields", "potvrda_clan5_fields"]


class Command(BaseCommand):
    help = (
        "Briše osirotele blanko šablone po radnom mestu (nastale iz primera) "
        "i prazni polja. Generisanje je data-driven, ovi blankovi se ne koriste."
    )

    def handle(self, *args, **options):
        deleted = 0
        touched = 0
        for role in JobRole.objects.all():
            changed = []
            for field in FILE_FIELDS:
                file_ref = getattr(role, field, None)
                if file_ref:
                    try:
                        file_ref.delete(save=False)
                        deleted += 1
                    except Exception:
                        pass
                    setattr(role, field, None)
                    changed.append(field)
            for field in JSON_FIELDS:
                if hasattr(role, field) and getattr(role, field):
                    setattr(role, field, [])
                    changed.append(field)
            if changed:
                role.save(update_fields=changed)
                touched += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Obrisano {deleted} fajlova, očišćeno {touched} radnih mesta."
            )
        )
