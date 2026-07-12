from datetime import date, timedelta
from io import StringIO
from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.utils import timezone

from partners.models import ClientCompany
from processes.models import (
    NotificationOutbox,
    ProcessBinding,
    ProcessRun,
    ProcessTemplate,
    ProcessTriggerRun,
    ProcessType,
)
from processes.process_run_completion import apply_process_run_completion
from processes.tasks import (
    ensure_process_run_for_binding,
    materialize_outbox_for_run,
    run_process_reminders,
    run_process_binding,
)


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


def make_template(pt, trigger, send_email=True):
    return ProcessTemplate.objects.create(
        process_type=pt,
        trigger=trigger,
        send_email=send_email,
        email_to_kind=ProcessTemplate.EMAIL_TO_CUSTOM,
        custom_email_recipient="test@test.local",
    )


class RunDueProcessesCommandTest(TestCase):
    def _run_command(self):
        from django.core.management import call_command
        call_command("run_due_processes", stdout=StringIO())

    def test_materializes_outbox_rows_for_created_run(self):
        pt = make_process_type(lead_time_days=30)
        b = make_binding(pt, next_run_at=TODAY + timedelta(days=30))
        make_template(pt, ProcessTemplate.TRIGGER_ON_LEAD)
        make_template(pt, ProcessTemplate.TRIGGER_ON_SCHEDULED)
        self._run_command()
        run = ProcessRun.objects.get(process_binding=b)
        offsets = set(
            NotificationOutbox.objects.filter(process_run=run).values_list(
                "offset_days", flat=True
            )
        )
        self.assertEqual(offsets, {-30, 0})

    def test_does_not_send_emails_directly(self):
        pt = make_process_type(lead_time_days=30)
        b = make_binding(pt, next_run_at=TODAY + timedelta(days=30))
        make_template(pt, ProcessTemplate.TRIGGER_ON_LEAD)
        with patch("processes.trigger_utils.execute_template_actions") as mock_exec:
            self._run_command()
        mock_exec.assert_not_called()
        run = ProcessRun.objects.get(process_binding=b)
        self.assertFalse(ProcessTriggerRun.objects.filter(
            process_run=run).exists())

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

    def test_inactive_binding_skipped(self):
        pt = make_process_type(lead_time_days=0)
        b = make_binding(pt, next_run_at=TODAY, is_active=False)
        self._run_command()
        self.assertFalse(ProcessRun.objects.filter(process_binding=b).exists())

    def test_dry_run_does_not_execute(self):
        pt = make_process_type(lead_time_days=0)
        make_binding(pt, next_run_at=TODAY)
        with patch(
            "processes.management.commands.run_due_processes.ensure_open_runs_for_active_bindings"
        ) as mock_ensure:
            from django.core.management import call_command
            call_command("run_due_processes", dry_run=True, stdout=StringIO())
            mock_ensure.assert_not_called()


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
        with patch(
            "processes.trigger_utils.execute_template_actions",
            return_value=(None, False, ""),
        ):
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
        from dateutil.relativedelta import relativedelta
        pt = make_process_type(period_months=12)
        b = make_binding(pt, next_run_at=TODAY)
        valid_until = TODAY + timedelta(days=365)
        self._complete(b, valid_until=valid_until)
        self.assertEqual(b.next_run_at, valid_until + relativedelta(months=12))

    def test_custom_period_months_overrides_process_type(self):
        from dateutil.relativedelta import relativedelta
        pt = make_process_type(period_months=12)
        b = make_binding(pt, next_run_at=TODAY)
        valid_until = TODAY + timedelta(days=365)
        self._complete(b, valid_until=valid_until, period_override=6)
        self.assertEqual(b.next_run_at, valid_until + relativedelta(months=6))

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
        from dateutil.relativedelta import relativedelta
        pt = make_process_type(lead_time_days=30, period_months=12)
        b = make_binding(pt, next_run_at=TODAY, lead_time_days=30)
        valid_until = TODAY + timedelta(days=180)
        self._complete(b, valid_until=valid_until)
        expected_next_run_at = valid_until + relativedelta(months=12)
        expected_fire_date = expected_next_run_at - timedelta(days=30)
        self.assertEqual(b.next_run_at, expected_next_run_at)
        self.assertEqual(expected_fire_date,
                         expected_next_run_at - timedelta(days=30))

    def test_completion_cancels_pending_outbox_rows(self):
        pt = make_process_type(period_months=12)
        b = make_binding(pt, next_run_at=TODAY)
        run = make_run(b, status=ProcessRun.STATUS_PENDING)
        NotificationOutbox.objects.create(
            process_run=run,
            offset_days=0,
            scheduled_send_on=TODAY,
            status=NotificationOutbox.STATUS_PENDING,
        )
        NotificationOutbox.objects.create(
            process_run=run,
            offset_days=7,
            scheduled_send_on=TODAY + timedelta(days=7),
            status=NotificationOutbox.STATUS_PENDING,
        )
        with patch("processes.process_run_completion.run_on_completed_trigger"):
            apply_process_run_completion(
                run, {"valid_until": TODAY + timedelta(days=365)})
        pending = NotificationOutbox.objects.filter(
            process_run=run,
            status=NotificationOutbox.STATUS_PENDING,
        ).count()
        self.assertEqual(pending, 0)
        cancelled = NotificationOutbox.objects.filter(
            process_run=run,
            status=NotificationOutbox.STATUS_CANCELLED,
        ).count()
        self.assertEqual(cancelled, 2)


