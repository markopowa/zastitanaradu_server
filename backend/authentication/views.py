from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.db.models import Q
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)
from rest_framework_simplejwt.tokens import RefreshToken

from core.middleware import get_jwt_cookie_names
from .cookies import clear_jwt_cookies, set_jwt_cookies
from .serializers import (
    GroupAdminSerializer,
    GroupSerializer,
    ProfileUpdateSerializer,
    UserAdminSerializer,
    UserSerializer,
    PermissionSerializer
)

User = get_user_model()


class LoginView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = TokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        if request.user and request.user.is_authenticated:
            user = request.user
            refresh = RefreshToken.for_user(user)
            access = str(refresh.access_token)
            refresh_str = str(refresh)
            user_data = UserSerializer(user).data
            response = Response(
                {
                    "access": access,
                    "refresh": refresh_str,
                    "user": user_data,
                },
                status=status.HTTP_200_OK,
            )
            set_jwt_cookies(response, access, refresh_str, request=request)
            return response

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tokens = serializer.validated_data
        user = serializer.user
        user_data = UserSerializer(user).data
        access = tokens.get("access")
        refresh = tokens.get("refresh")
        response = Response(
            {
                "access": access,
                "refresh": refresh,
                "user": user_data,
            },
            status=status.HTTP_200_OK,
        )
        set_jwt_cookies(response, access, refresh, request=request)
        return response


class RefreshTokenView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = TokenRefreshSerializer

    def _get_refresh_value(self, request):
        _, refresh_name = get_jwt_cookie_names()
        return request.COOKIES.get(refresh_name) or request.data.get("refresh")

    def post(self, request, *args, **kwargs):
        refresh_value = self._get_refresh_value(request)
        if not refresh_value:
            return Response(
                {"detail": "Refresh token required (cookie or body)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(data={"refresh": refresh_value})
        serializer.is_valid(raise_exception=True)
        access = serializer.validated_data["access"]
        refresh = serializer.validated_data.get("refresh") or refresh_value
        response = Response(
            {"access": access, "refresh": refresh},
            status=status.HTTP_200_OK,
        )
        set_jwt_cookies(response, access, refresh)
        return response


class LogoutView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = TokenRefreshSerializer

    def post(self, request, *args, **kwargs):
        _, refresh_name = get_jwt_cookie_names()
        refresh_token = request.COOKIES.get(
            refresh_name) or request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_jwt_cookies(response)
        return response


class MeView(generics.RetrieveUpdateAPIView):
    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method == "PATCH" or self.request.method == "PUT":
            return ProfileUpdateSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", True)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(instance).data)


class ChangePasswordView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        current = request.data.get("current_password")
        new_password = request.data.get("new_password")
        if not current or not new_password:
            return Response(
                {"detail": "current_password and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = request.user
        if not user.check_password(current):
            return Response(
                {"detail": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserAdminSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()

        user = getattr(self.request, "user", None)
        if user is not None and not user.is_superuser:
            queryset = queryset.filter(
                is_superuser=False).exclude(groups__name="Admin")

        search = self.request.query_params.get("search")
        is_active = self.request.query_params.get("is_active")
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
            )
        if is_active is not None:
            if is_active.lower() in ("true", "1"):
                queryset = queryset.filter(is_active=True)
            if is_active.lower() in ("false", "0"):
                queryset = queryset.filter(is_active=False)
        return queryset

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class GroupViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = Group.objects.filter(
            permissions__content_type__app_label__in=(
                "auth", "documents", "partners", "processes")
        ).distinct().order_by("id")

        user = getattr(self.request, "user", None)
        if user is not None and not user.is_superuser:
            queryset = queryset.exclude(name="Admin")

        return queryset

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return GroupSerializer
        return GroupAdminSerializer


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def permissions_view(request):
    user = User.objects.prefetch_related("groups__permissions").get(
        pk=request.user.pk
    )
    if hasattr(user, "_perm_cache"):
        del user._perm_cache
    relevant_apps = ("auth", "documents", "partners", "processes")
    all_perms = list(user.get_all_permissions())
    filtered_perms = [
        p for p in all_perms
        if any(p.startswith(f"{app}.") for app in relevant_apps)
    ]
    return Response(
        {
            "roles": list(user.groups.values_list("name", flat=True)),
            "permissions": filtered_perms,
        }
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def permissions_list_view(request):
    relevant_apps = ("auth", "documents", "partners", "processes")
    perms = (
        Permission.objects.select_related("content_type")
        .filter(content_type__app_label__in=relevant_apps)
        .exclude(content_type__model="permission")
        .order_by("content_type__app_label", "content_type__model", "codename")
    )
    if not request.user.is_superuser:
        if hasattr(request.user, "_perm_cache"):
            del request.user._perm_cache
        allowed = set(request.user.get_all_permissions())
        perms = [
            p for p in perms
            if f"{p.content_type.app_label}.{p.codename}" in allowed
        ]
    serializer = PermissionSerializer(perms, many=True)
    return Response(serializer.data)
