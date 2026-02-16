from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    GroupViewSet,
    LoginView,
    LogoutView,
    MeView,
    RefreshTokenView,
    UserViewSet,
    permissions_view,
)


app_name = "authentication"

router = DefaultRouter()
router.register("users", UserViewSet, basename="auth-users")
router.register("roles", GroupViewSet, basename="auth-roles")


urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", RefreshTokenView.as_view(), name="auth-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("meta/permissions/", permissions_view, name="auth-permissions"),
    path("", include(router.urls)),
]



