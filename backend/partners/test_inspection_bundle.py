import io
import shutil
import unittest
import uuid

import docx
import fitz
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.test import TestCase
from django.conf import settings
from rest_framework.test import APIClient

from partners.models import ClientCompany, CompanyDocument

User = get_user_model()


def make_company(**kwargs):
    defaults = {"name": "Test firma", "tax_id": uuid.uuid4().hex[:9]}
    defaults.update(kwargs)
    return ClientCompany.objects.create(**defaults)


def make_user():
    return User.objects.create_superuser(
        username=f"admin-{uuid.uuid4().hex[:8]}",
        password="x",
        email=f"admin-{uuid.uuid4().hex[:8]}@test.local",
    )


def make_pdf_bytes(text="test") -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    content = doc.tobytes()
    doc.close()
    return content


def make_docx_bytes(text="test") -> bytes:
    doc = docx.Document()
    doc.add_paragraph(text)
    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()


class InspectionBundleEndpointTest(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client_api = APIClient()
        self.client_api.force_authenticate(user=self.user)
        self.company = make_company()

    def test_two_pdf_documents_merge_into_pdf(self):
        CompanyDocument.objects.create(
            client_company=self.company,
            kind=CompanyDocument.KIND_CONTRACT,
            file=ContentFile(make_pdf_bytes("ugovor"), name="ugovor.pdf"),
            uploaded_by=self.user,
        )
        CompanyDocument.objects.create(
            client_company=self.company,
            kind=CompanyDocument.KIND_DECISION,
            file=ContentFile(make_pdf_bytes("odluka"), name="odluka.pdf"),
            uploaded_by=self.user,
        )

        response = self.client_api.get(
            f"/api/partners/client-companies/{self.company.id}/inspection-bundle/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.content.startswith(b"%PDF"))
        self.assertEqual(response["X-Included-Count"], "2")
        self.assertEqual(response["X-Skipped"], "0")
        self.assertIn("inspekcija_", response["Content-Disposition"])

    def test_company_without_documents_returns_400(self):
        response = self.client_api.get(
            f"/api/partners/client-companies/{self.company.id}/inspection-bundle/"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())

    @unittest.skipUnless(
        shutil.which(getattr(settings, "LIBREOFFICE_BIN", "soffice")),
        "LibreOffice not available",
    )
    def test_docx_and_pdf_documents_merge_into_pdf(self):
        CompanyDocument.objects.create(
            client_company=self.company,
            kind=CompanyDocument.KIND_CONTRACT,
            file=ContentFile(make_docx_bytes("ugovor"), name="ugovor.docx"),
            uploaded_by=self.user,
        )
        CompanyDocument.objects.create(
            client_company=self.company,
            kind=CompanyDocument.KIND_DECISION,
            file=ContentFile(make_pdf_bytes("odluka"), name="odluka.pdf"),
            uploaded_by=self.user,
        )

        response = self.client_api.get(
            f"/api/partners/client-companies/{self.company.id}/inspection-bundle/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.content.startswith(b"%PDF"))
        self.assertEqual(response["X-Included-Count"], "2")
        self.assertEqual(response["X-Skipped"], "0")
