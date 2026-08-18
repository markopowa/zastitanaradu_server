from unittest.mock import patch

from django.http import HttpResponse
from django.test import RequestFactory, SimpleTestCase, override_settings

from core.email_context import is_email_suppressed
from core.email_sender import get_email_sender
from core.middleware import SuppressEmailMiddleware


def _reset_sender():
    import core.email_sender as mod

    mod._sender = None


class EmailSuppressTestCase(SimpleTestCase):
    def tearDown(self):
        _reset_sender()

    @override_settings(EMAIL_DRY_RUN=True, EMAIL_SENDER_BACKEND="core.email_sender.ConsoleEmailSender")
    def test_dry_run_skips_send(self):
        _reset_sender()
        with patch("core.email_sender.ConsoleEmailSender.send", return_value=True) as mock_send:
            sent = get_email_sender().send(
                recipients=["a@test.local"],
                subject="Test",
                body="Body",
            )
        self.assertTrue(sent)
        mock_send.assert_not_called()

    @override_settings(
        E2E_SUPPRESS_EMAIL_SECRET="secret-token",
        EMAIL_SENDER_BACKEND="core.email_sender.ConsoleEmailSender",
    )
    def test_middleware_suppresses_with_valid_token(self):
        _reset_sender()
        seen = []

        def view(request):
            seen.append(is_email_suppressed())
            return HttpResponse("ok")

        factory = RequestFactory()
        request = factory.get(
            "/api/processes/runs/",
            HTTP_X_SUPPRESS_EMAIL="1",
            HTTP_X_E2E_SUPPRESS_TOKEN="secret-token",
        )
        SuppressEmailMiddleware(view)(request)
        self.assertEqual(seen, [True])
        self.assertFalse(is_email_suppressed())

    @override_settings(E2E_SUPPRESS_EMAIL_SECRET="secret-token")
    def test_middleware_ignores_bad_token(self):
        seen = []

        def view(request):
            seen.append(is_email_suppressed())
            return HttpResponse("ok")

        factory = RequestFactory()
        request = factory.get(
            "/api/",
            HTTP_X_SUPPRESS_EMAIL="1",
            HTTP_X_E2E_SUPPRESS_TOKEN="wrong",
        )
        SuppressEmailMiddleware(view)(request)
        self.assertEqual(seen, [False])
