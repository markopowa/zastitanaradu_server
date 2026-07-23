from rest_framework import serializers

from partners.models import Employee

from .models import TestAttempt, TestQuestion


class TestQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestQuestion
        fields = (
            "id",
            "client_company",
            "text",
            "choices",
            "correct_key",
            "is_active",
            "order",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not (user and user.is_staff):
            data.pop("correct_key", None)
        return data


class TestAttemptCreateSerializer(serializers.Serializer):
    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all())
    answers = serializers.DictField(child=serializers.CharField())


class TestAttemptResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestAttempt
        fields = (
            "id",
            "employee",
            "created_at",
            "score_pct",
            "passed",
            "answers",
            "run",
        )
        read_only_fields = fields
