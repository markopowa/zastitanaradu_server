from rest_framework import serializers

from .models import (
    ActivityLog,
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
    employee_first_name = serializers.CharField(
        source="employee.first_name", read_only=True, default="")
    employee_last_name = serializers.CharField(
        source="employee.last_name", read_only=True, default="")
    equipment_item_name = serializers.CharField(
        source="equipment_item.name", read_only=True, default="")
    client_company_name = serializers.CharField(
        source="client_company.name", read_only=True, default="")

    class Meta:
        model = ProcessBinding
        fields = (
            "id",
            "process_type",
            "process_type_name",
            "subject_kind",
            "employee",
            "employee_first_name",
            "employee_last_name",
            "equipment_item",
            "equipment_item_name",
            "client_company",
            "client_company_name",
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
    sent_by_username = serializers.CharField(
        source="sent_by.username", read_only=True, default="")

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
            "sent_at",
            "sent_by",
            "sent_by_username",
            "email_error",
        )
        read_only_fields = (
            "process_binding",
            "process_type",
            "subject_snapshot",
            "scheduled_for",
            "expired_reminder_sent_at",
            "sent_at",
            "sent_by",
            "email_error",
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
    document_file_url = serializers.SerializerMethodField()

    class Meta:
        model = ProcessRunDocument
        fields = (
            "id",
            "process_run",
            "document_file",
            "document_file_title",
            "document_file_url",
            "usage_kind",
        )

    def get_document_file_url(self, obj: ProcessRunDocument) -> str | None:
        df = obj.document_file
        f = getattr(df, "file", None)
        if not f:
            return None
        url = f.url
        if not url:
            return None
        request = self.context.get("request")
        if request and url.startswith("/"):
            return request.build_absolute_uri(url)
        return url


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


class EmployeeSendNowSerializer(serializers.Serializer):
    process_type_id = serializers.IntegerField(required=True)


class SendNowResponseSerializer(serializers.Serializer):
    process_run = ProcessRunSerializer()
    document_url = serializers.CharField(allow_blank=True, default="")
    email_sent = serializers.BooleanField()


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


class ActivityLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True, default="")
    event_type_display = serializers.CharField(source="get_event_type_display", read_only=True)
    process_run_id = serializers.IntegerField(source="process_run.id", read_only=True, default=None)

    class Meta:
        model = ActivityLog
        fields = (
            "id",
            "event_type",
            "event_type_display",
            "timestamp",
            "username",
            "process_run_id",
            "description",
            "extra_data",
        )
