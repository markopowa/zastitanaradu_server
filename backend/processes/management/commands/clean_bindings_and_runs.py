from django.core.management.base import BaseCommand
from django.db import connection, transaction


def _table_exists(cursor, name: str) -> bool:
    cursor.execute(
        """
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = %s
        """,
        [name],
    )
    return cursor.fetchone() is not None


class Command(BaseCommand):
    help = (
        "Delete all process bindings, runs, and related rows (SQL order; "
        "safe if processes_activitylog table is missing)."
    )

    def handle(self, *args, **options):
        stmts = [
            "DELETE FROM processes_processrundocument;",
            "DELETE FROM processes_processnote;",
            "DELETE FROM processes_taskassignment;",
            "DELETE FROM processes_processrun;",
            "DELETE FROM processes_processbinding;",
        ]
        with transaction.atomic():
            with connection.cursor() as cursor:
                if _table_exists(cursor, "processes_activitylog"):
                    cursor.execute("DELETE FROM processes_activitylog;")
                for sql in stmts:
                    cursor.execute(sql)
        self.stdout.write(
            self.style.SUCCESS(
                "OK: bindings, runs, and related rows removed "
                "(activity log cleared if table exists).",
            ),
        )
