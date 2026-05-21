from datetime import date, timedelta
from io import StringIO
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from partners.models import ClientCompany
from processes.models import (
    ProcessBinding,
    ProcessRun,
    ProcessTemplate,
    ProcessTriggerRun,
    ProcessType,
)
from processes.process_run_completion import apply_process_run_completion
from processes.tasks import run_process_reminders, run_process_binding


TODAY = date.today()


def make_process_type(lead_time_days=0, period_months=12):
    return ProcessType.objects.create(
        name="Test vrsta",
        subject_kind=ProcessType.SUBJECT_CLIENT_COMPANY,
        lead_time_days=lead_time_days,
        default_period_months=period_months,
    )


def make_company():
    import uuid
    return ClientCompany.objects.create(
        name="Test firma",
        tax_id=uuid.uuid4().hex[:9],
    )


def make_binding(process_type, next_run_at, lead_time_days=None, is_active=True):
    company = make_company()
    return ProcessBinding.objects.create(
        process_type=process_type,
        subject_kind=ProcessBinding.SUBJECT_CLIENT_COMPANY,
        client_company=company,
        next_run_at=next_run_at,
        lead_time_days=lead_time_days,
        is_active=is_active,
    )


def make_run(binding, status=ProcessRun.STATUS_PENDING, valid_until=None, scheduled_for=None):
    return ProcessRun.objects.create(
        process_binding=binding,
        process_type=binding.process_type,
        scheduled_for=scheduled_for or binding.next_run_at or TODAY,
        status=status,
        valid_until=valid_until,
    )


class RunDueProcessesCommandTest(TestCase):
    def _run_command(self):
        from django.core.management import call_command

        call_command("run_due_processes", stdout=StringIO())

    def test_fires_on_lead_when_due(self):
        pt = make_process_type(lead_time_days=30)
        b = make_binding(pt, next_run_at=TODAY + timedelta(days=30))
        run = make_run(b)
        ProcessTemplate.objects.create(
            process_type=pt,
            trigger=ProcessTemplate.TRIGGER_ON_LEAD,
            send_email=False,
        )
        with patch("processes.trigger_utils.execute_template_actions"):
            self._run_command()
        self.assertTrue(
            ProcessTriggerRun.objects.filter(
                process_run=run,
                trigger=ProcessTemplate.TRIGGER_ON_LEAD,
            ).exists()
        )

    def test_does_not_fire_when_too_early(self):
        pt = make_process_type(lead_time_days=30)
        b = make_binding(pt, next_run_at=TODAY + timedelta(days=31))
        run = make_run(b)
        ProcessTemplate.objects.create(
            process_type=pt,
            trigger=ProcessTemplate.TRIGGER_ON_LEAD,
            send_email=False,
        )
        with patch("processes.trigger_utils.execute_template_actions"):
            self._run_command()
        self.assertFalse(
            ProcessTriggerRun.objects.filter(
                process_run=run,
                trigger=ProcessTemplate.TRIGGER_ON_LEAD,
            ).exists()
        )

    def test_creates_missing_open_run(self):
        pt = make_process_type(lead_time_days=0)
        b = make_binding(pt, next_run_at=TODAY)
        self.assertFalse(ProcessRun.objects.filter(process_binding=b).exists())
        self._run_command()
        self.assertTrue(
            ProcessRun.objects.filter(
                process_binding=b,
                status=ProcessRun.STATUS_PENDING,
            ).exists()
        )

    def test_lead_not_fired_twice(self):
        pt = make_process_type(lead_time_days=0)
        b = make_binding(pt, next_run_at=TODAY)
        run = make_run(b)
        ProcessTriggerRun.objects.create(
            process_run=run,
            trigger=ProcessTemplate.TRIGGER_ON_LEAD,
            executed_at=timezone.now(),
        )
        with patch("processes.trigger_utils.execute_template_actions") as mock_exec:
            self._run_command()
            mock_exec.assert_not_called()

    def test_inactive_binding_skipped(self):
        pt = make_process_type(lead_time_days=0)
        b = make_binding(pt, next_run_at=TODAY, is_active=False)
        self._run_command()
        self.assertFalse(ProcessRun.objects.filter(process_binding=b).exists())

    def test_dry_run_does_not_execute(self):
        pt = make_process_type(lead_time_days=0)
        make_binding(pt, next_run_at=TODAY)
        with patch(
            "processes.management.commands.run_due_processes.process_lead_triggers"
        ) as mock_lead:
            from django.core.management import call_command

            call_command("run_due_processes", dry_run=True, stdout=StringIO())
            mock_lead.assert_not_called()


