import uuid

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from partners.models import (
    ClientCompany,
    ClientIntakeLink,
    ClientIntakeSubmission,
    Employee,
    EquipmentItem,
)
from processes.models import ProcessBinding, ProcessType

User = get_user_model()


def make_company(**kwargs):
    defaults = {"name": "Test firma upitnik", "tax_id": uuid.uuid4().hex[:9]}
    defaults.update(kwargs)
    return ClientCompany.objects.create(**defaults)


def make_process_type(code, subject_kind, **kwargs):
    defaults = {
        "code": code,
        "name": f"Proces {code}",
        "subject_kind": subject_kind,
        "domain": ProcessType.DOMAIN_BZNR,
        "shape": ProcessType.SHAPE_PERIODIC,
        "proof_kind": ProcessType.PROOF_RECORDED,
        "applicability_rule": {"always": True},
        "is_active": True,
    }
    defaults.update(kwargs)
    return ProcessType.objects.create(**defaults)


def make_superuser():
    return User.objects.create_superuser(
        username=f"admin-{uuid.uuid4().hex[:8]}",
        password="x",
        email=f"admin-{uuid.uuid4().hex[:8]}@test.local",
    )


class IntakePublicPageTest(TestCase):
    def setUp(self):
        self.company = make_company()
        self.link = ClientIntakeLink.objects.create(client_company=self.company)
        self.client = Client()

    def test_form_page_renders(self):
        response = self.client.get(f"/intake/{self.link.token}/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.company.name)
        self.assertContains(response, "Novi zaposleni")
        self.assertContains(response, "Nova oprema")

    def test_submit_employee_kind(self):
        response = self.client.post(
            f"/intake/{self.link.token}/",
            {
                "kind": "EMPLOYEE",
                "first_name": "Petar",
                "last_name": "Petrović",
                "position": "Vozač",
                "national_id": "1234567890123",
                "date_of_birth": "1990-01-01",
                "email": "petar@example.com",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Hvala")
        submission = ClientIntakeSubmission.objects.get()
        self.assertEqual(submission.kind, ClientIntakeSubmission.KIND_EMPLOYEE)
        self.assertEqual(submission.status, ClientIntakeSubmission.STATUS_PENDING)
        self.assertEqual(submission.data["first_name"], "Petar")
        self.assertEqual(submission.data["position"], "Vozač")

    def test_submit_equipment_kind(self):
        response = self.client.post(
            f"/intake/{self.link.token}/",
            {
                "kind": "EQUIPMENT",
                "name": "Viljuškar",
                "category": "Mehanizacija",
                "inventory_number": "INV-1",
                "location": "Hala 1",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Hvala")
        submission = ClientIntakeSubmission.objects.get()
        self.assertEqual(submission.kind, ClientIntakeSubmission.KIND_EQUIPMENT)
        self.assertEqual(submission.data["name"], "Viljuškar")

    def test_submit_missing_required_fields_shows_error(self):
        response = self.client.post(
            f"/intake/{self.link.token}/",
            {"kind": "EMPLOYEE", "first_name": "", "last_name": ""},
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(ClientIntakeSubmission.objects.exists())

    def test_invalid_token_returns_404(self):
        response = self.client.get("/intake/does-not-exist/")
        self.assertEqual(response.status_code, 404)

    def test_inactive_link_returns_404(self):
        self.link.is_active = False
        self.link.save(update_fields=["is_active"])
        response = self.client.get(f"/intake/{self.link.token}/")
        self.assertEqual(response.status_code, 404)


class IntakeApprovalTest(TestCase):
    def setUp(self):
        self.company = make_company()
        self.link = ClientIntakeLink.objects.create(client_company=self.company)
        self.user = make_superuser()
        self.client_api = APIClient()
        self.client_api.force_authenticate(user=self.user)
        make_process_type("OSPOSOBLJAVANJE_BZR", ProcessType.SUBJECT_EMPLOYEE)
        make_process_type("ZOP_OBUKA", ProcessType.SUBJECT_EMPLOYEE)
        make_process_type("LZO_ZADUZENJE", ProcessType.SUBJECT_EMPLOYEE)

    def _make_submission(self, kind, data):
        return ClientIntakeSubmission.objects.create(
            link=self.link, kind=kind, data=data,
        )

    def test_approve_employee_creates_employee_with_bindings(self):
        submission = self._make_submission(
            ClientIntakeSubmission.KIND_EMPLOYEE,
            {
                "first_name": "Ana",
                "last_name": "Anić",
                "position": "",
                "national_id": "1111111111111",
                "date_of_birth": "1995-05-05",
                "email": "ana@example.com",
            },
        )
        response = self.client_api.post(
            f"/api/partners/intake-submissions/{submission.id}/approve/"
        )
        self.assertEqual(response.status_code, 200, response.data)
        submission.refresh_from_db()
        self.assertEqual(submission.status, ClientIntakeSubmission.STATUS_APPROVED)
        self.assertEqual(submission.reviewed_by_id, self.user.id)

        employee = Employee.objects.get(first_name="Ana", last_name="Anić")
        self.assertEqual(employee.client_company_id, self.company.id)

        binding_exists = ProcessBinding.objects.filter(
            subject_kind=ProcessBinding.SUBJECT_EMPLOYEE,
            employee=employee,
            process_type__code="OSPOSOBLJAVANJE_BZR",
            is_active=True,
        ).exists()
        self.assertTrue(binding_exists)

    def test_approve_equipment_creates_equipment_item(self):
        submission = self._make_submission(
            ClientIntakeSubmission.KIND_EQUIPMENT,
            {
                "name": "Viljuškar",
                "category": "Mehanizacija",
                "inventory_number": "INV-2",
                "location": "Hala 2",
            },
        )
        response = self.client_api.post(
            f"/api/partners/intake-submissions/{submission.id}/approve/"
        )
        self.assertEqual(response.status_code, 200, response.data)
        submission.refresh_from_db()
        self.assertEqual(submission.status, ClientIntakeSubmission.STATUS_APPROVED)

        equipment = EquipmentItem.objects.get(name="Viljuškar")
        self.assertEqual(equipment.client_company_id, self.company.id)
        self.assertEqual(equipment.inventory_number, "INV-2")

    def test_reject_submission(self):
        submission = self._make_submission(
            ClientIntakeSubmission.KIND_EQUIPMENT,
            {"name": "Test oprema"},
        )
        response = self.client_api.post(
            f"/api/partners/intake-submissions/{submission.id}/reject/"
        )
        self.assertEqual(response.status_code, 200, response.data)
        submission.refresh_from_db()
        self.assertEqual(submission.status, ClientIntakeSubmission.STATUS_REJECTED)
        self.assertEqual(submission.reviewed_by_id, self.user.id)

    def test_cannot_approve_already_reviewed_submission(self):
        submission = self._make_submission(
            ClientIntakeSubmission.KIND_EQUIPMENT,
            {"name": "Test oprema"},
        )
        self.client_api.post(
            f"/api/partners/intake-submissions/{submission.id}/reject/"
        )
        response = self.client_api.post(
            f"/api/partners/intake-submissions/{submission.id}/approve/"
        )
        self.assertEqual(response.status_code, 400)


class IntakeApiPermissionsTest(TestCase):
    def setUp(self):
        self.company = make_company()
        self.link = ClientIntakeLink.objects.create(client_company=self.company)

    def test_anonymous_cannot_list_links(self):
        client = APIClient()
        response = client.get("/api/partners/intake-links/")
        self.assertEqual(response.status_code, 401)

    def test_anonymous_cannot_list_submissions(self):
        client = APIClient()
        response = client.get("/api/partners/intake-submissions/")
        self.assertEqual(response.status_code, 401)

    def test_anonymous_cannot_approve(self):
        submission = ClientIntakeSubmission.objects.create(
            link=self.link,
            kind=ClientIntakeSubmission.KIND_EQUIPMENT,
            data={"name": "X"},
        )
        client = APIClient()
        response = client.post(
            f"/api/partners/intake-submissions/{submission.id}/approve/"
        )
        self.assertEqual(response.status_code, 401)
