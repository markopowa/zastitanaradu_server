import uuid
from datetime import date, timedelta
from unittest.mock import patch

from django.core.files.base import ContentFile
from django.test import TestCase

from partners.models import (
    ClientCompany,
    CompanyDocument,
    CompanyObligationExclusion,
    Employee,
    JobRole,
    RiskAssessmentAct,
    RiskAssessmentActAmendment,
    RiskAssessmentSection,
    RiskLevel,
)
from partners.obligation_plan import (
    STATUS_DUE_SOON,
    STATUS_EXCLUDED,
    STATUS_MISSING,
    STATUS_NOT_APPLICABLE,
    STATUS_OK,
    STATUS_OVERDUE,
    build_obligation_plan,
    evaluate_applicability,
    obligation_status,
)
from processes.models import ProcessBinding, ProcessRun, ProcessType
from processes.period_resolution import resolve_period_months


def make_company(**kwargs):
    defaults = {"name": "Test firma", "tax_id": uuid.uuid4().hex[:9]}
    defaults.update(kwargs)
    return ClientCompany.objects.create(**defaults)


def make_process_type(**kwargs):
    defaults = {
        "name": "Test obaveza",
        "subject_kind": ProcessType.SUBJECT_CLIENT_COMPANY,
        "domain": ProcessType.DOMAIN_BZNR,
        "shape": ProcessType.SHAPE_PERIODIC,
        "proof_kind": ProcessType.PROOF_RECORDED,
        "applicability_rule": {"always": True},
        "is_active": True,
    }
    defaults.update(kwargs)
    return ProcessType.objects.create(**defaults)


class ApplicabilityEvaluationTest(TestCase):
    def test_always_true(self):
        company = make_company()
        pt = make_process_type(applicability_rule={"always": True})
        self.assertTrue(evaluate_applicability(pt, company))

    def test_always_false_when_not_set(self):
        company = make_company()
        pt = make_process_type(applicability_rule={})
        self.assertFalse(evaluate_applicability(pt, company))

    def test_zop_category_in_match(self):
        company = make_company(zop_category=ClientCompany.ZOP_CATEGORY_I)
        pt = make_process_type(applicability_rule={
                               "zop_category_in": ["I", "II"]})
        self.assertTrue(evaluate_applicability(pt, company))

    def test_zop_category_in_no_match(self):
        company = make_company(zop_category=ClientCompany.ZOP_CATEGORY_III)
        pt = make_process_type(applicability_rule={
                               "zop_category_in": ["I", "II"]})
        self.assertFalse(evaluate_applicability(pt, company))

    def test_zop_category_blank_no_match(self):
        company = make_company(zop_category="")
        pt = make_process_type(applicability_rule={
                               "zop_category_in": ["I", "II"]})
        self.assertFalse(evaluate_applicability(pt, company))

    def test_requires_installation_present(self):
        company = make_company(
            installations=[ClientCompany.INSTALLATION_HYDRANT_NETWORK]
        )
        pt = make_process_type(
            applicability_rule={"requires_installation": "HYDRANT_NETWORK"}
        )
        self.assertTrue(evaluate_applicability(pt, company))

    def test_requires_installation_absent(self):
        company = make_company(installations=[])
        pt = make_process_type(
            applicability_rule={"requires_installation": "HYDRANT_NETWORK"}
        )
        self.assertFalse(evaluate_applicability(pt, company))

    def test_high_risk_only_match(self):
        company = make_company(high_risk_activity=True)
        pt = make_process_type(applicability_rule={"high_risk_only": True})
        self.assertTrue(evaluate_applicability(pt, company))

    def test_high_risk_only_no_match(self):
        company = make_company(high_risk_activity=False)
        pt = make_process_type(applicability_rule={"high_risk_only": True})
        self.assertFalse(evaluate_applicability(pt, company))

    def test_lightning_protection_not_applicable_without_installation(self):
        company = make_company(installations=["FIRE_EXTINGUISHERS"])
        pt = make_process_type(
            applicability_rule={
                "requires_installation": "LIGHTNING_PROTECTION"}
        )
        self.assertFalse(evaluate_applicability(pt, company))


