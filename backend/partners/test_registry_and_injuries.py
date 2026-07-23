import uuid
from datetime import date
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase
from rest_framework.test import APIClient

from partners.models import (
    ClientCompany,
    CompanyDocument,
    Employee,
    JobRole,
    RiskLevel,
    WorkInjury,
)
from processes.models import ActivityLog

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


class HighRiskRegistryEndpointTest(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client_api = APIClient()
        self.client_api.force_authenticate(user=self.user)
        self.company = make_company()
        self.risk_high = RiskLevel.objects.create(
            code="HIGH",
            label="Visok",
            score=4,
            is_high_risk=True,
            order=1,
        )
        self.risk_low = RiskLevel.objects.create(
            code="LOW",
            label="Nizak",
            score=1,
            is_high_risk=False,
            order=0,
        )
        self.job_role_high = JobRole.objects.create(
            client_company=self.company,
            name="Rukovalac viljuškarom",
            risk_level=self.risk_high,
        )
        self.job_role_low = JobRole.objects.create(
            client_company=self.company,
            name="Administrator",
            risk_level=self.risk_low,
        )
        self.high_risk_employee = Employee.objects.create(
            client_company=self.company,
            first_name="Ivan",
            last_name="Ivic",
            job_role=self.job_role_high,
            high_risk_position_name="Rukovalac viljuškarom",
        )
        self.low_risk_employee = Employee.objects.create(
            client_company=self.company,
            first_name="Ana",
            last_name="Anic",
            job_role=self.job_role_low,
        )

    def test_returns_docx_bytes(self):
        response = self.client_api.get(
            f"/api/partners/client-companies/{self.company.id}/high-risk-registry/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.content) > 0)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument"
            ".wordprocessingml.document",
        )

    def test_persists_company_document(self):
        self.client_api.get(
            f"/api/partners/client-companies/{self.company.id}/high-risk-registry/"
        )
        self.assertEqual(
            CompanyDocument.objects.filter(
                client_company=self.company,
                kind=CompanyDocument.KIND_HIGH_RISK_REGISTRY,
            ).count(),
            1,
        )

    def test_calling_again_replaces_single_row(self):
        self.client_api.get(
            f"/api/partners/client-companies/{self.company.id}/high-risk-registry/"
        )
        self.client_api.get(
            f"/api/partners/client-companies/{self.company.id}/high-risk-registry/"
        )
        self.assertEqual(
            CompanyDocument.objects.filter(
                client_company=self.company,
                kind=CompanyDocument.KIND_HIGH_RISK_REGISTRY,
            ).count(),
            1,
        )


class WorkInjuryCrudTest(TestCase):
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

    def test_create_work_injury(self):
        response = self.client_api.post(
            "/api/partners/work-injuries/",
            {
                "client_company": self.company.id,
                "employee": self.employee.id,
                "date": date.today().isoformat(),
                "severity": WorkInjury.SEVERITY_LAKA,
                "description": "Uganuće zgloba.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(WorkInjury.objects.count(), 1)
        injury = WorkInjury.objects.get()
        self.assertEqual(injury.created_by, self.user)

    def test_list_filters_by_client_company_id(self):
        other_company = make_company(name="Druga firma")
        other_employee = Employee.objects.create(
            client_company=other_company,
            first_name="Marko",
            last_name="Markovic",
        )
        WorkInjury.objects.create(
            client_company=self.company,
            employee=self.employee,
            date=date.today(),
            severity=WorkInjury.SEVERITY_LAKA,
        )
        WorkInjury.objects.create(
            client_company=other_company,
            employee=other_employee,
            date=date.today(),
            severity=WorkInjury.SEVERITY_TESKA,
        )
        response = self.client_api.get(
            f"/api/partners/work-injuries/?client_company_id={self.company.id}"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        results = data["results"] if isinstance(data, dict) else data
        self.assertEqual(len(results), 1)

    def test_update_and_delete_work_injury(self):
        injury = WorkInjury.objects.create(
            client_company=self.company,
            employee=self.employee,
            date=date.today(),
            severity=WorkInjury.SEVERITY_LAKA,
        )
        response = self.client_api.patch(
            f"/api/partners/work-injuries/{injury.id}/",
            {"severity": WorkInjury.SEVERITY_TESKA},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        injury.refresh_from_db()
        self.assertEqual(injury.severity, WorkInjury.SEVERITY_TESKA)

        response = self.client_api.delete(
            f"/api/partners/work-injuries/{injury.id}/"
        )
        self.assertEqual(response.status_code, 204)
        self.assertEqual(WorkInjury.objects.count(), 0)


class SevereWorkInjuryAlertTest(TestCase):
    def setUp(self):
        self.user = make_user()
        self.client_api = APIClient()
        self.client_api.force_authenticate(user=self.user)
        self.company = make_company(email="firma@primer.rs")
        self.employee = Employee.objects.create(
            client_company=self.company,
            first_name="Petar",
            last_name="Petrovic",
        )

    def _create_injury(self, severity):
        return self.client_api.post(
            "/api/partners/work-injuries/",
            {
                "client_company": self.company.id,
                "employee": self.employee.id,
                "date": date.today().isoformat(),
                "severity": severity,
                "description": "Test opis.",
            },
            format="json",
        )

    def test_teska_injury_sends_alert_email(self):
        response = self._create_injury(WorkInjury.SEVERITY_TESKA)
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertIn("Petar Petrovic", message.body)
        self.assertIn(self.company.name, message.body)
        self.assertIn("čl. 50", message.body)
        self.assertIn(self.company.email, message.to)

    def test_smrtna_and_kolektivna_send_alert_email(self):
        for severity in (
            WorkInjury.SEVERITY_SMRTNA,
            WorkInjury.SEVERITY_KOLEKTIVNA,
        ):
            mail.outbox.clear()
            response = self._create_injury(severity)
            self.assertEqual(response.status_code, 201, response.content)
            self.assertEqual(len(mail.outbox), 1)

    def test_laka_injury_sends_no_email(self):
        response = self._create_injury(WorkInjury.SEVERITY_LAKA)
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(len(mail.outbox), 0)

    def test_teska_injury_writes_activity_log(self):
        response = self._create_injury(WorkInjury.SEVERITY_TESKA)
        self.assertEqual(response.status_code, 201, response.content)
        log = ActivityLog.objects.filter(
            event_type=ActivityLog.EVENT_RUN_SENT,
        ).first()
        self.assertIsNotNone(log)
        self.assertIn("Petar Petrovic", log.description)
        self.assertIn(self.company.name, log.description)

    def test_email_failure_does_not_break_injury_creation(self):
        with patch(
            "core.email_sender.SMTPEmailSender.send",
            side_effect=RuntimeError("boom"),
        ):
            response = self._create_injury(WorkInjury.SEVERITY_TESKA)
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(WorkInjury.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 0)
