"""
End-to-end integration test walking the full "after initial setup, this is
how you use it" flow, using the real production helpers and management
commands (not reimplementations).

This test doubles as the machine-checked script for a demo video: each
numbered step corresponds to a step in the user-facing guide (see
comments referencing "guide NN") and asserts the observable state that a
person following the guide would see in the app.

Run with:
    .venv/bin/python manage.py test processes.test_integration_flow \
        --settings=core.settings_test
"""
from datetime import date, timedelta

from dateutil.relativedelta import relativedelta

from django.core import mail
from django.core.files.base import ContentFile
from django.core.management import call_command
from django.test import TestCase

from documents.models import DocumentTemplate
from partners.employee_bindings import ensure_default_bindings_for_employee
from partners.equipment_bindings import ensure_default_bindings_for_equipment
from partners.document_service import OBRAZAC1, render_company_document
from partners.models import (
    ClientCompany,
    Employee,
    EquipmentItem,
    JobRole,
    JobRoleLZO,
    RiskLevel,
)
from processes.models import (
    NotificationOutbox,
    ProcessBinding,
    ProcessRun,
    ProcessType,
)
from processes.process_run_completion import apply_process_run_completion


class FullOnboardingToOperationsFlowTest(TestCase):
    """
    Mirrors the "manual.md" onboarding guide end to end:

      1. SETUP            - seed the catalog (add_setup)
      2. COMPANY          - create a client company + profile + job roles
      3. HIGH-RISK EMP.   - hire a high-risk employee, provision obligations
      4. LOW-RISK EMP.    - hire a low-risk employee, provision obligations
      5. CHAINING         - complete PRETHODNI_LEKARSKI -> LEKARSKI_PREGLED
      6. EQUIPMENT        - register a fire extinguisher, provision service
      7. COMPLIANCE       - upload two stručni nalaz findings (valid/expiring)
      8. REMINDERS        - run the due-process + reminder commands
      9. OBRAZAC 1        - generate the medical exam record docx
    """

    @classmethod
    def setUpTestData(cls):
        # ---- STEP 1: SETUP -------------------------------------------------
        # `add_setup` is the one command an admin runs after a fresh deploy:
        # it seeds risk levels + template fields, the obligation catalog
        # (9 ProcessTypes), the compliance finding types, the medical
        # referral ("Uput") document template, and the reminder templates
        # for every obligation.
        call_command("add_setup", verbosity=0)

    def setUp(self):
        self.today = date.today()

    # ------------------------------------------------------------------
    # STEP 1 assertions
    # ------------------------------------------------------------------
    def test_01_setup_seeds_catalog(self):
        expected_codes = {
            "OSPOSOBLJAVANJE_BZR",
            "ZOP_OBUKA",
            "LZO_ZADUZENJE",
            "PRETHODNI_LEKARSKI",
            "LEKARSKI_PREGLED",
            "PP_APARATI_SERVIS",
            "HIDRANTI_ISPITIVANJE",
            "HIDRANTSKA_CREVA",
            "SDP_PREGLED",
        }
        seeded_codes = set(
            ProcessType.objects.filter(
                code__in=expected_codes).values_list("code", flat=True)
        )
        self.assertEqual(seeded_codes, expected_codes)
        self.assertTrue(RiskLevel.objects.filter(is_high_risk=True).exists())
        self.assertTrue(
            DocumentTemplate.objects.filter(
                name="Uput za lekarski pregled").exists()
        )

    def test_02_through_09_full_flow(self):
        # ------------------------------------------------------------------
        # STEP 2: COMPANY (guide 03/04) - create the client company, set its
        # profile (installations + high-risk activity flag), then define two
        # job roles: one tied to a high-risk RiskLevel, one to a
        # non-high-risk RiskLevel.
        # ------------------------------------------------------------------
        company = ClientCompany.objects.create(
            name="UKRAS DOO",
            tax_id="109988771",
            email="uprava@ukras.rs",
            installations=["FIRE_EXTINGUISHERS"],
        )

        risk_high = RiskLevel.objects.filter(is_high_risk=True).first()
        risk_low = RiskLevel.objects.filter(is_high_risk=False).first()
        self.assertIsNotNone(risk_high)
        self.assertIsNotNone(risk_low)

        role_high = JobRole.objects.create(
            client_company=company,
            name="Rukovalac viljuškarom",
            risk_level=risk_high,
        )
        JobRoleLZO.objects.create(job_role=role_high, name="Zaštitne cipele")
        role_low = JobRole.objects.create(
            client_company=company,
            name="Administrativni referent",
            risk_level=risk_low,
        )

        # ------------------------------------------------------------------
        # STEP 3: HIGH-RISK EMPLOYEE (guide 06) - hiring an employee on a
        # high-risk job role and provisioning them (what
        # EmployeeViewSet.perform_create does) must open bindings + runs for
        # the training/medical obligations, but NOT the periodic medical
        # exam yet (that only appears via chaining, step 5).
        # ------------------------------------------------------------------
        emp_high = Employee.objects.create(
            client_company=company,
            first_name="Marko",
            last_name="Petrović",
            job_role=role_high,
        )
        ensure_default_bindings_for_employee(emp_high)

        def bindings_for(employee):
            return {
                b.process_type.code: b
                for b in ProcessBinding.objects.filter(
                    subject_kind=ProcessBinding.SUBJECT_EMPLOYEE,
                    employee=employee,
                    is_active=True,
                ).select_related("process_type")
            }

        high_bindings = bindings_for(emp_high)
        for code in ("OSPOSOBLJAVANJE_BZR", "ZOP_OBUKA", "LZO_ZADUZENJE",
                     "PRETHODNI_LEKARSKI"):
            self.assertIn(code, high_bindings)
            self.assertTrue(
                ProcessRun.objects.filter(
                    process_binding=high_bindings[code],
                    status__in=(ProcessRun.STATUS_PENDING,
                                ProcessRun.STATUS_SENT),
                ).exists(),
                f"expected an open run for {code}",
            )
        self.assertNotIn("LEKARSKI_PREGLED", high_bindings)

        # ------------------------------------------------------------------
        # STEP 4: LOW-RISK EMPLOYEE (guide 06) - a low-risk hire only gets
        # the always-applicable training/LZO obligations, never the medical
        # ones.
        # ------------------------------------------------------------------
        emp_low = Employee.objects.create(
            client_company=company,
            first_name="Ana",
            last_name="Jovanović",
            job_role=role_low,
        )
        ensure_default_bindings_for_employee(emp_low)

        low_bindings = bindings_for(emp_low)
        self.assertIn("OSPOSOBLJAVANJE_BZR", low_bindings)
        self.assertIn("ZOP_OBUKA", low_bindings)
        self.assertNotIn("LZO_ZADUZENJE", low_bindings)
        self.assertNotIn("PRETHODNI_LEKARSKI", low_bindings)
        self.assertNotIn("LEKARSKI_PREGLED", low_bindings)

        # ------------------------------------------------------------------
        # STEP 5: CHAINING (guide 07) - completing the PRETHODNI_LEKARSKI
        # run must automatically open a LEKARSKI_PREGLED binding for the
        # same employee, via the ON_COMPLETED ProcessTemplate that
        # `seed_obligation_catalog` (called from add_setup) already wires
        # with followup_process_type=LEKARSKI_PREGLED. We rely on that
        # seeded wiring rather than creating our own template.
        # ------------------------------------------------------------------
        from processes.models import ProcessTemplate

        self.assertTrue(
            ProcessTemplate.objects.filter(
                process_type__code="PRETHODNI_LEKARSKI",
                trigger=ProcessTemplate.TRIGGER_ON_COMPLETED,
                followup_process_type__code="LEKARSKI_PREGLED",
            ).exists(),
            "add_setup should have wired PRETHODNI_LEKARSKI -> LEKARSKI_PREGLED",
        )

        prethodni_binding = high_bindings["PRETHODNI_LEKARSKI"]
        prethodni_run = ProcessRun.objects.get(
            process_binding=prethodni_binding,
            status__in=(ProcessRun.STATUS_PENDING, ProcessRun.STATUS_SENT),
        )
        valid_until = self.today + timedelta(days=365)
        apply_process_run_completion(prethodni_run, {"valid_until": valid_until})

        prethodni_run.refresh_from_db()
        self.assertEqual(prethodni_run.status, ProcessRun.STATUS_COMPLETED)

        lekarski_binding = ProcessBinding.objects.get(
            subject_kind=ProcessBinding.SUBJECT_EMPLOYEE,
            employee=emp_high,
            is_active=True,
            process_type__code="LEKARSKI_PREGLED",
        )
        self.assertIsNotNone(lekarski_binding.next_run_at)
        self.assertGreater(lekarski_binding.next_run_at, self.today)

        # ------------------------------------------------------------------
        # STEP 6: EQUIPMENT (guide 06) - registering a piece of equipment
        # with a service_process_type wires up the periodic service
        # obligation for it (PP aparat -> semi-annual service).
        # ------------------------------------------------------------------
        pp_aparati_type = ProcessType.objects.get(code="PP_APARATI_SERVIS")
        extinguisher = EquipmentItem.objects.create(
            client_company=company,
            name="PP aparat S-9 hodnik prizemlje",
            category="PP oprema",
            inventory_number="INV-001",
            service_process_type=pp_aparati_type,
        )
        ensure_default_bindings_for_equipment(extinguisher)

        equipment_binding = ProcessBinding.objects.get(
            subject_kind=ProcessBinding.SUBJECT_EQUIPMENT,
            equipment_item=extinguisher,
            process_type=pp_aparati_type,
            is_active=True,
        )
        self.assertTrue(
            ProcessRun.objects.filter(
                process_binding=equipment_binding,
                status__in=(ProcessRun.STATUS_PENDING, ProcessRun.STATUS_SENT),
            ).exists()
        )

        # ------------------------------------------------------------------
        # STEP 7: EXPERT FINDING - uploading a stručni nalaz completes the
        # company-level obligation; the next cycle follows the validity.
        # ------------------------------------------------------------------
        from django.contrib.auth import get_user_model
        from django.core.files.uploadedfile import SimpleUploadedFile

        from partners.obligation_plan import (
            STATUS_DUE_SOON,
            STATUS_OK,
            _binding_status,
        )
        from partners.obligation_proofs import record_proof

        proof_user = get_user_model().objects.create_user(
            "proof_user", password="x")
        pt_equipment = ProcessType.objects.get(code="STRUCNI_NALAZ_OPREMA")
        pt_electrical = ProcessType.objects.get(code="STRUCNI_NALAZ_ELEKTRO")

        run_valid = record_proof(
            pt_equipment,
            company,
            performed_at=self.today,
            uploaded=SimpleUploadedFile(
                "strucni_nalaz_oprema.pdf", b"%PDF-1.4 fake finding"),
            user=proof_user,
        )
        self.assertEqual(
            run_valid.valid_until,
            self.today + relativedelta(
                months=pt_equipment.default_period_months),
        )
        self.assertTrue(run_valid.documents.exists())
        binding_valid = run_valid.process_binding
        binding_valid.refresh_from_db()
        self.assertEqual(binding_valid.next_run_at, run_valid.valid_until)
        self.assertEqual(
            _binding_status(binding_valid, self.today), STATUS_OK)

        issued_almost_expired = (
            self.today
            - relativedelta(months=pt_electrical.default_period_months)
            + timedelta(days=20)
        )
        run_expiring = record_proof(
            pt_electrical,
            company,
            performed_at=issued_almost_expired,
            uploaded=SimpleUploadedFile(
                "strucni_nalaz_elektro.pdf", b"%PDF-1.4 fake finding 2"),
            user=proof_user,
        )
        self.assertEqual(
            _binding_status(run_expiring.process_binding, self.today),
            STATUS_DUE_SOON,
        )

        run_renewed = record_proof(
            pt_electrical,
            company,
            performed_at=self.today,
            uploaded=SimpleUploadedFile(
                "strucni_nalaz_elektro_novi.pdf", b"%PDF-1.4 renewed"),
            user=proof_user,
        )
        self.assertEqual(
            run_renewed.process_binding_id, run_expiring.process_binding_id)
        self.assertFalse(
            NotificationOutbox.objects.filter(
                process_run__process_binding=run_renewed.process_binding,
                process_run__performed_at__lt=self.today,
                status=NotificationOutbox.STATUS_PENDING,
            ).exists()
        )

        # ------------------------------------------------------------------
        # STEP 8: REMINDERS (guide 08) - run the two scheduler commands the
        # same way a cron job would. The equipment binding from step 6 was
        # created with next_run_at == today, so its ON_LEAD reminder
        # (offset -14) is already overdue and must dispatch immediately.
        # We pin next_run_at again here to make the "today" premise of this
        # step explicit and independent of ordering.
        # ------------------------------------------------------------------
        equipment_binding.next_run_at = self.today
        equipment_binding.save(update_fields=["next_run_at"])

        mail.outbox.clear()
        call_command("run_due_processes")
        call_command("run_process_reminders", date=self.today.isoformat())

        equipment_run = ProcessRun.objects.get(
            process_binding=equipment_binding,
            status__in=(ProcessRun.STATUS_PENDING, ProcessRun.STATUS_SENT),
        )
        lead_row = NotificationOutbox.objects.get(
            process_run=equipment_run, offset_days=-14)
        self.assertEqual(
            lead_row.scheduled_send_on, self.today - timedelta(days=14))
        # The row was due today (scheduled_send_on in the past) so
        # run_process_reminders must have dispatched it.
        self.assertEqual(lead_row.status, NotificationOutbox.STATUS_SENT)
        self.assertIn("uprava@ukras.rs", lead_row.recipients)

        # Not-yet-due rows (positive offsets, e.g. +7) must remain pending -
        # the scheduler must not fire reminders early.
        future_row = NotificationOutbox.objects.get(
            process_run=equipment_run, offset_days=7)
        self.assertEqual(future_row.status, NotificationOutbox.STATUS_PENDING)

        # The Django test runner swaps EMAIL_BACKEND for locmem, so we can
        # assert on the real outbox instead of a proxy: at least one email
        # was actually sent through core.email_sender.SMTPEmailSender.
        self.assertGreaterEqual(len(mail.outbox), 1)
        sent_recipients = {
            addr for msg in mail.outbox for addr in msg.to
        }
        self.assertIn("uprava@ukras.rs", sent_recipients)

        # ------------------------------------------------------------------
        # STEP 9: OBRAZAC 1 (guide 09) - once a high-risk employee has a
        # completed lekarski run (step 5, include_in_medical_exam_record is
        # True by default for PRETHODNI_LEKARSKI), Obrazac 1 must be
        # generatable as a non-empty .docx.
        # ------------------------------------------------------------------
        pt_prethodni = ProcessType.objects.get(code="PRETHODNI_LEKARSKI")
        self.assertTrue(pt_prethodni.include_in_medical_exam_record)

        docx_bytes = render_company_document(OBRAZAC1, company)
        self.assertIsInstance(docx_bytes, bytes)
        self.assertGreater(len(docx_bytes), 0)
        # A real .docx is a zip archive - sanity check the magic header.
        self.assertEqual(docx_bytes[:2], b"PK")
