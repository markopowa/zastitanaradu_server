from django.core.management.base import BaseCommand

from processes.models import ProcessRun
from processes.result_data import normalize_process_run_result_data

_LEGACY = ("broj_izvestaja", "ocena_sposobnosti", "preduzete_mere")


class Command(BaseCommand):
    help = "Rewrite ProcessRun.result_data legacy keys to English keys."

    def handle(self, *args, **options):
        updated = 0
        for run in ProcessRun.objects.iterator():
            rd = run.result_data
            if not isinstance(rd, dict):
                continue
            if not any(k in rd for k in _LEGACY):
                continue
            new_rd = normalize_process_run_result_data(rd)
            ProcessRun.objects.filter(pk=run.pk).update(result_data=new_rd)
            updated += 1
        self.stdout.write(self.style.SUCCESS(f"Updated {updated} run(s)."))
