import logging
import uuid

from django.conf import settings
from django.core.exceptions import DisallowedHost
from django.http import Http404, HttpResponseForbidden

logger = logging.getLogger(__name__)


def client_ip(request) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def _get_access_cookie_name():
    return getattr(settings, "JWT_ACCESS_COOKIE_NAME", "access_token")


def _get_refresh_cookie_name():
    return getattr(settings, "JWT_REFRESH_COOKIE_NAME", "refresh_token")


def get_jwt_cookie_names():
    return _get_access_cookie_name(), _get_refresh_cookie_name()


class NginxProxyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self._secret = getattr(settings, "PZNR_NGINX_PROXY_SECRET", "")

    def __call__(self, request):
        if self._secret and not settings.DEBUG:
            token = request.META.get("HTTP_X_PZNR_PROXY", "")
            if token != self._secret:
                return HttpResponseForbidden()
        return self.get_response(request)


class JWTCookieToAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.META.get("HTTP_AUTHORIZATION"):
            access = request.COOKIES.get(_get_access_cookie_name())
            if access:
                request.META["HTTP_AUTHORIZATION"] = f"Bearer {access}"
        response = self.get_response(request)
        return response


class IgnoreDisallowedHost(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        exc_info = record.exc_info
        if not exc_info:
            return True
        exc_type = exc_info[0]
        if exc_type is DisallowedHost:
            return False
        return True


class PageNotFoundMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            response = self.get_response(request)
        except Http404:
            logger.warning("Page not found: %s", request.path)
            raise
        return response


class ErrorLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            response = self.get_response(request)
        except DisallowedHost as exc:
            logger.warning(
                "DisallowedHost host=%s client=%s method=%s path=%s user_agent=%s (%s)",
                request.META.get("HTTP_HOST", ""),
                client_ip(request),
                request.method,
                request.get_full_path(),
                request.META.get("HTTP_USER_AGENT", ""),
                exc,
            )
            raise
        except Exception:
            logger.exception("Unhandled exception for path %s", request.path)
            raise
        return response


class CorrelationIdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        correlation_id = request.headers.get(
            "X-Request-ID") or str(uuid.uuid4())
        request.correlation_id = correlation_id
        response = self.get_response(request)
        response.headers["X-Request-ID"] = correlation_id
        return response


class SuppressEmailMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from .email_context import reset_suppress_email, set_suppress_email

        token = None
        if _request_wants_suppressed_email(request):
            token = set_suppress_email(True)
        try:
            return self.get_response(request)
        finally:
            if token is not None:
                reset_suppress_email(token)


def _request_wants_suppressed_email(request) -> bool:
    if request.META.get("HTTP_X_SUPPRESS_EMAIL") != "1":
        return False
    secret = getattr(settings, "E2E_SUPPRESS_EMAIL_SECRET", "") or ""
    if not secret:
        return False
    token = request.META.get("HTTP_X_E2E_SUPPRESS_TOKEN", "")
    return token == secret