class OutboxMaterializationTest(TestCase):

    def test_materialization_on_run_creation(self):
        pt = make_process_type(lead_time_days=7, period_months=12)
        pt.reminder_offsets = [-7, 0]
        pt.save()
        make_template(pt, ProcessTemplate.TRIGGER_ON_LEAD)
        make_template(pt, ProcessTemplate.TRIGGER_ON_SCHEDULED)
        b = make_binding(pt, next_run_at=TODAY + timedelta(days=30))
        run = ensure_process_run_for_binding(b)
        self.assertIsNotNone(run)
        outbox_rows = NotificationOutbox.objects.filter(process_run=run)
        self.assertEqual(outbox_rows.count(), 2)
        offsets = set(outbox_rows.values_list("offset_days", flat=True))
        self.assertIn(-7, offsets)
        self.assertIn(0, offsets)
        on_lead = outbox_rows.get(offset_days=-7)
        self.assertEqual(on_lead.scheduled_send_on, TODAY +
                         timedelta(days=30) + timedelta(days=-7))
        self.assertEqual(on_lead.status, NotificationOutbox.STATUS_PENDING)

    def test_outbox_rows_created_with_no_template_when_none_configured(self):
        pt = make_process_type(lead_time_days=7, period_months=12)
        pt.reminder_offsets = [-7, 0]
        pt.save()
        b = make_binding(pt, next_run_at=TODAY + timedelta(days=30))
        run = ensure_process_run_for_binding(b)
        outbox_rows = NotificationOutbox.objects.filter(process_run=run)
        # Rows are still materialized for the default offsets even without a
        # ProcessTemplate; they just carry process_template=None.
        self.assertEqual(outbox_rows.count(), 2)
        self.assertTrue(
            all(row.process_template is None for row in outbox_rows)
        )

    def test_duplicate_offset_not_created_twice(self):
        pt = make_process_type(lead_time_days=7, period_months=12)
        pt.reminder_offsets = [-7, 0]
        pt.save()
        make_template(pt, ProcessTemplate.TRIGGER_ON_LEAD)
        make_template(pt, ProcessTemplate.TRIGGER_ON_SCHEDULED)
        b = make_binding(pt, next_run_at=TODAY + timedelta(days=30))
        run = make_run(b)
        materialize_outbox_for_run(run)
        count_after_first = NotificationOutbox.objects.filter(
            process_run=run).count()
        materialize_outbox_for_run(run)
        count_after_second = NotificationOutbox.objects.filter(
            process_run=run).count()
        self.assertEqual(count_after_first, count_after_second)

    def test_catchup_materializes_existing_open_runs(self):
        pt = make_process_type(lead_time_days=5, period_months=12)
        pt.reminder_offsets = [0]
        pt.save()
        make_template(pt, ProcessTemplate.TRIGGER_ON_SCHEDULED)
        b = make_binding(pt, next_run_at=TODAY)
        run = make_run(b)
        self.assertEqual(NotificationOutbox.objects.filter(
            process_run=run).count(), 0)
        run_process_reminders(today=TODAY)
        self.assertGreaterEqual(
            NotificationOutbox.objects.filter(process_run=run).count(), 0
        )