class PeriodResolutionTest(TestCase):
    def setUp(self):
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
        self.company = make_company()
        self.job_role_high = JobRole.objects.create(
            client_company=self.company,
            name="Visok rizik",
            risk_level=self.risk_high,
        )
        self.job_role_low = JobRole.objects.create(
            client_company=self.company,
            name="Nizak rizik",
            risk_level=self.risk_low,
        )

    def _make_employee(self, job_role=None, override=None):
        return Employee.objects.create(
            client_company=self.company,
            first_name="Test",
            last_name="Zaposleni",
            job_role=job_role,
            risk_level_override=override,
        )

    def test_high_risk_employee_gets_12_months(self):
        pt = make_process_type(
            period_rules=[{"when": {"risk": "high"}, "months": 12}],
            default_period_months=36,
        )
        emp = self._make_employee(job_role=self.job_role_high)
        result = resolve_period_months(pt, emp)
        self.assertEqual(result, 12)

    def test_low_risk_employee_gets_default_36(self):
        pt = make_process_type(
            period_rules=[{"when": {"risk": "high"}, "months": 12}],
            default_period_months=36,
        )
        emp = self._make_employee(job_role=self.job_role_low)
        result = resolve_period_months(pt, emp)
        self.assertEqual(result, 36)

    def test_override_high_risk_gets_12_months(self):
        pt = make_process_type(
            period_rules=[{"when": {"risk": "high"}, "months": 12}],
            default_period_months=36,
        )
        emp = self._make_employee(override=self.risk_high)
        result = resolve_period_months(pt, emp)
        self.assertEqual(result, 12)

    def test_no_rules_returns_default(self):
        pt = make_process_type(period_rules=[], default_period_months=24)
        emp = self._make_employee(job_role=self.job_role_high)
        result = resolve_period_months(pt, emp)
        self.assertEqual(result, 24)

    def test_non_employee_subject_falls_back_to_default(self):
        pt = make_process_type(
            period_rules=[{"when": {"risk": "high"}, "months": 12}],
            default_period_months=36,
        )
        result = resolve_period_months(pt, self.company)
        self.assertEqual(result, 36)


class ObligationPlanStatusTest(TestCase):
    def setUp(self):
        self.company = make_company()

    def _make_binding(self, pt, next_run_at):
        return ProcessBinding.objects.create(
            process_type=pt,
            subject_kind=ProcessBinding.SUBJECT_CLIENT_COMPANY,
            client_company=self.company,
            next_run_at=next_run_at,
            is_active=True,
        )

    def test_no_binding_returns_missing(self):
        pt = make_process_type(shape=ProcessType.SHAPE_PERIODIC)
        result = obligation_status(pt, self.company)
        self.assertEqual(result, STATUS_MISSING)

    def test_completed_run_valid_returns_ok(self):
        pt = make_process_type(shape=ProcessType.SHAPE_PERIODIC)
        future = date.today() + timedelta(days=60)
        binding = self._make_binding(pt, future)
        ProcessRun.objects.create(
            process_binding=binding,
            process_type=pt,
            scheduled_for=date.today() - timedelta(days=10),
            status=ProcessRun.STATUS_COMPLETED,
            valid_until=future,
        )
        result = obligation_status(pt, self.company)
        self.assertEqual(result, STATUS_OK)

    def test_completed_run_expiring_returns_due_soon(self):
        pt = make_process_type(shape=ProcessType.SHAPE_PERIODIC)
        expiring = date.today() + timedelta(days=15)
        binding = self._make_binding(pt, expiring)
        ProcessRun.objects.create(
            process_binding=binding,
            process_type=pt,
            scheduled_for=date.today() - timedelta(days=100),
            status=ProcessRun.STATUS_COMPLETED,
            valid_until=expiring,
        )
        result = obligation_status(pt, self.company)
        self.assertEqual(result, STATUS_DUE_SOON)

    def test_completed_run_expired_returns_overdue(self):
        pt = make_process_type(shape=ProcessType.SHAPE_PERIODIC)
        past = date.today() - timedelta(days=5)
        binding = self._make_binding(pt, past)
        ProcessRun.objects.create(
            process_binding=binding,
            process_type=pt,
            scheduled_for=past - timedelta(days=30),
            status=ProcessRun.STATUS_COMPLETED,
            valid_until=past,
        )
        result = obligation_status(pt, self.company)
        self.assertEqual(result, STATUS_OVERDUE)

    def test_living_document_present_returns_ok(self):
        pt = make_process_type(
            shape=ProcessType.SHAPE_LIVING_DOCUMENT,
            company_document_kind="RULEBOOK_OSH",
        )
        CompanyDocument.objects.create(
            client_company=self.company,
            kind="RULEBOOK_OSH",
            file="fake.pdf",
        )
        result = obligation_status(pt, self.company)
        self.assertEqual(result, STATUS_OK)

    def test_living_document_absent_returns_missing(self):
        pt = make_process_type(
            shape=ProcessType.SHAPE_LIVING_DOCUMENT,
            company_document_kind="RULEBOOK_OSH",
        )
        result = obligation_status(pt, self.company)
        self.assertEqual(result, STATUS_MISSING)

    def test_appointment_present_returns_ok(self):
        pt = make_process_type(
            shape=ProcessType.SHAPE_APPOINTMENT,
            company_document_kind="CONTRACT",
        )
        CompanyDocument.objects.create(
            client_company=self.company,
            kind="CONTRACT",
            file="contract.pdf",
        )
        result = obligation_status(pt, self.company)
        self.assertEqual(result, STATUS_OK)

    def test_appointment_absent_returns_missing(self):
        pt = make_process_type(
            shape=ProcessType.SHAPE_APPOINTMENT,
            company_document_kind="CONTRACT",
        )
        result = obligation_status(pt, self.company)
        self.assertEqual(result, STATUS_MISSING)


