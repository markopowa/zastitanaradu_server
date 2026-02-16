from rest_framework import serializers

from .models import Employee, TrainingAttendance, TrainingProgram, TrainingSession, TrainingType


class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ("id", "first_name", "last_name", "email", "org_unit", "position")


class TrainingTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingType
        fields = (
            "id",
            "code",
            "name",
            "description",
            "default_validity_months",
            "is_for_high_risk_positions",
        )


class TrainingProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingProgram
        fields = ("id", "training_type", "title", "document_file", "created_at", "updated_at")


class TrainingSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingSession
        fields = (
            "id",
            "training_type",
            "program",
            "session_date",
            "location",
            "instructor",
            "notes",
        )


class TrainingAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingAttendance
        fields = (
            "id",
            "employee",
            "training_session",
            "valid_until",
            "certificate_number",
            "passed",
            "notes",
            "created_by",
            "created_at",
        )
        read_only_fields = ("created_by", "created_at")

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user and not validated_data.get("created_by"):
            validated_data["created_by"] = request.user
        return super().create(validated_data)


