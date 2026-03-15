from django.db import connection

TABLES_TO_TRUNCATE = [
    "processes_taskassignment",
    "processes_processrundocument",
    "processes_processrun",
    "processes_processbinding",
    "processes_processtemplate",
    "processes_processtype",
    "documents_documentfileaiformat",
    "documents_documentfile",
    "documents_documenttemplate",
    "documents_documentaiformat",
    "documents_documentcategory",
    "partners_equipmentitem",
    "partners_employee",
    "partners_clientcompany",
]

def run_cleanup():
    with connection.cursor() as cursor:
        tables_sql = ", ".join(f'"{t}"' for t in TABLES_TO_TRUNCATE)
        sql = f"TRUNCATE TABLE {tables_sql} RESTART IDENTITY CASCADE;"
        cursor.execute(sql)

run_cleanup()
