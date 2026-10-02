import uuid
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from partners.models import ClientCompany, Employee, EquipmentItem, JobRole, RiskLevel
from partners.obligation_sync import (
    deactivate_departed_employees,
    sync_employee_obligations,
    sync_equipment_obligations,
    sync_role_employees,
)
from processes.models import NotificationOutbox, ProcessBinding, ProcessRun, ProcessType


def make_type(code, subject_kind=ProcessType.SUBJECT_EMPLOYEE):
    return ProcessType.objects.create(
        code=code,
        name=code,
        subject_kind=subject_kind,
        lead_time_days=0,
        default_period_months=12,
        reminder_offsets=[-15, 0, 7],
    )


class ObligationSyncTest(TestCase):
    def setUp(self):
        self.company = ClientCompany.objects.create(
            name="Firma", tax_id=uuid.uuid4().hex[:9])
        self.low = RiskLevel.objects.create(
            code="LOW", label="Nizak", score=1, is_high_risk=False)
        self.high = RiskLevel.objects.create(
            code="HIGH", label="Visok", score=5, is_high_risk=True)
        for code in ("OSPOSOBLJAVANJE_BZR", "ZOP_OBUKA", "LZO_ZADUZENJE",
                     "PRETHODNI_LEKARSKI", "LEKARSKI_PREGLED"):
            make_type(code)
        self.role = JobRole.objects.create(
            client_company=self.company, name="Magacioner", risk_level=self.low)
        self.employee = Employee.objects.create(
            client_company=self.company,
            first_name="Petar",
            last_name="Petrovic",
            job_role=self.role,
        )
        sync_employee_obligations(self.employee)

    def active_codes(self):
        return set(
            ProcessBinding.objects.filter(
                employee=self.employee, is_active=True
            ).values_list("process_type__code", flat=True)
        )

    def test_low_risk_employee_has_no_medical(self):
        self.assertEqual(
            self.active_codes(),
            {"OSPOSOBLJAVANJE_BZR", "ZOP_OBUKA"},
        )

    def test_lzo_items_on_role_add_lzo_obligation(self):
        from partners.models import JobRoleLZO

        JobRoleLZO.objects.create(job_role=self.role, name="Rukavice")
        sync_role_employees(self.role)
        self.assertIn("LZO_ZADUZENJE", self.active_codes())

    def test_exclusion_stops_and_restores_obligation(self):
        from partners.models import CompanyObligationExclusion
        from partners.obligation_sync import sync_company_obligations

        zop = ProcessType.objects.get(code="ZOP_OBUKA")
        exclusion = CompanyObligationExclusion.objects.create(
            client_company=self.company, process_type=zop, reason="Kancelarija")
        sync_company_obligations(self.company)
        self.assertNotIn("ZOP_OBUKA", self.active_codes())
        newcomer = Employee.objects.create(
            client_company=self.company, first_name="Novi", last_name="Radnik",
            job_role=self.role)
        sync_employee_obligations(newcomer)
        self.assertFalse(
            ProcessBinding.objects.filter(
                employee=newcomer, process_type=zop).exists())
        exclusion.delete()
        sync_company_obligations(self.company)
        self.assertIn("ZOP_OBUKA", self.active_codes())
        self.assertEqual(
            ProcessBinding.objects.filter(
                employee=self.employee, process_type=zop).count(),
            1,
        )

    def test_role_becoming_high_risk_adds_preliminary_exam(self):
        self.role.risk_level = self.high
        self.role.save()
        sync_role_employees(self.role)
        self.assertIn("PRETHODNI_LEKARSKI", self.active_codes())

    def test_role_becoming_low_risk_stops_medical(self):
        self.role.risk_level = self.high
        self.role.save()
        sync_role_employees(self.role)
        binding = ProcessBinding.objects.get(
            employee=self.employee, process_type__code="PRETHODNI_LEKARSKI")
        run = ProcessRun.objects.get(process_binding=binding)
        self.role.risk_level = self.low
        self.role.save()
        sync_role_employees(self.role)
        binding.refresh_from_db()
        run.refresh_from_db()
        self.assertFalse(binding.is_active)
        self.assertEqual(run.status, ProcessRun.STATUS_CANCELLED)
        self.assertFalse(
            NotificationOutbox.objects.filter(
                process_run=run, status=NotificationOutbox.STATUS_PENDING
            ).exists()
        )

    def test_departed_employee_keeps_history_but_stops_obligations(self):
        self.employee.employment_end_date = timezone.localdate()
        self.employee.save()
        sync_employee_obligations(self.employee)
        self.assertEqual(self.active_codes(), set())
        self.assertTrue(
            ProcessBinding.objects.filter(employee=self.employee).exists())

    def test_future_departure_deactivated_by_daily_job(self):
        self.employee.employment_end_date = timezone.localdate() + timedelta(days=1)
        self.employee.save()
        sync_employee_obligations(self.employee)
        self.assertNotEqual(self.active_codes(), set())
        Employee.objects.filter(pk=self.employee.pk).update(
            employment_end_date=timezone.localdate())
        deactivate_departed_employees()
        self.assertEqual(self.active_codes(), set())


