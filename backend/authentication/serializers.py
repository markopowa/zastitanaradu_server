from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from rest_framework import serializers

User = get_user_model()

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
            "roles",
            "permissions",
        )

    def get_permissions(self, obj: User) -> list[str]:
        return list(obj.get_all_permissions())

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
            content_type__app_label__in=("auth", "documents", "trainings")
        ).exclude(content_type__model="permission"),
    )

    class Meta:
        model = Group
        fields = ("id", "name", "permissions")
