import logging
import uuid

from django.conf import settings
from django.core.exceptions import DisallowedHost
from django.http import Http404

logger = logging.getLogger(__name__)

def _get_access_cookie_name():
    return getattr(settings, "JWT_ACCESS_COOKIE_NAME", "access_token")

def _get_refresh_cookie_name():
    return getattr(settings, "JWT_REFRESH_COOKIE_NAME", "refresh_token")

def get_jwt_cookie_names():
    return _get_access_cookie_name(), _get_refresh_cookie_name()

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
        except Exception:
            logger.exception("Unhandled exception for path %s", request.path)
            raise
        return response

class CorrelationIdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        correlation_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.correlation_id = correlation_id
        response = self.get_response(request)
        response.headers["X-Request-ID"] = correlation_id
        return response