class ExclusionFlowTest(TestCase):
    def setUp(self):
        self.company = make_company()

    def test_excluded_obligation_shows_excluded_status(self):
        pt = make_process_type(
            applicability_rule={"always": True},
            shape=ProcessType.SHAPE_PERIODIC,
        )
        CompanyObligationExclusion.objects.create(
            client_company=self.company,
            process_type=pt,
            reason="Nije primenljivo",
        )
        plan = build_obligation_plan(self.company)
        row = next(r for r in plan if r["process_type"]["id"] == pt.id)
        self.assertTrue(row["excluded"])
        self.assertEqual(row["status"], STATUS_EXCLUDED)
        self.assertEqual(row["exclusion_reason"], "Nije primenljivo")

    def test_not_applicable_but_not_excluded_shows_not_applicable(self):
        pt = make_process_type(
            applicability_rule={"requires_installation": "HYDRANT_NETWORK"},
            shape=ProcessType.SHAPE_PERIODIC,
        )
        plan = build_obligation_plan(self.company)
        row = next(r for r in plan if r["process_type"]["id"] == pt.id)
        self.assertFalse(row["applicable"])
        self.assertFalse(row["excluded"])
        self.assertEqual(row["status"], STATUS_NOT_APPLICABLE)

    def test_unique_together_exclusion(self):
        from django.db import IntegrityError

        pt = make_process_type()
        CompanyObligationExclusion.objects.create(
            client_company=self.company,
            process_type=pt,
            reason="Razlog 1",
        )
        with self.assertRaises(IntegrityError):
            CompanyObligationExclusion.objects.create(
                client_company=self.company,
                process_type=pt,
                reason="Razlog 2",
            )


class NotApplicablePlanRowTest(TestCase):
    def setUp(self):
        self.company = make_company(high_risk_activity=False, zop_category="")

    def test_non_applicable_row_has_not_applicable_status(self):
        pt = make_process_type(
            applicability_rule={"high_risk_only": True},
            shape=ProcessType.SHAPE_PERIODIC,
        )
        plan = build_obligation_plan(self.company)
        row = next(r for r in plan if r["process_type"]["id"] == pt.id)
        self.assertFalse(row["applicable"])
        self.assertFalse(row["excluded"])
        self.assertEqual(row["status"], STATUS_NOT_APPLICABLE)

    def test_excluded_wins_over_not_applicable(self):
        pt = make_process_type(
            applicability_rule={"high_risk_only": True},
            shape=ProcessType.SHAPE_PERIODIC,
        )
        CompanyObligationExclusion.objects.create(
            client_company=self.company,
            process_type=pt,
            reason="Ručno isključeno",
        )
        plan = build_obligation_plan(self.company)
        row = next(r for r in plan if r["process_type"]["id"] == pt.id)
        self.assertTrue(row["excluded"])
        self.assertEqual(row["status"], STATUS_EXCLUDED)

    def test_applicable_row_is_not_not_applicable(self):
        pt = make_process_type(
            applicability_rule={"always": True},
            shape=ProcessType.SHAPE_PERIODIC,
        )
        plan = build_obligation_plan(self.company)
        row = next(r for r in plan if r["process_type"]["id"] == pt.id)
        self.assertTrue(row["applicable"])
        self.assertNotEqual(row["status"], STATUS_NOT_APPLICABLE)


