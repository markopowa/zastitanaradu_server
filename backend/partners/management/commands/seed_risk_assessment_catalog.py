from django.core.management.base import BaseCommand

from partners.kinney import DEFAULT_SCALE_OPTIONS
from partners.models import Hazard, KinneyScaleOption

STARTER_HAZARDS = [
    ("MEH_POVREDE", "Mehaničke opasnosti (povrede)", Hazard.KIND_OPASNOST),
    ("PAD_VISINA", "Pad sa visine", Hazard.KIND_OPASNOST),
    ("PAD_NIVO", "Pad na istom nivou (klizanje, saplitanje)",
     Hazard.KIND_OPASNOST),
    ("EL_STRUJA", "Opasnost od električne struje", Hazard.KIND_OPASNOST),
    ("POZAR_EKSPLOZIJA", "Požar i eksplozija", Hazard.KIND_OPASNOST),
    ("VOZILA_SAOBRACAJ", "Opasnosti od vozila i unutrašnjeg saobraćaja",
     Hazard.KIND_OPASNOST),
    ("PODIZANJE_TERET", "Ručno podizanje i prenošenje tereta",
     Hazard.KIND_OPASNOST),
    ("BUKA", "Buka", Hazard.KIND_STETNOST),
    ("VIBRACIJE", "Vibracije", Hazard.KIND_STETNOST),
    ("MIKROKLIMA", "Nepovoljni mikroklimatski uslovi", Hazard.KIND_STETNOST),
    ("OSVETLJENJE", "Nedovoljno osvetljenje", Hazard.KIND_STETNOST),
    ("HEM_STETNOSTI", "Hemijske štetnosti (prašina, gasovi, pare)",
     Hazard.KIND_STETNOST),
    ("BIO_STETNOSTI", "Biološke štetnosti", Hazard.KIND_STETNOST),
    ("NAPOR_POLOZAJ", "Fizički napor i nepovoljan položaj tela",
     Hazard.KIND_STETNOST),
    ("PSIH_OPTERECENJE", "Psihička opterećenja (stres)", Hazard.KIND_STETNOST),
]


class Command(BaseCommand):
    help = (
        "Seed the Kinney scale options and a starter catalog of hazards and "
        "harms. Idempotent — updates labels, never removes user entries."
    )

    def handle(self, *args, **options):
        scale_count = 0
        for factor, entries in DEFAULT_SCALE_OPTIONS.items():
            for order, (value, label) in enumerate(entries):
                _, created = KinneyScaleOption.objects.update_or_create(
                    factor=factor,
                    value=value,
                    defaults={"label": label, "order": order},
                )
                if created:
                    scale_count += 1

        hazard_count = 0
        for order, (code, label, kind) in enumerate(STARTER_HAZARDS):
            _, created = Hazard.objects.update_or_create(
                code=code,
                defaults={"label": label, "kind": kind, "order": order},
            )
            if created:
                hazard_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Kinney scale: {KinneyScaleOption.objects.count()} options "
            f"({scale_count} new). Hazards: {Hazard.objects.count()} "
            f"({hazard_count} new)."
        ))
