import io
import uuid
from datetime import date

import docx
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from documents.models import DocumentCategory
from partners.document_generation import generate_employee_document
from partners.models import (
    ClientCompany,
    Employee,
    Hazard,
    JobRole,
    JobRoleHazard,
    JobRoleLZO,
)
from processes.models import ProcessBinding, ProcessRun, ProcessRunDocument, ProcessType

User = get_user_model()


def make_company(**kwargs):
    defaults = {"name": "Test firma", "tax_id": uuid.uuid4().hex[:9]}
    defaults.update(kwargs)
    return ClientCompany.objects.create(**defaults)


def make_process_type(code, **kwargs):
    defaults = {
        "code": code,
        "name": f"Proces {code}",
        "subject_kind": ProcessType.SUBJECT_EMPLOYEE,
        "domain": ProcessType.DOMAIN_BZNR,
        "shape": ProcessType.SHAPE_PERIODIC,
        "proof_kind": ProcessType.PROOF_RECORDED,
        "applicability_rule": {"always": True},
        "is_active": True,
    }
    defaults.update(kwargs)
    return ProcessType.objects.create(**defaults)


def build_cell_docx() -> bytes:
    document = docx.Document()
    table = document.add_table(rows=1, cols=3)
    table.cell(0, 0).text = "label"
    table.cell(0, 1).text = ""
    table.cell(0, 2).text = "other"
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def read_cell(content_bytes: bytes, table_index: int, row: int, col: int) -> str:
    document = docx.Document(io.BytesIO(content_bytes))
    return document.tables[table_index].rows[row].cells[col].text


def all_text(content_bytes: bytes) -> str:
    document = docx.Document(io.BytesIO(content_bytes))
    parts = [p.text for p in document.paragraphs]
    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                parts.append(cell.text)
                for nested in cell.tables:
                    for nested_row in nested.rows:
                        for nested_cell in nested_row.cells:
                            parts.append(nested_cell.text)
    return "\n".join(parts)


class OnDemandGenerationTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="ondemandgen", password="x", email="ondemandgen@test.local",
        )
        DocumentCategory.objects.create(name="Test kategorija")
        self.company = make_company(name="Firma Primer", address="Ulica 1")
        self.role = JobRole.objects.create(
            client_company=self.company,
            name="Magacioner",
            description="Prijem i izdavanje robe",
            safety_measures="Koristiti zaštitne cipele.",
        )
        hazard = Hazard.objects.create(
            code="TERET", label="Ručno prenošenje tereta", kind="STETNOST",
            official_code="32")
        JobRoleHazard.objects.create(job_role=self.role, hazard=hazard)
        JobRoleLZO.objects.create(
            job_role=self.role, name="Zaštitne cipele",
            standard="SRPS EN ISO 20345", interval_months=12)
        self.employee = Employee.objects.create(
            client_company=self.company, first_name="Ana", last_name="Anić",
            job_role=self.role)
        for code in ("OSPOSOBLJAVANJE_BZR", "LZO_ZADUZENJE"):
            process_type = make_process_type(code)
            binding = ProcessBinding.objects.create(
                process_type=process_type,
                subject_kind=ProcessBinding.SUBJECT_EMPLOYEE,
                employee=self.employee,
                is_active=True,
                next_run_at=date.today(),
            )
            ProcessRun.objects.create(
                process_binding=binding,
                process_type=process_type,
                scheduled_for=date.today(),
                performed_at=date(2026, 3, 2),
                status=ProcessRun.STATUS_COMPLETED,
            )

    def test_obrazac6_is_filled_from_role_data(self):
        doc_file, content = generate_employee_document(self.employee, "OBRAZAC6")
        text = all_text(content)
        for expected in (
            "Ana Anić", "Magacioner", "Prijem i izdavanje robe",
            "Zaštitne cipele", "Ručno prenošenje tereta", "02.03.2026.",
            "Firma Primer",
        ):
            self.assertIn(expected, text)
        self.assertNotIn("{{", text)
        self.assertTrue(
            ProcessRunDocument.objects.filter(document_file=doc_file).exists())

    def test_lzo_revers_lists_role_items(self):
        _, content = generate_employee_document(self.employee, "LZO_REVERS")
        text = all_text(content)
        self.assertIn("Zaštitne cipele", text)
        self.assertIn("12 meseci", text)
        self.assertNotIn("nije predviđena", text)

    def test_endpoint_returns_docx(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        response = client.post(
            f"/api/partners/employees/{self.employee.id}/generate-document/",
            {"kind": "OBRAZAC6"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content[:2], b"PK")