class EquipmentSyncTest(TestCase):
    def setUp(self):
        self.company = ClientCompany.objects.create(
            name="Firma", tax_id=uuid.uuid4().hex[:9])
        self.service = make_type(
            "PP_APARATI_SERVIS", ProcessType.SUBJECT_EQUIPMENT)
        self.other = make_type(
            "SDP_PREGLED", ProcessType.SUBJECT_EQUIPMENT)
        self.equipment = EquipmentItem.objects.create(
            client_company=self.company,
            name="PP aparat",
            service_process_type=self.service,
        )
        sync_equipment_obligations(self.equipment)

    def active_types(self):
        return set(
            ProcessBinding.objects.filter(
                equipment_item=self.equipment, is_active=True
            ).values_list("process_type__code", flat=True)
        )

    def test_deactivated_equipment_stops_obligations(self):
        self.equipment.is_active = False
        self.equipment.save()
        sync_equipment_obligations(self.equipment)
        self.assertEqual(self.active_types(), set())

    def test_changed_service_type_moves_obligation(self):
        previous = self.equipment.service_process_type_id
        self.equipment.service_process_type = self.other
        self.equipment.save()
        sync_equipment_obligations(self.equipment, previous)
        self.assertEqual(self.active_types(), {"SDP_PREGLED"})


class HighRiskSourceTest(TestCase):
    def setUp(self):
        from partners.models import Hazard, JobRoleHazard

        self.company = ClientCompany.objects.create(
            name="Firma", tax_id=uuid.uuid4().hex[:9])
        self.low = RiskLevel.objects.create(
            code="LOW", label="Nizak", score=1, is_high_risk=False)
        self.high = RiskLevel.objects.create(
            code="HIGH", label="Povećan", score=6, is_high_risk=True)
        self.role = JobRole.objects.create(
            client_company=self.company, name="Viljuškarista",
            risk_level=self.low)
        hazard = Hazard.objects.create(
            code="PAD", label="Pad tereta", kind="OPASNOST")
        JobRoleHazard.objects.create(
            job_role=self.role, hazard=hazard,
            verovatnoca=6, izlozenost=6, posledica=15)

    def test_kinney_only_suggests(self):
        self.assertTrue(self.role.kinney_suggests_high_risk)
        self.assertFalse(self.role.is_high_risk)
        self.assertFalse(self.company.has_high_risk_roles)

    def test_company_flag_follows_roles(self):
        self.role.risk_level = self.high
        self.role.save()
        self.assertTrue(self.company.has_high_risk_roles)

    def test_act_conclusion_follows_role_level(self):
        from partners.document_contexts import company_document_context

        def high_risk_names():
            context = company_document_context(self.company)
            return [role["name"] for role in context["high_risk_roles"]]

        self.assertEqual(high_risk_names(), [])
        self.role.risk_level = self.high
        self.role.save()
        self.assertEqual(high_risk_names(), ["Viljuškarista"])


