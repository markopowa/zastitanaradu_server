from django.core.management.base import BaseCommand

from partners.models import RoleLzoTemplate, normalize_role_name

ODELO = ("Radno odelo gornji/donji deo ili pilot odelo", "SRPS EN 13688:2015", 12)
DUKS = ("Radni duks/majica", "SRPS EN 13688:2015", 12)
CIPELE = (
    "Zaštitne cipele sa čeličnom kapom, protivklizne",
    "SRPS EN 20345:2013 / Ispr.1:2016",
    12,
)
NAOCARE = ("Zaštitne naočare", "SRPS EN 166:2008", 6)
RUKAVICE = ("Zaštitne rukavice", "SRPS EN 388:2019", 6)
MASKA = ("Kofil maska sa ventilom", "SRPS EN 149:2013", None)
ANTIFONI = (
    "Antifoni/čepići za uši",
    "SRPS EN 352-1:2021 / SRPS EN 352-2:2021",
    None,
)
SLEM = ("Zaštitni šlem", "SRPS EN 397:2014", 24)
UPREGA = (
    "Oprema za ličnu zaštitu protiv padova sa visine",
    "SRPS EN 361:2007",
    None,
)
KABANICA = ("Kišna kabanica", "SRPS EN 343:2019", 24)

STANDARD7 = [ODELO, DUKS, CIPELE, NAOCARE, RUKAVICE, MASKA, ANTIFONI]

ROLE_ITEMS = {
    "Tehnički direktor": STANDARD7,
    "Poslovođa": STANDARD7,
    "Prodavac": STANDARD7,
    "Radnik na održavanju": STANDARD7,
    "Radnik u proizvodnji (primarna prerada)": STANDARD7,
    "Radnik u proizvodnji (završna prerada)": STANDARD7,
    "Radnik na oštrenju alata i štelovanju mašina": STANDARD7,
    "Vozač teretnog vozila": STANDARD7,
    "Magacioner": STANDARD7,
    "Viljuškarista": STANDARD7 + [SLEM],
    "Pomoćni radnik": STANDARD7 + [SLEM, UPREGA, KABANICA],
}


class Command(BaseCommand):
    help = "Seed tipska LZO po radnom mestu iz referentnih dokumenata."

    def handle(self, *args, **options):
        created, roles = self._seed_role_lzo_templates()
        self.stdout.write(
            self.style.SUCCESS(
                f"Tipska LZO: {created} stavki za {roles} radnih mesta."
            )
        )

    def _seed_role_lzo_templates(self):
        created = 0
        for role_name, items in ROLE_ITEMS.items():
            key = normalize_role_name(role_name)
            RoleLzoTemplate.objects.filter(role_key=key).delete()
            for order, (name, standard, interval) in enumerate(items, start=1):
                RoleLzoTemplate.objects.create(
                    role_name=role_name,
                    name=name,
                    standard=standard,
                    interval_months=interval,
                    order=order,
                )
                created += 1
        return created, len(ROLE_ITEMS)
