import uuid
from datetime import date

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.test import TestCase
from rest_framework.test import APIClient

from documents.models import DocumentCategory, DocumentFile
from partners.models import ClientCompany, CompanyDocument, Employee
from partners.medical_exam_record import generate_medical_exam_record
from processes.models import (
    ProcessBinding,
    ProcessRun,
    ProcessRunDocument,
    ProcessType,
)

User = get_user_model()


def make_company(**kwargs):
    defaults = {"name": "Test firma", "tax_id": uuid.uuid4().hex[:9]}
    defaults.update(kwargs)
    return ClientCompany.objects.create(**defaults)


def make_process_type(**kwargs):
    defaults = {
        "name": "Test obaveza",
        "subject_kind": ProcessType.SUBJECT_EMPLOYEE,
        "domain": ProcessType.DOMAIN_BZNR,
        "shape": ProcessType.SHAPE_PERIODIC,
        "proof_kind": ProcessType.PROOF_RECORDED,
        "applicability_rule": {"always": True},
        "include_in_medical_exam_record": True,
        "is_active": True,
    }
    defaults.update(kwargs)
    return ProcessType.objects.create(**defaults)


def make_user():
    return User.objects.create_superuser(
        username=f"admin-{uuid.uuid4().hex[:8]}",
        password="x",
        email=f"admin-{uuid.uuid4().hex[:8]}@test.local",
    )


def make_document_file(user, title="Izvestaj"):
    category = DocumentCategory.objects.create(name=f"Kategorija {uuid.uuid4().hex[:8]}")
    doc_file = DocumentFile(
        category=category,
        title=title,
        uploaded_by=user,
    )
    doc_file.file.save(
        f"{uuid.uuid4().hex[:8]}.docx",
        ContentFile(b"content"),
        save=False,
    )
    doc_file.save()
    return doc_file


class EmployeeDocumentsEndpointTest(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client_api = APIClient()
        self.client_api.force_authenticate(user=self.user)
        self.company = make_company()
        self.employee = Employee.objects.create(
            client_company=self.company,
            first_name="Petar",
            last_name="Petrovic",
        )
        self.process_type = make_process_type()
        self.binding = ProcessBinding.objects.create(
            process_type=self.process_type,
            subject_kind=ProcessBinding.SUBJECT_EMPLOYEE,
            employee=self.employee,
            is_active=True,
            next_run_at=date.today(),
        )
        self.run = ProcessRun.objects.create(
            process_binding=self.binding,
            process_type=self.process_type,
            scheduled_for=date.today(),
            performed_at=date.today(),
            status=ProcessRun.STATUS_COMPLETED,
        )
        self.doc_file = make_document_file(self.user)
        self.prd = ProcessRunDocument.objects.create(
            process_run=self.run,
            document_file=self.doc_file,
            usage_kind=ProcessRunDocument.USAGE_REPORT,
        )

    def test_returns_documents_for_employee(self):
        response = self.client_api.get(
            f"/api/partners/employees/{self.employee.id}/documents/"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        row = data[0]
        self.assertEqual(row["id"], self.prd.id)
        self.assertEqual(row["name"], self.doc_file.title)
        self.assertEqual(row["usage_kind"], ProcessRunDocument.USAGE_REPORT)
        self.assertEqual(row["process_type_name"], self.process_type.name)
        self.assertTrue(row["file_url"])

    def test_returns_empty_for_employee_without_documents(self):
        other_employee = Employee.objects.create(
            client_company=self.company,
            first_name="Marko",
            last_name="Markovic",
        )
        response = self.client_api.get(
            f"/api/partners/employees/{other_employee.id}/documents/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])


class CompanyGeneratedDocumentsEndpointTest(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client_api = APIClient()
        self.client_api.force_authenticate(user=self.user)
        self.company = make_company()
        self.employee = Employee.objects.create(
            client_company=self.company,
            first_name="Ana",
            last_name="Anic",
        )
        self.process_type = make_process_type()
        self.binding = ProcessBinding.objects.create(
            process_type=self.process_type,
            subject_kind=ProcessBinding.SUBJECT_EMPLOYEE,
            employee=self.employee,
            is_active=True,
            next_run_at=date.today(),
        )
        self.run = ProcessRun.objects.create(
            process_binding=self.binding,
            process_type=self.process_type,
            scheduled_for=date.today(),
            performed_at=date.today(),
            status=ProcessRun.STATUS_COMPLETED,
        )
        self.doc_file = make_document_file(self.user)
        self.prd = ProcessRunDocument.objects.create(
            process_run=self.run,
            document_file=self.doc_file,
            usage_kind=ProcessRunDocument.USAGE_REPORT,
        )

    def test_aggregates_employee_run_document_for_company(self):
        response = self.client_api.get(
            f"/api/partners/client-companies/{self.company.id}/generated-documents/"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        row = data[0]
        self.assertEqual(row["id"], self.prd.id)
        self.assertEqual(row["subject_label"], "Ana Anic")
        self.assertEqual(row["process_type_name"], self.process_type.name)
        self.assertTrue(row["file_url"])

    def test_other_company_not_included(self):
        other_company = make_company(name="Druga firma")
        response = self.client_api.get(
            f"/api/partners/client-companies/{other_company.id}/generated-documents/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])


class Obrazac1PersistenceTest(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client_api = APIClient()
        self.client_api.force_authenticate(user=self.user)
        self.company = make_company()
        self.employee = Employee.objects.create(
            client_company=self.company,
            first_name="Ivan",
            last_name="Ivic",
            high_risk_position_name="Rukovalac viljuškarom",
        )
        self.process_type = make_process_type()
        self.binding = ProcessBinding.objects.create(
            process_type=self.process_type,
            subject_kind=ProcessBinding.SUBJECT_EMPLOYEE,
            employee=self.employee,
            is_active=True,
            next_run_at=date.today(),
        )
        ProcessRun.objects.create(
            process_binding=self.binding,
            process_type=self.process_type,
            scheduled_for=date.today(),
            performed_at=date.today(),
            valid_until=date.today(),
            status=ProcessRun.STATUS_COMPLETED,
        )

    def test_generate_endpoint_persists_company_document(self):
        response = self.client_api.get(
            f"/api/partners/client-companies/{self.company.id}/medical-exam-record/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            CompanyDocument.objects.filter(
                client_company=self.company,
                kind=CompanyDocument.KIND_OBRAZAC1,
            ).exists()
        )
        self.assertEqual(
            CompanyDocument.objects.filter(
                client_company=self.company,
                kind=CompanyDocument.KIND_OBRAZAC1,
            ).count(),
            1,
        )

    def test_calling_again_replaces_single_row(self):
        self.client_api.get(
            f"/api/partners/client-companies/{self.company.id}/medical-exam-record/"
        )
        first = CompanyDocument.objects.get(
            client_company=self.company,
            kind=CompanyDocument.KIND_OBRAZAC1,
        )
        first_file_name = first.file.name

        self.client_api.get(
            f"/api/partners/client-companies/{self.company.id}/medical-exam-record/"
        )
        self.assertEqual(
            CompanyDocument.objects.filter(
                client_company=self.company,
                kind=CompanyDocument.KIND_OBRAZAC1,
            ).count(),
            1,
        )
        second = CompanyDocument.objects.get(
            client_company=self.company,
            kind=CompanyDocument.KIND_OBRAZAC1,
        )
        self.assertTrue(second.file)
        self.assertTrue(first_file_name)

    def test_generate_medical_exam_record_function_still_works(self):
        content = generate_medical_exam_record(self.company.id)
        self.assertTrue(len(content) > 0)