class TrainingCompletesObligationTest(TestCase):
    def setUp(self):
        self.company = ClientCompany.objects.create(
            name="Firma", tax_id=uuid.uuid4().hex[:9])
        for code in ("OSPOSOBLJAVANJE_BZR", "ZOP_OBUKA"):
            make_type(code)
        self.employee = Employee.objects.create(
            client_company=self.company, first_name="Ana", last_name="Anic")
        sync_employee_obligations(self.employee)

    def test_recorded_training_completes_linked_obligation(self):
        from partners.models import EmployeeTraining, TrainingType
        from partners.obligation_proofs import complete_obligation_for_training

        zop = ProcessType.objects.get(code="ZOP_OBUKA")
        training_type = TrainingType.objects.create(
            client_company=self.company, name="ZOP", process_type=zop)
        done = timezone.localdate() - timedelta(days=3)
        training = EmployeeTraining.objects.create(
            employee=self.employee, training_type=training_type,
            completed_at=done)
        complete_obligation_for_training(training)

        binding = ProcessBinding.objects.get(
            employee=self.employee, process_type=zop, is_active=True)
        completed = ProcessRun.objects.get(
            process_binding=binding, status=ProcessRun.STATUS_COMPLETED)
        self.assertEqual(completed.performed_at, done)
        self.assertTrue(
            ProcessRun.objects.filter(
                process_binding=binding,
                status=ProcessRun.STATUS_PENDING,
                scheduled_for__gt=timezone.localdate(),
            ).exists()
        )

    def test_training_without_link_changes_nothing(self):
        from partners.models import EmployeeTraining, TrainingType
        from partners.obligation_proofs import complete_obligation_for_training

        training_type = TrainingType.objects.create(
            client_company=self.company, name="Viljuškar")
        training = EmployeeTraining.objects.create(
            employee=self.employee, training_type=training_type,
            completed_at=timezone.localdate())
        self.assertIsNone(complete_obligation_for_training(training))
        self.assertFalse(
            ProcessRun.objects.filter(
                process_binding__employee=self.employee,
                status=ProcessRun.STATUS_COMPLETED,
            ).exists()
        )


class PlanCountsTest(TestCase):
    def setUp(self):
        self.company = ClientCompany.objects.create(
            name="Firma", tax_id=uuid.uuid4().hex[:9])
        for code in ("OSPOSOBLJAVANJE_BZR", "ZOP_OBUKA", "LZO_ZADUZENJE"):
            make_type(code)
        self.employee = Employee.objects.create(
            client_company=self.company, first_name="Ana", last_name="Anic")
        sync_employee_obligations(self.employee)

    def rows(self):
        from partners.obligation_plan import build_obligation_plan

        return {r["process_type"]["code"]: r for r in build_obligation_plan(self.company)}

    def test_untrained_employee_is_not_counted_as_covered(self):
        row = self.rows()["OSPOSOBLJAVANJE_BZR"]
        self.assertEqual(row["counts"], {"covered": 0, "total": 1})

    def test_obligation_without_subjects_is_not_applicable(self):
        row = self.rows()["LZO_ZADUZENJE"]
        self.assertEqual(row["status"], "NOT_APPLICABLE")
        self.assertEqual(row["counts"]["total"], 0)

    def test_completed_training_counts_as_covered(self):
        from processes.process_run_completion import apply_process_run_completion

        run = ProcessRun.objects.get(
            process_binding__employee=self.employee,
            process_type__code="OSPOSOBLJAVANJE_BZR",
            status=ProcessRun.STATUS_PENDING,
        )
        apply_process_run_completion(run, {"performed_at": timezone.localdate()})
        row = self.rows()["OSPOSOBLJAVANJE_BZR"]
        self.assertEqual(row["counts"], {"covered": 1, "total": 1})