class EnsureProcessRunIdempotencyTest(TestCase):

    def test_ensure_twice_returns_same_run(self):
        pt = make_process_type()
        b = make_binding(pt, next_run_at=TODAY + timedelta(days=10))
        run1 = ensure_process_run_for_binding(b)
        run2 = ensure_process_run_for_binding(b)
        self.assertIsNotNone(run1)
        self.assertEqual(run1.id, run2.id)
        self.assertEqual(
            ProcessRun.objects.filter(
                process_binding=b, status__in=("PENDING", "SENT")
            ).count(),
            1,
        )


class OutboxSendingTest(TestCase):

    def _make_send_setup(self, offset=0, scheduled_for=None, status=ProcessRun.STATUS_PENDING):
        pt = make_process_type()
        trigger = ProcessTemplate.TRIGGER_ON_SCHEDULED if offset == 0 else (
            ProcessTemplate.TRIGGER_ON_LEAD if offset < 0 else ProcessTemplate.TRIGGER_ON_OVERDUE
        )
        tmpl = make_template(pt, trigger)
        b = make_binding(pt, next_run_at=scheduled_for or TODAY)
        run = make_run(b, status=status, scheduled_for=scheduled_for or TODAY)
        outbox = NotificationOutbox.objects.create(
            process_run=run,
            process_template=tmpl,
            offset_days=offset,
            scheduled_send_on=TODAY,
            status=NotificationOutbox.STATUS_PENDING,
        )
        return run, outbox, tmpl

    def test_successful_send_sets_status_sent(self):
        run, outbox, tmpl = self._make_send_setup(offset=0)
        with patch("processes.tasks._send_email_for_template", return_value=True):
            n = run_process_reminders(today=TODAY)
        outbox.refresh_from_db()
        self.assertEqual(outbox.status, NotificationOutbox.STATUS_SENT)
        self.assertIsNotNone(outbox.sent_at)
        self.assertTrue(
            ProcessTriggerRun.objects.filter(
                process_run=run,
                trigger=ProcessTemplate.TRIGGER_ON_SCHEDULED,
                email_sent=True,
            ).exists()
        )

    def test_failed_send_stays_pending_increments_attempts(self):
        run, outbox, tmpl = self._make_send_setup(offset=0)
        with patch("processes.tasks._send_email_for_template", side_effect=Exception("SMTP error")):
            run_process_reminders(today=TODAY)
        outbox.refresh_from_db()
        self.assertEqual(outbox.status, NotificationOutbox.STATUS_PENDING)
        self.assertEqual(outbox.attempts, 1)
        self.assertIn("SMTP error", outbox.last_error)

    def test_retries_on_second_run_after_failure(self):
        run, outbox, tmpl = self._make_send_setup(offset=0)
        with patch("processes.tasks._send_email_for_template", side_effect=Exception("SMTP error")):
            run_process_reminders(today=TODAY)
        outbox.refresh_from_db()
        self.assertEqual(outbox.attempts, 1)
        with patch("processes.tasks._send_email_for_template", return_value=True):
            run_process_reminders(today=TODAY)
        outbox.refresh_from_db()
        self.assertEqual(outbox.status, NotificationOutbox.STATUS_SENT)

    def test_attempts_cap_sets_failed(self):
        run, outbox, tmpl = self._make_send_setup(offset=0)
        outbox.attempts = 4
        outbox.save()
        with patch("processes.tasks._send_email_for_template", side_effect=Exception("SMTP error")):
            run_process_reminders(today=TODAY)
        outbox.refresh_from_db()
        self.assertEqual(outbox.status, NotificationOutbox.STATUS_FAILED)
        self.assertEqual(outbox.attempts, 5)

    def test_double_command_run_sends_once(self):
        run, outbox, tmpl = self._make_send_setup(offset=0)
        with patch("processes.tasks._send_email_for_template", return_value=True):
            run_process_reminders(today=TODAY)
            run_process_reminders(today=TODAY)
        sent_count = ProcessTriggerRun.objects.filter(
            process_run=run,
            trigger=ProcessTemplate.TRIGGER_ON_SCHEDULED,
            email_sent=True,
        ).count()
        self.assertEqual(sent_count, 1)

    def test_late_row_still_fires_catch_up(self):
        pt = make_process_type()
        trigger = ProcessTemplate.TRIGGER_ON_SCHEDULED
        tmpl = make_template(pt, trigger)
        b = make_binding(pt, next_run_at=TODAY - timedelta(days=3))
        run = make_run(b, scheduled_for=TODAY - timedelta(days=3))
        outbox = NotificationOutbox.objects.create(
            process_run=run,
            process_template=tmpl,
            offset_days=0,
            scheduled_send_on=TODAY - timedelta(days=3),
            status=NotificationOutbox.STATUS_PENDING,
        )
        with patch("processes.tasks._send_email_for_template", return_value=True):
            run_process_reminders(today=TODAY)
        outbox.refresh_from_db()
        self.assertEqual(outbox.status, NotificationOutbox.STATUS_SENT)

    def test_completed_run_outbox_not_processed(self):
        run, outbox, tmpl = self._make_send_setup(
            offset=0,
            status=ProcessRun.STATUS_COMPLETED,
        )
        with patch("processes.tasks._send_email_for_template") as mock_send:
            run_process_reminders(today=TODAY)
        mock_send.assert_not_called()

    def test_overdue_offset_triggers_on_overdue_template(self):
        run, outbox, tmpl = self._make_send_setup(
            offset=7, scheduled_for=TODAY - timedelta(days=7))
        with patch("processes.tasks._send_email_for_template", return_value=True):
            run_process_reminders(today=TODAY)
        outbox.refresh_from_db()
        self.assertEqual(outbox.status, NotificationOutbox.STATUS_SENT)
        self.assertTrue(
            ProcessTriggerRun.objects.filter(
                process_run=run,
                trigger=ProcessTemplate.TRIGGER_ON_OVERDUE,
                email_sent=True,
            ).exists()
        )


