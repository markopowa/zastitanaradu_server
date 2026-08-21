from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from rest_framework import serializers

User = get_user_model()

ADMIN_GROUP_NAME = "Admin"


def _permission_key(permission: Permission) -> str:
    return f"{permission.content_type.app_label}.{permission.codename}"


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ("id", "codename", "name")


class GroupSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Group
        fields = ("id", "name", "permissions")


class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SlugRelatedField(
        many=True,
        source="groups",
        slug_field="name",
        read_only=True,
    )
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "is_active",
            "is_staff",
            "is_superuser",
            "roles",
            "permissions",
        )

    def get_permissions(self, obj: User) -> list[str]:
        user = User.objects.prefetch_related(
            "groups__permissions").get(pk=obj.pk)
        if hasattr(user, "_perm_cache"):
            del user._perm_cache
        return list(user.get_all_permissions())


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("username", "first_name", "last_name")


class UserAdminSerializer(serializers.ModelSerializer):
    roles = serializers.PrimaryKeyRelatedField(
        many=True,
        source="groups",
        queryset=Group.objects.all(),
        required=False,
    )
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "roles",
            "password",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is not None and not user.is_superuser:
            self.fields["roles"].queryset = Group.objects.exclude(
                name=ADMIN_GROUP_NAME
            )

    def validate(self, attrs):
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        groups = attrs.get("groups")
        if (
            groups is not None
            and actor is not None
            and not actor.is_superuser
            and any(g.name == ADMIN_GROUP_NAME for g in groups)
        ):
            raise serializers.ValidationError(
                {"roles": "Ne možete dodeliti Admin ulogu."}
            )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        groups = validated_data.pop("groups", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if groups is not None:
            instance.groups.set(groups)

        if password is not None:
            instance.set_password(password)
            instance.save(update_fields=["password"])

        return instance


class GroupAdminSerializer(serializers.ModelSerializer):
    permissions = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Permission.objects.filter(
            content_type__app_label__in=(
                "auth", "documents", "partners", "processes")
        ).exclude(content_type__model="permission"),
    )

    class Meta:
        model = Group
        fields = ("id", "name", "permissions")

    def validate_name(self, value):
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        if (
            actor is not None
            and not actor.is_superuser
            and value == ADMIN_GROUP_NAME
        ):
            raise serializers.ValidationError(
                "Ne možete kreirati ili preimenovati ulogu u Admin."
            )
        return value

    def validate_permissions(self, value):
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        if actor is None or actor.is_superuser:
            return value
        if hasattr(actor, "_perm_cache"):
            del actor._perm_cache
        allowed = set(actor.get_all_permissions())
        existing = set()
        if self.instance is not None:
            existing = {
                _permission_key(p) for p in self.instance.permissions.all()
            }
        forbidden = [
            _permission_key(p)
            for p in value
            if _permission_key(p) not in allowed
            and _permission_key(p) not in existing
        ]
        if forbidden:
            raise serializers.ValidationError(
                "Ne možete dodeliti permisije koje sami nemate."
            )
        return value