class RunProcessBindingTriggersTest(TestCase):
    def test_creates_run_with_on_lead_not_on_scheduled(self):
        pt = make_process_type(lead_time_days=30)
        b = make_binding(pt, next_run_at=TODAY + timedelta(days=30))
        ProcessTemplate.objects.create(
            process_type=pt,
            trigger=ProcessTemplate.TRIGGER_ON_LEAD,
            send_email=True,
            email_to_kind=ProcessTemplate.EMAIL_TO_CUSTOM,
            custom_email_recipient="lead@test.local",
        )
        ProcessTemplate.objects.create(
            process_type=pt,
            trigger=ProcessTemplate.TRIGGER_ON_SCHEDULED,
            send_email=True,
            email_to_kind=ProcessTemplate.EMAIL_TO_CUSTOM,
            custom_email_recipient="scheduled@test.local",
        )
        with patch("processes.trigger_utils.execute_template_actions"):
            run_process_binding(b.id)
        run = ProcessRun.objects.get(process_binding=b)
        self.assertEqual(run.status, ProcessRun.STATUS_PENDING)
        self.assertTrue(
            ProcessTriggerRun.objects.filter(
                process_run=run,
                trigger=ProcessTemplate.TRIGGER_ON_LEAD,
            ).exists()
        )
        self.assertFalse(
            ProcessTriggerRun.objects.filter(
                process_run=run,
                trigger=ProcessTemplate.TRIGGER_ON_SCHEDULED,
            ).exists()
        )


class ApplyProcessRunCompletionTest(TestCase):

    def _complete(self, binding, valid_until, period_override=None):
        if period_override:
            binding.custom_period_months = period_override
            binding.save()
        run = make_run(binding, status=ProcessRun.STATUS_PENDING)
        with patch("processes.process_run_completion.run_on_completed_trigger"):
            apply_process_run_completion(run, {"valid_until": valid_until})
        binding.refresh_from_db()
        return binding

    def test_next_run_at_calculated_from_valid_until_and_period(self):
        pt = make_process_type(period_months=12)
        b = make_binding(pt, next_run_at=TODAY)
        valid_until = TODAY + timedelta(days=365)
        self._complete(b, valid_until=valid_until)
        self.assertEqual(b.next_run_at, valid_until + timedelta(days=12 * 30))

    def test_custom_period_months_overrides_process_type(self):
        pt = make_process_type(period_months=12)
        b = make_binding(pt, next_run_at=TODAY)
        valid_until = TODAY + timedelta(days=365)
        self._complete(b, valid_until=valid_until, period_override=6)
        self.assertEqual(b.next_run_at, valid_until + timedelta(days=6 * 30))

    def test_no_period_leaves_next_run_at_none(self):
        pt = ProcessType.objects.create(
            name="Bez perioda",
            subject_kind=ProcessType.SUBJECT_CLIENT_COMPANY,
            lead_time_days=0,
            default_period_months=None,
        )
        b = make_binding(pt, next_run_at=None)
        valid_until = TODAY + timedelta(days=365)
        self._complete(b, valid_until=valid_until)
        self.assertIsNone(b.next_run_at)

    def test_status_set_to_completed(self):
        pt = make_process_type(period_months=12)
        b = make_binding(pt, next_run_at=TODAY)
        run = make_run(b, status=ProcessRun.STATUS_PENDING)
        with patch("processes.process_run_completion.run_on_completed_trigger"):
            apply_process_run_completion(
                run, {"valid_until": TODAY + timedelta(days=365)})
        run.refresh_from_db()
        self.assertEqual(run.status, ProcessRun.STATUS_COMPLETED)

    def test_lead_time_applied_on_next_cycle(self):
        pt = make_process_type(lead_time_days=30, period_months=12)
        b = make_binding(pt, next_run_at=TODAY, lead_time_days=30)
        valid_until = TODAY + timedelta(days=180)
        self._complete(b, valid_until=valid_until)

        expected_next_run_at = valid_until + timedelta(days=12 * 30)
        expected_fire_date = expected_next_run_at - timedelta(days=30)
        self.assertEqual(b.next_run_at, expected_next_run_at)
        self.assertEqual(expected_fire_date,
                         expected_next_run_at - timedelta(days=30))


