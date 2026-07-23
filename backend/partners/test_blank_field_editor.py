import shutil
import uuid
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from documents.models import DocumentCategory, DocumentTemplate
from documents.utils import existing_page_urls
from partners.models import ClientCompany, JobRole, TrainingType

User = get_user_model()


def make_company(**kwargs):
    defaults = {"name": "Test firma", "tax_id": uuid.uuid4().hex[:9]}
    defaults.update(kwargs)
    return ClientCompany.objects.create(**defaults)


def make_cache_dir(cache_key: str) -> Path:
    cache_dir = Path(settings.MEDIA_ROOT) / "template_pages" / cache_key
    cache_dir.mkdir(parents=True, exist_ok=True)
    (cache_dir / "page_0.png").write_bytes(b"fake png")
    return cache_dir


class BlankTemplateFieldsAPITestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="blankfieldseditor",
            password="x",
            email="blankfieldseditor@test.local",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.category = DocumentCategory.objects.create(name="Test kategorija")
        self.master_placeholders = [
            {
                "id": "ph_master_1",
                "fieldKey": "employee.first_name",
                "page": 0,
                "xPct": 10,
                "yPct": 10,
                "widthPct": 12,
                "heightPct": 2.2,
                "fontSize": 10,
            }
        ]
        self.obrazac6_master = DocumentTemplate.objects.create(
            name="Obrazac 6 — evidencija o osposobljenosti za bezbedan rad",
            context_type=DocumentTemplate.CONTEXT_EMPLOYEE,
            category=self.category,
            generation_config={
                "mode": "VISUAL",
                "placeholders": self.master_placeholders,
            },
        )
        self.company = make_company()
        self.role = JobRole.objects.create(
            client_company=self.company, name="Radno mesto test",
        )
        self.role.obrazac6_template.save(
            "obrazac6_blank.docx", ContentFile(b"fake docx bytes"), save=True,
        )
        self.addCleanup(self.role.obrazac6_template.delete, save=False)

    def test_get_fields_returns_master_placeholders_for_prefill(self):
        response = self.client.get(
            f"/api/partners/blank-templates/job-role-obrazac6/{self.role.id}/fields/",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["placeholders"], [])
        self.assertEqual(
            response.data["master_placeholders"], self.master_placeholders,
        )

    def test_save_and_fetch_roundtrip(self):
        placeholders = [
            {
                "id": "ph_1",
                "fieldKey": "employee.last_name",
                "page": 0,
                "xPct": 20,
                "yPct": 30,
                "widthPct": 15,
                "heightPct": 3,
                "fontSize": 12,
            }
        ]
        response = self.client.post(
            f"/api/partners/blank-templates/job-role-obrazac6/{self.role.id}/fields/",
            {"placeholders": placeholders},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.role.refresh_from_db()
        self.assertEqual(self.role.obrazac6_fields, placeholders)

        get_response = self.client.get(
            f"/api/partners/blank-templates/job-role-obrazac6/{self.role.id}/fields/",
        )
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.data["placeholders"], placeholders)

    def test_save_validation_error_font_size_out_of_range(self):
        placeholders = [
            {
                "id": "ph_1",
                "fieldKey": "employee.last_name",
                "page": 0,
                "xPct": 20,
                "yPct": 30,
                "widthPct": 15,
                "heightPct": 3,
                "fontSize": 100,
            }
        ]
        response = self.client.post(
            f"/api/partners/blank-templates/job-role-obrazac6/{self.role.id}/fields/",
            {"placeholders": placeholders},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_save_validation_error_not_a_list(self):
        response = self.client.post(
            f"/api/partners/blank-templates/job-role-obrazac6/{self.role.id}/fields/",
            {"placeholders": "not-a-list"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_save_validation_error_missing_placeholders(self):
        response = self.client.post(
            f"/api/partners/blank-templates/job-role-obrazac6/{self.role.id}/fields/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_unknown_target_returns_400(self):
        response = self.client.get(
            f"/api/partners/blank-templates/unknown-target/{self.role.id}/fields/",
        )
        self.assertEqual(response.status_code, 400)

    def test_pages_stream_returns_400_when_no_file(self):
        role_without_file = JobRole.objects.create(
            client_company=self.company, name="Radno mesto bez fajla",
        )
        response = self.client.get(
            f"/api/partners/blank-templates/job-role-obrazac6/{role_without_file.id}/pages/stream/",
        )
        self.assertEqual(response.status_code, 400)

    def test_regenerate_pages_returns_400_when_no_file(self):
        role_without_file = JobRole.objects.create(
            client_company=self.company, name="Radno mesto bez fajla 2",
        )
        response = self.client.post(
            f"/api/partners/blank-templates/job-role-obrazac6/{role_without_file.id}/regenerate-pages/",
        )
        self.assertEqual(response.status_code, 400)

    def test_job_role_upload_invalidates_cache(self):
        cache_key = f"blank_job-role-obrazac6_{self.role.id}"
        cache_dir = make_cache_dir(cache_key)
        self.addCleanup(shutil.rmtree, cache_dir, ignore_errors=True)
        self.assertIsNotNone(existing_page_urls(cache_key))

        response = self.client.post(
            f"/api/partners/job-roles/{self.role.id}/templates/obrazac6/",
            {
                "file": SimpleUploadedFile(
                    "new_blank.docx", b"new fake docx bytes",
                ),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(existing_page_urls(cache_key))

    def test_job_role_clear_invalidates_cache(self):
        self.role.lzo_revers_template.save(
            "lzo_blank.docx", ContentFile(b"fake docx bytes"), save=True,
        )
        cache_key = f"blank_job-role-lzo_{self.role.id}"
        cache_dir = make_cache_dir(cache_key)
        self.addCleanup(shutil.rmtree, cache_dir, ignore_errors=True)
        self.assertIsNotNone(existing_page_urls(cache_key))

        response = self.client.delete(
            f"/api/partners/job-roles/{self.role.id}/templates/lzo-revers/",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(existing_page_urls(cache_key))

    def test_training_type_upload_invalidates_cache(self):
        DocumentTemplate.objects.create(
            name="Potvrda po članu 5",
            context_type=DocumentTemplate.CONTEXT_EMPLOYEE,
            category=self.category,
            generation_config={"mode": "VISUAL", "placeholders": []},
        )
        training_type = TrainingType.objects.create(
            client_company=self.company, name="Obuka test",
        )
        training_type.potvrda_template.save(
            "potvrda_blank.docx", ContentFile(b"fake docx bytes"), save=True,
        )
        self.addCleanup(training_type.potvrda_template.delete, save=False)

        cache_key = f"blank_training-type-potvrda_{training_type.id}"
        cache_dir = make_cache_dir(cache_key)
        self.addCleanup(shutil.rmtree, cache_dir, ignore_errors=True)
        self.assertIsNotNone(existing_page_urls(cache_key))

        response = self.client.patch(
            f"/api/partners/training-types/{training_type.id}/",
            {
                "potvrda_template": SimpleUploadedFile(
                    "new_potvrda.docx", b"new fake docx bytes",
                ),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(existing_page_urls(cache_key))

    def test_training_type_clear_invalidates_cache(self):
        training_type = TrainingType.objects.create(
            client_company=self.company, name="Obuka test 2",
        )
        training_type.potvrda_template.save(
            "potvrda_blank.docx", ContentFile(b"fake docx bytes"), save=True,
        )
        self.addCleanup(training_type.potvrda_template.delete, save=False)

        cache_key = f"blank_training-type-potvrda_{training_type.id}"
        cache_dir = make_cache_dir(cache_key)
        self.addCleanup(shutil.rmtree, cache_dir, ignore_errors=True)
        self.assertIsNotNone(existing_page_urls(cache_key))

        response = self.client.patch(
            f"/api/partners/training-types/{training_type.id}/",
            {"potvrda_template": None},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(existing_page_urls(cache_key))
