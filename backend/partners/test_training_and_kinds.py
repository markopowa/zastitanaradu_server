import uuid
from datetime import date

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.test import TestCase
from rest_framework.test import APIClient

from documents.models import DocumentCategory, DocumentTemplate
from partners.document_generation import generate_employee_document
from partners.management.commands.add_setup import Command as AddSetupCommand
from partners.models import (
    ClientCompany,
    CompanyDocument,
    CompanyDocumentKind,
    Employee,
    EmployeeTraining,
    TrainingType,
)
from partners.test_on_demand_generation import (
    build_cell_docx,
    make_process_type,
    read_cell,
)
from processes.models import ProcessBinding, ProcessRun, ProcessRunDocument

User = get_user_model()


def make_company(**kwargs):
    defaults = {"name": "Test firma", "tax_id": uuid.uuid4().hex[:9]}
    defaults.update(kwargs)
    return ClientCompany.objects.create(**defaults)


class TrainingTypeAPITestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="trainingtypeapi", password="x", email="trainingtypeapi@test.local",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.company = make_company(name="Firma A")
        self.other_company = make_company(name="Firma B")

    def test_create_list_update_delete(self):
        response = self.client.post(
            "/api/partners/training-types/",
            {
                "client_company": self.company.id,
                "name": "Rukovanje viljuškarom",
                "description": "Obuka za rukovaoce viljuškarom",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        training_type_id = response.data["id"]

        make_company(name="Firma C")
        TrainingType.objects.create(
            client_company=self.other_company, name="Rukovanje bagerom",
        )

        response = self.client.get(
            f"/api/partners/training-types/?client_company_id={self.company.id}",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], training_type_id)

        response = self.client.patch(
            f"/api/partners/training-types/{training_type_id}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["is_active"])

        response = self.client.delete(
            f"/api/partners/training-types/{training_type_id}/",
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(
            TrainingType.objects.filter(id=training_type_id).exists())

    def test_unique_together_per_company(self):
        TrainingType.objects.create(
            client_company=self.company, name="Rukovanje viljuškarom",
        )
        response = self.client.post(
            "/api/partners/training-types/",
            {
                "client_company": self.company.id,
                "name": "Rukovanje viljuškarom",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)


class EmployeeTrainingAPITestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="employeetrainingapi", password="x", email="employeetrainingapi@test.local",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.company = make_company(name="Firma D")
        self.training_type = TrainingType.objects.create(
            client_company=self.company, name="Rukovanje bagerom",
        )
        self.employee = Employee.objects.create(
            client_company=self.company,
            first_name="Marko",
            last_name="Markovic",
        )
        self.other_employee = Employee.objects.create(
            client_company=self.company,
            first_name="Ana",
            last_name="Anic",
        )

    def test_create_list_update_delete(self):
        response = self.client.post(
            "/api/partners/employee-trainings/",
            {
                "employee": self.employee.id,
                "training_type": self.training_type.id,
                "completed_at": "2026-01-10",
                "valid_until": "2028-01-10",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        training_id = response.data["id"]

        EmployeeTraining.objects.create(
            employee=self.other_employee, training_type=self.training_type,
        )

        response = self.client.get(
            f"/api/partners/employee-trainings/?employee_id={self.employee.id}",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], training_id)

        response = self.client.get(
            f"/api/partners/employee-trainings/?client_company_id={self.company.id}",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 2)

        response = self.client.patch(
            f"/api/partners/employee-trainings/{training_id}/",
            {"valid_until": "2029-01-10"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["valid_until"], "2029-01-10")

        response = self.client.delete(
            f"/api/partners/employee-trainings/{training_id}/",
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(
            EmployeeTraining.objects.filter(id=training_id).exists())

    def test_protect_on_training_type_delete(self):
        EmployeeTraining.objects.create(
            employee=self.employee, training_type=self.training_type,
        )
        response = self.client.delete(
            f"/api/partners/training-types/{self.training_type.id}/",
        )
        self.assertEqual(response.status_code, 400)


class PotvrdaClan5GenerationTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="potvrdaclan5", password="x", email="potvrdaclan5@test.local",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.category = DocumentCategory.objects.create(name="Test kategorija")
        self.doc_template = DocumentTemplate.objects.create(
            name="Potvrda po članu 5",
            context_type=DocumentTemplate.CONTEXT_EMPLOYEE,
            category=self.category,
            generation_config={
                "mode": "DOCX_CELL_MAP",
                "cells": [
                    {"table": 0, "row": 0, "col": 1, "fieldKey": "employee.full_name"},
                ],
            },
        )
        self.process_type = make_process_type("OSPOSOBLJAVANJE_BZR")
        self.company = make_company(name="Firma Potvrda")
        self.training_type = TrainingType.objects.create(
            client_company=self.company, name="Rukovanje viljuškarom",
        )
        self.employee = Employee.objects.create(
            client_company=self.company,
            first_name="Petar",
            last_name="Petrovic",
        )

    def _attach_blank(self):
        self.training_type.potvrda_template.save(
            "potvrda_blank.docx",
            ContentFile(build_cell_docx()),
            save=True,
        )

    def _make_binding_and_run(self):
        binding = ProcessBinding.objects.create(
            process_type=self.process_type,
            subject_kind=ProcessBinding.SUBJECT_EMPLOYEE,
            employee=self.employee,
            is_active=True,
            next_run_at=date.today(),
        )
        run = ProcessRun.objects.create(
            process_binding=binding,
            process_type=self.process_type,
            scheduled_for=date.today(),
            status=ProcessRun.STATUS_PENDING,
        )
        return binding, run

    def test_happy_path_fills_blank_from_training_type(self):
        self._attach_blank()
        self._make_binding_and_run()

        doc_file, content_bytes = generate_employee_document(
            self.employee, "POTVRDA_CLAN5", training_type_id=self.training_type.id,
        )

        self.assertEqual(read_cell(content_bytes, 0, 0, 1), "Petar Petrovic")
        self.assertTrue(doc_file.file.name.endswith(".docx"))
        self.assertTrue(
            ProcessRunDocument.objects.filter(document_file=doc_file).exists()
        )

    def test_missing_training_type_id_raises(self):
        self._make_binding_and_run()
        with self.assertRaises(ValueError) as ctx:
            generate_employee_document(self.employee, "POTVRDA_CLAN5")
        self.assertIn("izabrati vrstu obuke", str(ctx.exception))

    def test_unknown_training_type_id_raises(self):
        self._make_binding_and_run()
        with self.assertRaises(ValueError) as ctx:
            generate_employee_document(
                self.employee, "POTVRDA_CLAN5", training_type_id=999999,
            )
        self.assertIn("nije pronađena", str(ctx.exception))

    def test_training_type_without_blank_raises(self):
        self._make_binding_and_run()
        with self.assertRaises(ValueError) as ctx:
            generate_employee_document(
                self.employee, "POTVRDA_CLAN5", training_type_id=self.training_type.id,
            )
        self.assertIn(
            "Vrsta obuke nema blanko potvrdu — otpremite je na vrsti obuke.",
            str(ctx.exception),
        )

    def test_no_binding_raises(self):
        self._attach_blank()
        with self.assertRaises(ValueError) as ctx:
            generate_employee_document(
                self.employee, "POTVRDA_CLAN5", training_type_id=self.training_type.id,
            )
        self.assertIn("nema obavezu", str(ctx.exception))

    def test_endpoint_400_without_blank(self):
        self._make_binding_and_run()
        response = self.client.post(
            f"/api/partners/employees/{self.employee.id}/generate-document/",
            {"kind": "POTVRDA_CLAN5", "training_type_id": self.training_type.id},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("blanko potvrdu", response.data["detail"])

    def test_endpoint_returns_docx_download_on_happy_path(self):
        self._attach_blank()
        self._make_binding_and_run()
        response = self.client.post(
            f"/api/partners/employees/{self.employee.id}/generate-document/",
            {"kind": "POTVRDA_CLAN5", "training_type_id": self.training_type.id},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertEqual(read_cell(response.content, 0, 0, 1), "Petar Petrovic")


class CompanyDocumentKindSeedingTestCase(TestCase):
    def test_seed_creates_all_kinds_and_marks_optional(self):
        cmd = AddSetupCommand()
        created = cmd._seed_company_document_kinds()

        self.assertEqual(created, len(CompanyDocument.KIND_CHOICES))
        self.assertEqual(
            CompanyDocumentKind.objects.count(), len(CompanyDocument.KIND_CHOICES)
        )

        ocena = CompanyDocumentKind.objects.get(
            code=CompanyDocument.KIND_OCENA_MEDICINE_RADA)
        self.assertTrue(ocena.optional)

        obrazac1 = CompanyDocumentKind.objects.get(
            code=CompanyDocument.KIND_OBRAZAC1)
        self.assertTrue(obrazac1.optional)

        contract = CompanyDocumentKind.objects.get(
            code=CompanyDocument.KIND_CONTRACT)
        self.assertFalse(contract.optional)

    def test_seed_is_idempotent(self):
        cmd = AddSetupCommand()
        cmd._seed_company_document_kinds()
        second_run_created = cmd._seed_company_document_kinds()

        self.assertEqual(second_run_created, 0)
        self.assertEqual(
            CompanyDocumentKind.objects.count(), len(CompanyDocument.KIND_CHOICES)
        )

    def test_list_endpoint_readable_by_any_authenticated_user(self):
        cmd = AddSetupCommand()
        cmd._seed_company_document_kinds()

        user = User.objects.create_user(
            username="plainuser", password="x", email="plainuser@test.local",
        )
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get("/api/partners/company-document-kinds/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["count"], len(CompanyDocument.KIND_CHOICES))

    def test_write_requires_model_permissions(self):
        cmd = AddSetupCommand()
        cmd._seed_company_document_kinds()

        user = User.objects.create_user(
            username="plainuser2", password="x", email="plainuser2@test.local",
        )
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post(
            "/api/partners/company-document-kinds/",
            {"code": "NEW_KIND", "name": "Novi tip"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