class RunProcessRemindersTest(TestCase):

    def _run(self, today=None):
        with patch("processes.trigger_utils.execute_template_actions") as mock_actions:
            run_process_reminders(today=today or TODAY)
        return mock_actions

    def test_fires_on_scheduled_for_today(self):
        pt = make_process_type()
        b = make_binding(pt, next_run_at=TODAY)
        run = make_run(b, scheduled_for=TODAY)
        ProcessTemplate.objects.create(
            process_type=pt,
            trigger=ProcessTemplate.TRIGGER_ON_SCHEDULED,
            send_email=True,
        )
        mock = self._run()
        self.assertEqual(mock.call_count, 1)
        self.assertEqual(mock.call_args[0][0], "ON_SCHEDULED")
        self.assertTrue(
            ProcessTriggerRun.objects.filter(
                process_run=run,
                trigger=ProcessTemplate.TRIGGER_ON_SCHEDULED,
            ).exists()
        )

    def test_skips_scheduled_already_sent(self):
        pt = make_process_type()
        b = make_binding(pt, next_run_at=TODAY)
        run = make_run(b, scheduled_for=TODAY)
        ProcessTemplate.objects.create(
            process_type=pt,
            trigger=ProcessTemplate.TRIGGER_ON_SCHEDULED,
            send_email=True,
        )
        ProcessTriggerRun.objects.create(
            process_run=run,
            trigger=ProcessTemplate.TRIGGER_ON_SCHEDULED,
            executed_at=timezone.now(),
        )
        mock = self._run()
        self.assertEqual(mock.call_count, 0)

    def test_fires_overdue_for_pending_past_scheduled(self):
        pt = make_process_type()
        b = make_binding(pt, next_run_at=TODAY - timedelta(days=5))
        run = make_run(
            b,
            scheduled_for=TODAY - timedelta(days=1),
        )
        ProcessTemplate.objects.create(
            process_type=pt,
            trigger=ProcessTemplate.TRIGGER_ON_OVERDUE,
            send_email=True,
        )
        mock = self._run()
        self.assertEqual(mock.call_count, 1)
        self.assertEqual(mock.call_args[0][0], "ON_OVERDUE")
        self.assertTrue(
            ProcessTriggerRun.objects.filter(
                process_run=run,
                trigger=ProcessTemplate.TRIGGER_ON_OVERDUE,
            ).exists()
        )

    def test_skips_overdue_for_completed_run(self):
        pt = make_process_type()
        b = make_binding(pt, next_run_at=TODAY)
        make_run(
            b,
            status=ProcessRun.STATUS_COMPLETED,
            scheduled_for=TODAY - timedelta(days=1),
        )
        ProcessTemplate.objects.create(
            process_type=pt,
            trigger=ProcessTemplate.TRIGGER_ON_OVERDUE,
            send_email=True,
        )
        mock = self._run()
        self.assertEqual(mock.call_count, 0)

    def test_skips_overdue_already_sent(self):
        pt = make_process_type()
        b = make_binding(pt, next_run_at=TODAY)
        run = make_run(b, scheduled_for=TODAY - timedelta(days=1))
        ProcessTemplate.objects.create(
            process_type=pt,
            trigger=ProcessTemplate.TRIGGER_ON_OVERDUE,
            send_email=True,
        )
        ProcessTriggerRun.objects.create(
            process_run=run,
            trigger=ProcessTemplate.TRIGGER_ON_OVERDUE,
            executed_at=timezone.now(),
        )
        mock = self._run()
        self.assertEqual(mock.call_count, 0)

    def test_does_not_fire_scheduled_before_appointment_day(self):
        pt = make_process_type()
        b = make_binding(pt, next_run_at=TODAY + timedelta(days=10))
        make_run(b, scheduled_for=TODAY + timedelta(days=10))
        ProcessTemplate.objects.create(
            process_type=pt,
            trigger=ProcessTemplate.TRIGGER_ON_SCHEDULED,
            send_email=True,
        )
        mock = self._run()
        self.assertEqual(mock.call_count, 0)
