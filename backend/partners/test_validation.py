import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import (
    ClientCompany,
    Employee,
    JobRole,
    RiskLevel,
    TrainingType,
)

User = get_user_model()


def valid_jmbg(base12="010199050000"):
    weights = (7, 6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2)
    total = sum(int(base12[i]) * weights[i] for i in range(12))
    remainder = 11 - (total % 11)
    control = 0 if remainder in (10, 11) else remainder
    return base12 + str(control)


class ValidationTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            "val", "val@example.com", "pass12345")
        self.client.force_authenticate(user=self.user)
        self.risk = RiskLevel.objects.create(
            code="R1", label="Nizak", score=1, order=1)
        self.company = ClientCompany.objects.create(
            name="Firma", tax_id=uuid.uuid4().hex[:9])
        self.role = JobRole.objects.create(
            client_company=self.company, name="Radnik", risk_level=self.risk)

    def _post_employee(self, **overrides):
        payload = {
            "client_company": self.company.id,
            "first_name": "Petar",
            "last_name": "Petrović",
            "job_role": self.role.id,
        }
        payload.update(overrides)
        return self.client.post(
            "/api/partners/employees/", payload, format="json")

    def test_valid_jmbg_accepted(self):
        r = self._post_employee(national_id=valid_jmbg())
        self.assertEqual(r.status_code, 201, r.data)

    def test_blank_jmbg_accepted(self):
        r = self._post_employee(national_id="")
        self.assertEqual(r.status_code, 201, r.data)

    def test_non_numeric_jmbg_rejected(self):
        r = self._post_employee(national_id="ABCDEFGHIJKLM")
        self.assertEqual(r.status_code, 400)
        self.assertIn("national_id", r.data)

    def test_short_jmbg_rejected(self):
        r = self._post_employee(national_id="123")
        self.assertEqual(r.status_code, 400)

    def test_bad_checksum_jmbg_rejected(self):
        good = valid_jmbg()
        bad = good[:12] + str((int(good[12]) + 1) % 10)
        r = self._post_employee(national_id=bad)
        self.assertEqual(r.status_code, 400)

    def test_future_birth_date_rejected(self):
        future = (timezone.localdate() + timedelta(days=1)).isoformat()
        r = self._post_employee(date_of_birth=future)
        self.assertEqual(r.status_code, 400)
        self.assertIn("date_of_birth", r.data)

    def test_past_birth_date_accepted(self):
        r = self._post_employee(date_of_birth="1990-05-05")
        self.assertEqual(r.status_code, 201, r.data)

    def _post_company(self, **overrides):
        payload = {"name": "Nova firma", "tax_id": "123456789"}
        payload.update(overrides)
        return self.client.post(
            "/api/partners/client-companies/", payload, format="json")

    def test_valid_pib_accepted(self):
        r = self._post_company(tax_id="123456789")
        self.assertEqual(r.status_code, 201, r.data)

    def test_letters_pib_rejected(self):
        r = self._post_company(tax_id="ABCDEFGHI")
        self.assertEqual(r.status_code, 400)
        self.assertIn("tax_id", r.data)

    def test_short_pib_rejected(self):
        r = self._post_company(tax_id="12345")
        self.assertEqual(r.status_code, 400)

    def test_bad_maticni_broj_rejected(self):
        r = self._post_company(tax_id="987654321", registration_number="12ab")
        self.assertEqual(r.status_code, 400)
        self.assertIn("registration_number", r.data)

    def test_valid_maticni_broj_accepted(self):
        r = self._post_company(
            tax_id="987654321", registration_number="12345678")
        self.assertEqual(r.status_code, 201, r.data)

    def test_future_injury_date_rejected(self):
        emp = Employee.objects.create(
            client_company=self.company, first_name="A", last_name="B",
            job_role=self.role)
        future = (timezone.localdate() + timedelta(days=1)).isoformat()
        r = self.client.post(
            "/api/partners/work-injuries/",
            {"client_company": self.company.id, "employee": emp.id,
             "date": future, "severity": "LAKA", "description": "x"},
            format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("date", r.data)

    def test_training_valid_until_before_completed_rejected(self):
        emp = Employee.objects.create(
            client_company=self.company, first_name="A", last_name="B",
            job_role=self.role)
        tt = TrainingType.objects.create(
            client_company=self.company, name="Viljuškar")
        r = self.client.post(
            "/api/partners/employee-trainings/",
            {"employee": emp.id, "training_type": tt.id,
             "completed_at": "2026-05-05", "valid_until": "2026-01-01"},
            format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("valid_until", r.data)

    def test_training_valid_order_accepted(self):
        emp = Employee.objects.create(
            client_company=self.company, first_name="C", last_name="D",
            job_role=self.role)
        tt = TrainingType.objects.create(
            client_company=self.company, name="Bager")
        r = self.client.post(
            "/api/partners/employee-trainings/",
            {"employee": emp.id, "training_type": tt.id,
             "completed_at": "2026-01-01", "valid_until": "2028-01-01"},
            format="json")
        self.assertEqual(r.status_code, 201, r.data)
