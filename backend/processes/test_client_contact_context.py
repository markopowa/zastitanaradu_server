import uuid
from datetime import date

from django.test import TestCase

from documents.utils import build_preview_context
from partners.models import ClientCompany, ContactPerson, Employee
from processes.models import ProcessBinding, ProcessRun, ProcessType
from processes.utils import _build_document_context, binding_subject_snapshot


def make_company(**kwargs):
    defaults = {"name": "Test firma", "tax_id": uuid.uuid4().hex[:9]}
    defaults.update(kwargs)
    return ClientCompany.objects.create(**defaults)


def make_process_type(**kwargs):
    defaults = {
        "name": "Test obaveza",
        "subject_kind": ProcessType.SUBJECT_EMPLOYEE,
    }
    defaults.update(kwargs)
    return ProcessType.objects.create(**defaults)


class ClientContactContextTest(TestCase):
    def _make_run_for_employee(self, employee):
        pt = make_process_type(subject_kind=ProcessType.SUBJECT_EMPLOYEE)
        binding = ProcessBinding.objects.create(
            process_type=pt,
            subject_kind=ProcessBinding.SUBJECT_EMPLOYEE,
            employee=employee,
            is_active=True,
            next_run_at=date.today(),
        )
        snapshot = binding_subject_snapshot(binding)
        run = ProcessRun.objects.create(
            process_binding=binding,
            process_type=pt,
            scheduled_for=date.today(),
            status=ProcessRun.STATUS_PENDING,
            subject_snapshot=snapshot,
        )
        return _build_document_context(run, snapshot)

    def test_director_and_contact_resolved_for_employee_subject(self):
        company = make_company()
        employee = Employee.objects.create(
            client_company=company,
            first_name="Jovana",
            last_name="Jovanović",
        )
        ContactPerson.objects.create(
            client_company=company,
            full_name="Petar Petrović",
            role=ContactPerson.ROLE_DIRECTOR,
            phone="+381 60 1112223",
            email="direktor@demo.rs",
            is_primary=False,
        )
        ContactPerson.objects.create(
            client_company=company,
            full_name="Jelena Jelić",
            role=ContactPerson.ROLE_CONTACT,
            phone="+381 60 3334445",
            email="kontakt@demo.rs",
            is_primary=True,
        )

        ctx = self._make_run_for_employee(employee)
        client = ctx["client"]

        self.assertEqual(client["director_name"], "Petar Petrović")
        self.assertEqual(client["director_phone"], "+381 60 1112223")
        self.assertEqual(client["director_email"], "direktor@demo.rs")
        self.assertEqual(client["contact_name"], "Jelena Jelić")
        self.assertEqual(client["contact_phone"], "+381 60 3334445")
        self.assertEqual(client["contact_email"], "kontakt@demo.rs")

    def test_director_and_contact_default_to_primary_when_no_dedicated_contact(self):
        company = make_company()
        employee = Employee.objects.create(
            client_company=company,
            first_name="Ana",
            last_name="Anić",
        )
        ContactPerson.objects.create(
            client_company=company,
            full_name="Marko Marković",
            role=ContactPerson.ROLE_DIRECTOR,
            phone="+381 60 9998887",
            email="direktor2@demo.rs",
            is_primary=True,
        )

        ctx = self._make_run_for_employee(employee)
        client = ctx["client"]

        self.assertEqual(client["director_name"], "Marko Marković")
        self.assertEqual(client["contact_name"], "Marko Marković")
        self.assertEqual(client["contact_phone"], "+381 60 9998887")
        self.assertEqual(client["contact_email"], "direktor2@demo.rs")

    def test_missing_contact_persons_yield_empty_strings_no_crash(self):
        company = make_company()
        employee = Employee.objects.create(
            client_company=company,
            first_name="Nina",
            last_name="Ninić",
        )

        ctx = self._make_run_for_employee(employee)
        client = ctx["client"]

        self.assertEqual(client["director_name"], "")
        self.assertEqual(client["director_phone"], "")
        self.assertEqual(client["director_email"], "")
        self.assertEqual(client["contact_name"], "")
        self.assertEqual(client["contact_phone"], "")
        self.assertEqual(client["contact_email"], "")

    def test_build_preview_context_contains_client_contact_keys(self):
        ctx = build_preview_context()
        client = ctx["client"]
        for key in (
            "director_name",
            "director_phone",
            "director_email",
            "contact_name",
            "contact_phone",
            "contact_email",
        ):
            self.assertIn(key, client)
            self.assertTrue(client[key])