class ActAmendmentTest(TestCase):
    def setUp(self):
        self.company = make_company()
        self.act = RiskAssessmentAct.objects.create(
            client_company=self.company)

    def test_create_amendment(self):
        amendment = RiskAssessmentActAmendment.objects.create(
            act=self.act,
            title="Izmena 1",
            note="Napomena",
            file=ContentFile(b"pdf content", name="izmena.pdf"),
        )
        self.assertEqual(amendment.act, self.act)
        self.assertEqual(amendment.title, "Izmena 1")
        self.assertEqual(self.act.amendments.count(), 1)

    def test_delete_amendment(self):
        amendment = RiskAssessmentActAmendment.objects.create(
            act=self.act,
            title="Izmena za brisanje",
            file=ContentFile(b"pdf content", name="izmena.pdf"),
        )
        amendment_id = amendment.id
        amendment.delete()
        self.assertFalse(
            RiskAssessmentActAmendment.objects.filter(pk=amendment_id).exists()
        )

    def test_amendment_cascade_deletes_with_act(self):
        RiskAssessmentActAmendment.objects.create(
            act=self.act,
            title="Izmena kaskada",
            file=ContentFile(b"pdf content", name="izmena.pdf"),
        )
        act_id = self.act.id
        self.act.delete()
        self.assertFalse(
            RiskAssessmentActAmendment.objects.filter(act_id=act_id).exists()
        )


class ConversionModuleTest(TestCase):
    def test_convert_office_to_pdf_success(self):
        from io import BytesIO

        from documents.conversion import convert_office_to_pdf

        fake_file = BytesIO(b"fake docx content")
        fake_file.name = "document.docx"
        fake_file.seek = lambda pos: None
        fake_file.chunks = lambda: [b"fake docx content"]

        fake_pdf = b"%PDF-1.4 fake pdf"

        with patch("documents.conversion.subprocess.run") as mock_run, \
                patch("documents.conversion.tempfile.TemporaryDirectory") as mock_tmpdir, \
                patch("builtins.open", create=True) as mock_open, \
                patch("os.path.exists", return_value=True):
            import os
            from unittest.mock import MagicMock, mock_open as mk_open

            mock_run.return_value = MagicMock(returncode=0, stderr=b"")
            tmp_ctx = MagicMock()
            tmp_ctx.__enter__ = MagicMock(return_value="/tmp/fakedir")
            tmp_ctx.__exit__ = MagicMock(return_value=False)
            mock_tmpdir.return_value = tmp_ctx

            write_handle = MagicMock()
            write_handle.__enter__ = MagicMock(return_value=write_handle)
            write_handle.__exit__ = MagicMock(return_value=False)
            read_handle = MagicMock()
            read_handle.__enter__ = MagicMock(return_value=read_handle)
            read_handle.__exit__ = MagicMock(return_value=False)
            read_handle.read.return_value = fake_pdf
            mock_open.side_effect = [write_handle, read_handle]

            result = convert_office_to_pdf(fake_file)
            self.assertIsInstance(result.read(), (bytes, bytearray))

    def test_convert_office_to_pdf_failure_raises_conversion_error(self):
        from io import BytesIO

        from documents.conversion import ConversionError, convert_office_to_pdf

        fake_file = BytesIO(b"fake docx content")
        fake_file.name = "document.docx"
        fake_file.seek = lambda pos: None
        fake_file.chunks = lambda: [b"fake docx content"]

        with patch("documents.conversion.subprocess.run") as mock_run, \
                patch("documents.conversion.tempfile.TemporaryDirectory") as mock_tmpdir, \
                patch("builtins.open", create=True) as mock_open:
            from unittest.mock import MagicMock

            mock_run.return_value = MagicMock(
                returncode=1, stderr=b"conversion failed")
            tmp_ctx = MagicMock()
            tmp_ctx.__enter__ = MagicMock(return_value="/tmp/fakedir")
            tmp_ctx.__exit__ = MagicMock(return_value=False)
            mock_tmpdir.return_value = tmp_ctx

            write_handle = MagicMock()
            write_handle.__enter__ = MagicMock(return_value=write_handle)
            write_handle.__exit__ = MagicMock(return_value=False)
            mock_open.return_value = write_handle

            with self.assertRaises(ConversionError):
                convert_office_to_pdf(fake_file)

    def test_is_office_file_detects_docx(self):
        from documents.conversion import _is_office_file

        self.assertTrue(_is_office_file("report.docx"))
        self.assertTrue(_is_office_file("report.doc"))
        self.assertFalse(_is_office_file("report.pdf"))
        self.assertFalse(_is_office_file("image.png"))


