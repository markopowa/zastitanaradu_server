from datetime import date, timedelta
from io import StringIO
from unittest.mock import patch

from django.test import TestCase

from partners.models import ClientCompany
from processes.models import ProcessBinding, ProcessRun, ProcessType
from processes.process_run_completion import apply_process_run_completion
from processes.tasks import run_expired_reminders


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
        scheduled_for=scheduled_for or TODAY,
        status=status,
        valid_until=valid_until,
    )

class RunDueProcessesCommandTest(TestCase):
    def _run_command(self):
        fired = []
        with patch("processes.management.commands.run_due_processes.run_process_binding",
                   side_effect=lambda bid: fired.append(bid)):
            from django.core.management import call_command
            call_command("run_due_processes", stdout=StringIO())
        return fired

    def test_fires_on_exact_fire_date(self):
        pt = make_process_type(lead_time_days=30)
        b = make_binding(pt, next_run_at=TODAY + timedelta(days=30))
        self.assertIn(b.id, self._run_command())

    def test_fires_when_overdue(self):
        pt = make_process_type(lead_time_days=30)
        b = make_binding(pt, next_run_at=TODAY + timedelta(days=10))
        self.assertIn(b.id, self._run_command())

    def test_does_not_fire_when_too_early(self):
        pt = make_process_type(lead_time_days=30)
        b = make_binding(pt, next_run_at=TODAY + timedelta(days=31))
        self.assertNotIn(b.id, self._run_command())

    def test_no_lead_time_fires_on_exact_date(self):
        pt = make_process_type(lead_time_days=0)
        b = make_binding(pt, next_run_at=TODAY)
        self.assertIn(b.id, self._run_command())

    def test_no_lead_time_does_not_fire_tomorrow(self):
        pt = make_process_type(lead_time_days=0)
        b = make_binding(pt, next_run_at=TODAY + timedelta(days=1))
        self.assertNotIn(b.id, self._run_command())

    def test_uses_process_type_lead_time_as_fallback(self):
        pt = make_process_type(lead_time_days=30)
        b = make_binding(pt, next_run_at=TODAY + timedelta(days=30), lead_time_days=None)
        self.assertIn(b.id, self._run_command())

    def test_binding_lead_time_overrides_process_type(self):
        pt = make_process_type(lead_time_days=30)
        b_early = make_binding(pt, next_run_at=TODAY + timedelta(days=8), lead_time_days=7)
        b_fire = make_binding(pt, next_run_at=TODAY + timedelta(days=7), lead_time_days=7)
        fired = self._run_command()
        self.assertIn(b_fire.id, fired)
        self.assertNotIn(b_early.id, fired)

    def test_inactive_binding_skipped(self):
        pt = make_process_type(lead_time_days=0)
        b = make_binding(pt, next_run_at=TODAY, is_active=False)
        self.assertNotIn(b.id, self._run_command())

    def test_pending_run_blocks_refire(self):
        pt = make_process_type(lead_time_days=0)
        b = make_binding(pt, next_run_at=TODAY)
        make_run(b, status=ProcessRun.STATUS_PENDING)
        self.assertNotIn(b.id, self._run_command())

    def test_completed_run_does_not_block(self):
        pt = make_process_type(lead_time_days=0)
        b = make_binding(pt, next_run_at=TODAY)
        make_run(b, status=ProcessRun.STATUS_COMPLETED)
        self.assertIn(b.id, self._run_command())

    def test_dry_run_does_not_execute(self):
        pt = make_process_type(lead_time_days=0)
        make_binding(pt, next_run_at=TODAY)
        fired = []
        with patch("processes.management.commands.run_due_processes.run_process_binding",
                   side_effect=lambda bid: fired.append(bid)):
            from django.core.management import call_command
            call_command("run_due_processes", dry_run=True, stdout=StringIO())
        self.assertEqual(fired, [])


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
            apply_process_run_completion(run, {"valid_until": TODAY + timedelta(days=365)})
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
        self.assertEqual(expected_fire_date, expected_next_run_at - timedelta(days=30))

class RunExpiredRemindersTest(TestCase):

    def _run(self):
        with patch("processes.tasks.run_on_expired_trigger") as mock_trigger:
            run_expired_reminders()
        return mock_trigger

    def test_fires_for_expired_completed_run(self):
        pt = make_process_type()
        b = make_binding(pt, next_run_at=TODAY)
        run = make_run(b, status=ProcessRun.STATUS_COMPLETED,
                       valid_until=TODAY - timedelta(days=1))
        mock = self._run()
        called_run_ids = [call.args[0].id for call in mock.call_args_list]
        self.assertIn(run.id, called_run_ids)

    def test_marks_expired_reminder_sent(self):
        pt = make_process_type()
        b = make_binding(pt, next_run_at=TODAY)
        run = make_run(b, status=ProcessRun.STATUS_COMPLETED,
                       valid_until=TODAY - timedelta(days=1))
        self._run()
        run.refresh_from_db()
        self.assertEqual(run.expired_reminder_sent_at, TODAY)

    def test_skips_already_reminded(self):
        pt = make_process_type()
        b = make_binding(pt, next_run_at=TODAY)
        run = make_run(b, status=ProcessRun.STATUS_COMPLETED,
                       valid_until=TODAY - timedelta(days=1))
        ProcessRun.objects.filter(pk=run.pk).update(expired_reminder_sent_at=TODAY)
        mock = self._run()
        called_run_ids = [call.args[0].id for call in mock.call_args_list]
        self.assertNotIn(run.id, called_run_ids)

    def test_skips_not_yet_expired(self):
        pt = make_process_type()
        b = make_binding(pt, next_run_at=TODAY)
        run = make_run(b, status=ProcessRun.STATUS_COMPLETED,
                       valid_until=TODAY)
        mock = self._run()
        called_run_ids = [call.args[0].id for call in mock.call_args_list]
        self.assertNotIn(run.id, called_run_ids)

    def test_skips_pending_run(self):
        pt = make_process_type()
        b = make_binding(pt, next_run_at=TODAY)
        run = make_run(b, status=ProcessRun.STATUS_PENDING,
                       valid_until=TODAY - timedelta(days=1))
        mock = self._run()
        called_run_ids = [call.args[0].id for call in mock.call_args_list]
        self.assertNotIn(run.id, called_run_ids)