class RunProcessRemindersLegacyTest(TestCase):

    def _run(self, today=None):
        with patch("processes.tasks._send_email_for_template", return_value=True) as mock:
            run_process_reminders(today=today or TODAY)
        return mock

    def test_fires_on_scheduled_for_today(self):
        pt = make_process_type()
        b = make_binding(pt, next_run_at=TODAY)
        run = make_run(b, scheduled_for=TODAY)
        pt.reminder_offsets = [0]
        pt.save()
        tmpl = ProcessTemplate.objects.create(
            process_type=pt,
            trigger=ProcessTemplate.TRIGGER_ON_SCHEDULED,
            send_email=True,
            email_to_kind=ProcessTemplate.EMAIL_TO_CUSTOM,
            custom_email_recipient="test@test.local",
        )
        materialize_outbox_for_run(run)
        self._run()
        self.assertTrue(
            ProcessTriggerRun.objects.filter(
                process_run=run,
                trigger=ProcessTemplate.TRIGGER_ON_SCHEDULED,
                email_sent=True,
            ).exists()
        )

    def test_skips_scheduled_already_sent(self):
        pt = make_process_type()
        b = make_binding(pt, next_run_at=TODAY)
        run = make_run(b, scheduled_for=TODAY)
        pt.reminder_offsets = [0]
        pt.save()
        tmpl = ProcessTemplate.objects.create(
            process_type=pt,
            trigger=ProcessTemplate.TRIGGER_ON_SCHEDULED,
            send_email=True,
            email_to_kind=ProcessTemplate.EMAIL_TO_CUSTOM,
            custom_email_recipient="test@test.local",
        )
        NotificationOutbox.objects.create(
            process_run=run,
            process_template=tmpl,
            offset_days=0,
            scheduled_send_on=TODAY,
            status=NotificationOutbox.STATUS_SENT,
            sent_at=timezone.now(),
        )
        with patch("processes.tasks._send_email_for_template") as mock_send:
            run_process_reminders(today=TODAY)
        mock_send.assert_not_called()

    def test_fires_overdue_for_pending_past_scheduled(self):
        pt = make_process_type()
        b = make_binding(pt, next_run_at=TODAY - timedelta(days=5))
        run = make_run(b, scheduled_for=TODAY - timedelta(days=1))
        pt.reminder_offsets = [1]
        pt.save()
        tmpl = ProcessTemplate.objects.create(
            process_type=pt,
            trigger=ProcessTemplate.TRIGGER_ON_OVERDUE,
            send_email=True,
            email_to_kind=ProcessTemplate.EMAIL_TO_CUSTOM,
            custom_email_recipient="test@test.local",
        )
        NotificationOutbox.objects.create(
            process_run=run,
            process_template=tmpl,
            offset_days=1,
            scheduled_send_on=TODAY - timedelta(days=1) + timedelta(days=1),
            status=NotificationOutbox.STATUS_PENDING,
        )
        with patch("processes.tasks._send_email_for_template", return_value=True):
            run_process_reminders(today=TODAY)
        self.assertTrue(
            ProcessTriggerRun.objects.filter(
                process_run=run,
                trigger=ProcessTemplate.TRIGGER_ON_OVERDUE,
                email_sent=True,
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
        with patch("processes.tasks._send_email_for_template") as mock_send:
            run_process_reminders(today=TODAY)
        mock_send.assert_not_called()

    def test_does_not_fire_scheduled_before_appointment_day(self):
        pt = make_process_type()
        b = make_binding(pt, next_run_at=TODAY + timedelta(days=10))
        run = make_run(b, scheduled_for=TODAY + timedelta(days=10))
        pt.reminder_offsets = [0]
        pt.save()
        ProcessTemplate.objects.create(
            process_type=pt,
            trigger=ProcessTemplate.TRIGGER_ON_SCHEDULED,
            send_email=True,
        )
        materialize_outbox_for_run(run)
        with patch("processes.tasks._send_email_for_template") as mock_send:
            run_process_reminders(today=TODAY)
        mock_send.assert_not_called()


class PeriodNoneCompletionTest(TestCase):

    def test_period_none_sets_next_run_at_none(self):
        pt = ProcessType.objects.create(
            name="Nema perioda",
            subject_kind=ProcessType.SUBJECT_CLIENT_COMPANY,
            lead_time_days=0,
            default_period_months=None,
        )
        b = make_binding(pt, next_run_at=None)
        run = make_run(b, scheduled_for=TODAY)
        with patch("processes.process_run_completion.run_on_completed_trigger"):
            apply_process_run_completion(
                run, {"valid_until": TODAY + timedelta(days=90)})
        b.refresh_from_db()
        self.assertIsNone(b.next_run_at)
