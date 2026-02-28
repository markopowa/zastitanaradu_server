from django.urls import include, path
from django.views.decorators.csrf import csrf_exempt
from rest_framework.routers import DefaultRouter

from .views import (
    ChangePasswordView,
    GroupViewSet,
    LoginView,
    LogoutView,
    MeView,
    RefreshTokenView,
    UserViewSet,
    permissions_view,
    permissions_list_view,
)

app_name = "authentication"

router = DefaultRouter()
router.register("users", UserViewSet, basename="auth-users")
router.register("roles", GroupViewSet, basename="auth-roles")

urlpatterns = [
    path("login/", csrf_exempt(LoginView.as_view()), name="auth-login"),
    path("refresh/", csrf_exempt(RefreshTokenView.as_view()), name="auth-refresh"),
    path("logout/", csrf_exempt(LogoutView.as_view()), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("change-password/", ChangePasswordView.as_view(),
         name="auth-change-password"),
    path("meta/permissions/", permissions_view, name="auth-permissions"),
    path("permissions/", permissions_list_view, name="auth-permissions-list"),
    path("", include(router.urls)),
]
