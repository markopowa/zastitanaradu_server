from rest_framework import serializers

from .models import (
    ProcessBinding,
    ProcessNote,
    ProcessRun,
    ProcessRunDocument,
    ProcessTemplate,
    ProcessType,
    TaskAssignment,
)


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
            "include_in_medical_exam_record",
        )
        read_only_fields = ["code"]


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
            "notification_role_group",
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
            "expired_reminder_sent_at",
        )
        read_only_fields = (
            "process_binding",
            "process_type",
            "subject_snapshot",
            "scheduled_for",
            "expired_reminder_sent_at",
        )


class ProcessRunCompleteSerializer(serializers.Serializer):
    performed_at = serializers.DateField(required=False, allow_null=True)
    valid_until = serializers.DateField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    result_data = serializers.JSONField(required=False, allow_null=True)


class ProcessRunDocumentSerializer(serializers.ModelSerializer):
    document_file_title = serializers.CharField(
        source="document_file.title", read_only=True
    )

    class Meta:
        model = ProcessRunDocument
        fields = (
            "id",
            "process_run",
            "document_file",
            "document_file_title",
            "usage_kind",
        )


class ProcessRunDocumentCreateSerializer(serializers.Serializer):
    document_file_id = serializers.IntegerField(required=True)
    usage_kind = serializers.ChoiceField(
        choices=ProcessRunDocument.USAGE_CHOICES,
        required=False,
        default=ProcessRunDocument.USAGE_REPORT,
    )


class ProcessNoteSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(
        source="author.username", read_only=True)

    class Meta:
        model = ProcessNote
        fields = (
            "id",
            "process_run",
            "author",
            "author_username",
            "body",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "process_run",
            "author",
            "created_at",
            "updated_at",
        )


class ProcessNoteCreateSerializer(serializers.Serializer):
    body = serializers.CharField()


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