class AutoSpawnBindingsTest(TestCase):
    def setUp(self):
        self.risk_high = RiskLevel.objects.create(
            code="HIGH_AUTO",
            label="Visok auto",
            score=4,
            is_high_risk=True,
            order=1,
        )
        self.risk_low = RiskLevel.objects.create(
            code="LOW_AUTO",
            label="Nizak auto",
            score=1,
            is_high_risk=False,
            order=0,
        )
        self.company = make_company()
        self.job_role_high = JobRole.objects.create(
            client_company=self.company,
            name="Visoki rizik auto",
            risk_level=self.risk_high,
        )
        self.job_role_low = JobRole.objects.create(
            client_company=self.company,
            name="Nizak rizik auto",
            risk_level=self.risk_low,
        )
        for code, name, subject, shape in (
            (
                "OSPOSOBLJAVANJE_BZR",
                "Osposobljavanje BZR",
                ProcessType.SUBJECT_EMPLOYEE,
                ProcessType.SHAPE_PERIODIC,
            ),
            (
                "ZOP_OBUKA",
                "ZOP obuka",
                ProcessType.SUBJECT_EMPLOYEE,
                ProcessType.SHAPE_PERIODIC,
            ),
            (
                "PRETHODNI_LEKARSKI",
                "Prethodni lekarski",
                ProcessType.SUBJECT_EMPLOYEE,
                ProcessType.SHAPE_PERIODIC,
            ),
            (
                "LEKARSKI_PREGLED",
                "Periodični lekarski",
                ProcessType.SUBJECT_EMPLOYEE,
                ProcessType.SHAPE_PERIODIC,
            ),
        ):
            ProcessType.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "subject_kind": subject,
                    "domain": ProcessType.DOMAIN_BZNR,
                    "shape": shape,
                    "proof_kind": ProcessType.PROOF_UPLOAD,
                    "applicability_rule": {"always": True},
                    "is_active": True,
                    "default_period_months": 12,
                },
            )

    def _make_employee(self, job_role=None, override=None):
        return Employee.objects.create(
            client_company=self.company,
            first_name="Test",
            last_name="Auto",
            job_role=job_role,
            risk_level_override=override,
        )

    def _bindings_for(self, employee):
        return {
            b.process_type.code
            for b in ProcessBinding.objects.filter(
                subject_kind=ProcessBinding.SUBJECT_EMPLOYEE,
                employee=employee,
                is_active=True,
            ).select_related("process_type")
        }

    def test_low_risk_employee_gets_training_bindings_only(self):
        from partners.employee_bindings import ensure_default_bindings_for_employee

        employee = self._make_employee(job_role=self.job_role_low)
        ensure_default_bindings_for_employee(employee)
        codes = self._bindings_for(employee)
        self.assertIn("OSPOSOBLJAVANJE_BZR", codes)
        self.assertIn("ZOP_OBUKA", codes)
        self.assertNotIn("PRETHODNI_LEKARSKI", codes)
        self.assertNotIn("LEKARSKI_PREGLED", codes)

    def test_high_risk_employee_gets_all_four_bindings(self):
        from partners.employee_bindings import ensure_default_bindings_for_employee

        employee = self._make_employee(job_role=self.job_role_high)
        ensure_default_bindings_for_employee(employee)
        codes = self._bindings_for(employee)
        self.assertIn("OSPOSOBLJAVANJE_BZR", codes)
        self.assertIn("ZOP_OBUKA", codes)
        self.assertIn("PRETHODNI_LEKARSKI", codes)
        self.assertIn("LEKARSKI_PREGLED", codes)

    def test_idempotent_second_call_does_not_duplicate_bindings(self):
        from partners.employee_bindings import ensure_default_bindings_for_employee

        employee = self._make_employee(job_role=self.job_role_high)
        ensure_default_bindings_for_employee(employee)
        ensure_default_bindings_for_employee(employee)
        count = ProcessBinding.objects.filter(
            subject_kind=ProcessBinding.SUBJECT_EMPLOYEE,
            employee=employee,
            is_active=True,
        ).count()
        self.assertEqual(count, 4)

    def test_missing_catalog_type_skipped_silently(self):
        from partners.employee_bindings import ensure_default_bindings_for_employee

        ProcessType.objects.filter(code="ZOP_OBUKA").delete()
        employee = self._make_employee(job_role=self.job_role_low)
        ensure_default_bindings_for_employee(employee)
        codes = self._bindings_for(employee)
        self.assertIn("OSPOSOBLJAVANJE_BZR", codes)
        self.assertNotIn("ZOP_OBUKA", codes)

    def test_lekarski_pregled_next_run_is_future(self):
        from partners.employee_bindings import ensure_default_bindings_for_employee

        employee = self._make_employee(job_role=self.job_role_high)
        ensure_default_bindings_for_employee(employee)
        from django.utils import timezone

        today = timezone.localdate()
        lekarski = ProcessBinding.objects.get(
            subject_kind=ProcessBinding.SUBJECT_EMPLOYEE,
            employee=employee,
            is_active=True,
            process_type__code="LEKARSKI_PREGLED",
        )
        self.assertGreater(lekarski.next_run_at, today)
