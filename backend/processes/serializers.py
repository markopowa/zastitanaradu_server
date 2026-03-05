from rest_framework import serializers

from .models import ProcessBinding, ProcessRun, ProcessTemplate, ProcessType, TaskAssignment


class ProcessTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessType
        fields = (
            "id",
            "code",
            "name",
            "description",
            "subject_kind",
            "default_period_months",
            "lead_time_days",
            "is_active",
        )


class ProcessTemplateSerializer(serializers.ModelSerializer):
    process_type_name = serializers.CharField(
        source="process_type.name", read_only=True)

    class Meta:
        model = ProcessTemplate
        fields = (
            "id",
            "process_type",
            "process_type_name",
            "document_template",
            "trigger",
            "generate_document",
            "send_email",
            "email_to_kind",
            "email_subject_template",
            "email_body_template",
            "custom_email_recipient",
            "followup_process_type",
        )


class ProcessBindingSerializer(serializers.ModelSerializer):
    process_type_name = serializers.CharField(
        source="process_type.name", read_only=True)

    class Meta:
        model = ProcessBinding
        fields = (
            "id",
            "process_type",
            "process_type_name",
            "subject_kind",
            "employee",
            "equipment_item",
            "client_company",
            "custom_period_months",
            "lead_time_days",
            "next_run_at",
            "last_run_at",
            "is_active",
        )


class ProcessRunSerializer(serializers.ModelSerializer):
    process_type_name = serializers.CharField(
        source="process_type.name", read_only=True)
    process_binding_id = serializers.IntegerField(
        source="process_binding.id", read_only=True)

    class Meta:
        model = ProcessRun
        fields = (
            "id",
            "process_binding",
            "process_binding_id",
            "process_type",
            "process_type_name",
            "subject_snapshot",
            "scheduled_for",
            "performed_at",
            "valid_until",
            "status",
            "notes",
            "result_data",
        )
        read_only_fields = (
            "process_binding",
            "process_type",
            "subject_snapshot",
            "scheduled_for",
        )


class ProcessRunCompleteSerializer(serializers.Serializer):
    performed_at = serializers.DateField(required=False, allow_null=True)
    valid_until = serializers.DateField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class TaskAssignmentSerializer(serializers.ModelSerializer):
    process_run_id = serializers.IntegerField(
        source="process_run.id", read_only=True)

    class Meta:
        model = TaskAssignment
        fields = (
            "id",
            "process_run",
            "process_run_id",
            "assigned_to",
            "title",
            "description",
            "due_date",
            "status",
        )
