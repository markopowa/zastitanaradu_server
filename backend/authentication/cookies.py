from django.http import HttpResponse
from django.conf import settings

from core.middleware import get_jwt_cookie_names


def _cookie_kwargs():
    return {
        "httponly": True,
        "samesite": getattr(settings, "JWT_COOKIE_SAMESITE", "Lax"),
        "secure": getattr(settings, "JWT_COOKIE_SECURE", False),
        "path": "/",
    }


def set_jwt_cookies(response: HttpResponse, access: str, refresh: str, request=None) -> None:
    access_name, refresh_name = get_jwt_cookie_names()
    max_age = getattr(settings, "JWT_COOKIE_MAX_AGE_DAYS", 180) * 24 * 60 * 60
    kwargs = _cookie_kwargs()
    response.set_cookie(access_name, access, max_age=max_age, **kwargs)
    response.set_cookie(refresh_name, refresh, max_age=max_age, **kwargs)


def clear_jwt_cookies(response: HttpResponse) -> None:
    access_name, refresh_name = get_jwt_cookie_names()
    kwargs = _cookie_kwargs()
    response.delete_cookie(
        access_name, path=kwargs["path"], samesite=kwargs["samesite"]
    )
    response.delete_cookie(
        refresh_name, path=kwargs["path"], samesite=kwargs["samesite"]
    )
