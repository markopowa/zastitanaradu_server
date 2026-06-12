from datetime import date

from rest_framework import serializers

from .models import (
    ActivityLog,
    NotificationOutbox,
    ProcessBinding,
    ProcessNote,
    ProcessRun,
    ProcessRunDocument,
    ProcessTemplate,
    ProcessTriggerRun,
    ProcessType,
    TaskAssignment,
)
from .tasks import get_open_run_for_binding


def _user_display_label(user) -> str:
    if user is None:
        return ""
    email = (getattr(user, "email", None) or "").strip()
    if email:
        return email
    username = (getattr(user, "username", None) or "").strip()
    if username:
        return username
    first = (getattr(user, "first_name", None) or "").strip()
    last = (getattr(user, "last_name", None) or "").strip()
    return f"{first} {last}".strip()


class ProcessTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessTemplate
        fields = (
            "id",
            "process_type",
            "document_template",
            "trigger",
            "generate_document",
            "send_email",
            "attach_generated_document",
            "attach_uploaded_documents",
            "email_to_kind",
            "email_subject_template",
            "email_body_template",
            "custom_email_recipient",
            "notification_role_group",
            "followup_process_type",
        )

    def validate(self, attrs):
        instance = self.instance
        generate = attrs.get(
            "generate_document",
            getattr(instance, "generate_document",
                    False) if instance else False,
        )
        send = attrs.get(
            "send_email",
            getattr(instance, "send_email", False) if instance else False,
        )
        attach_generated = attrs.get(
            "attach_generated_document",
            getattr(instance, "attach_generated_document", False)
            if instance
            else False,
        )
        attach_uploaded = attrs.get(
            "attach_uploaded_documents",
            getattr(instance, "attach_uploaded_documents", False)
            if instance
            else False,
        )

        if attach_generated and not generate:
            raise serializers.ValidationError(
                {
                    "attach_generated_document": (
                        "Prilog generisanog dokumenta zahteva uključeno generisanje."
                    )
                }
            )
        if attach_generated and not send:
            raise serializers.ValidationError(
                {
                    "attach_generated_document": (
                        "Prilog generisanog dokumenta zahteva uključen mejl."
                    )
                }
            )
        if attach_uploaded and not send:
            raise serializers.ValidationError(
                {
                    "attach_uploaded_documents": (
                        "Prilog otpremljenih dokumenata zahteva uključen mejl."
                    )
                }
            )
        return attrs


class ProcessTypeSerializer(serializers.ModelSerializer):
    templates = ProcessTemplateSerializer(many=True, read_only=True)

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
            "reminder_offsets",
            "domain",
            "legal_basis",
            "shape",
            "proof_kind",
            "period_rules",
            "applicability_rule",
            "company_document_kind",
            "templates",
        )
        read_only_fields = ["code", "templates"]


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
    has_open_run = serializers.BooleanField(read_only=True, default=False)

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
            "has_open_run",
        )

    def validate_next_run_at(self, value):
        if value is not None and value < date.today():
            raise serializers.ValidationError(
                "Termin ne može biti u prošlosti."
            )
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get("next_run_at"):
            raise serializers.ValidationError(
                {"next_run_at": "Termin je obavezan."}
            )
        if self.instance is not None and get_open_run_for_binding(self.instance):
            changed = set(attrs.keys())
            if changed - {"is_active"}:
                if "next_run_at" in changed:
                    raise serializers.ValidationError(
                        {
                            "next_run_at": (
                                "Termin se ne može menjati dok traje aktivnost."
                            )
                        }
                    )
                raise serializers.ValidationError(
                    {
                        "detail": (
                            "Obaveza sa aktivnom aktivnošću ne može da se menja. "
                            "Deaktiviraj je ako treba da prestane."
                        )
                    }
                )
        return attrs


class ProcessTriggerRunSerializer(serializers.ModelSerializer):
    executed_by_display = serializers.SerializerMethodField()
    document_file_url = serializers.SerializerMethodField()
    template_send_email = serializers.SerializerMethodField()

    class Meta:
        model = ProcessTriggerRun
        fields = (
            "id",
            "process_template",
            "trigger",
            "executed_at",
            "executed_by_display",
            "email_sent",
            "email_error",
            "template_send_email",
            "document_file",
            "document_file_url",
        )

    def get_template_send_email(self, obj: ProcessTriggerRun) -> bool:
        template = obj.process_template
        return bool(template and template.send_email)

    def get_executed_by_display(self, obj: ProcessTriggerRun) -> str | None:
        label = _user_display_label(obj.executed_by)
        return label or None

    def get_document_file_url(self, obj: ProcessTriggerRun) -> str | None:
        if not obj.document_file_id:
            return None
        f = getattr(obj.document_file, "file", None)
        if not f:
            return None
        url = f.url
        if not url:
            return None
        request = self.context.get("request")
        if request and url.startswith("/"):
            return request.build_absolute_uri(url)
        return url


class ProcessRunSerializer(serializers.ModelSerializer):
    process_type_name = serializers.CharField(
        source="process_type.name", read_only=True)
    process_binding_id = serializers.IntegerField(
        source="process_binding.id", read_only=True)
    trigger_runs = ProcessTriggerRunSerializer(many=True, read_only=True)

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
            "trigger_runs",
        )
        read_only_fields = (
            "process_binding",
            "process_type",
            "subject_snapshot",
            "scheduled_for",
            "trigger_runs",
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


class ProcessRunDocumentUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    title = serializers.CharField(
        required=False, allow_blank=True, max_length=255)


class ProcessRunDocumentCreateSerializer(serializers.Serializer):
    document_file_id = serializers.IntegerField(required=False)
    usage_kind = serializers.ChoiceField(
        choices=ProcessRunDocument.USAGE_CHOICES,
        required=False,
        default=ProcessRunDocument.USAGE_REPORT,
    )

    def validate(self, attrs):
        if not self.initial_data.get("file") and not attrs.get("document_file_id"):
            raise serializers.ValidationError(
                {"detail": "Pošaljite fajl ili izaberite postojeći dokument."}
            )
        return attrs


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


class UpcomingDeadlineSerializer(serializers.Serializer):
    run_id = serializers.IntegerField()
    process_type_id = serializers.IntegerField()
    process_type_name = serializers.CharField()
    subject_kind = serializers.CharField()
    subject_name = serializers.CharField()
    client_company_id = serializers.IntegerField(allow_null=True)
    client_company_name = serializers.CharField(allow_blank=True)
    scheduled_for = serializers.DateField(allow_null=True)
    valid_until = serializers.DateField(allow_null=True)
    status = serializers.CharField()
    is_overdue = serializers.BooleanField()
    days_until_deadline = serializers.IntegerField(allow_null=True)


class ActivityLogSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    event_type_display = serializers.CharField(
        source="get_event_type_display", read_only=True)
    process_run_id = serializers.IntegerField(
        source="process_run.id", read_only=True, default=None)

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

    def get_username(self, obj: ActivityLog) -> str:
        if obj.user_id:
            return obj.user.username
        return "Sistem"


class NotificationOutboxSerializer(serializers.ModelSerializer):
    process_type_name = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    run_id = serializers.IntegerField(source="process_run.id", read_only=True)

    class Meta:
        model = NotificationOutbox
        fields = (
            "id",
            "process_run",
            "run_id",
            "process_template",
            "offset_days",
            "scheduled_send_on",
            "status",
            "attempts",
            "last_error",
            "recipients",
            "rendered_subject",
            "rendered_body",
            "document_file",
            "sent_at",
            "created_at",
            "process_type_name",
            "company_name",
        )
        read_only_fields = fields

    def get_process_type_name(self, obj: NotificationOutbox) -> str:
        try:
            return obj.process_run.process_type.name
        except Exception:
            return ""

    def get_company_name(self, obj: NotificationOutbox) -> str:
        try:
            binding = obj.process_run.process_binding
            if binding.client_company_id:
                return binding.client_company.name
            if binding.employee_id and binding.employee.client_company_id:
                return binding.employee.client_company.name
            if binding.equipment_item_id and binding.equipment_item.client_company_id:
                return binding.equipment_item.client_company.name
        except Exception:
            pass
        return ""


class NotificationOutboxPreviewSerializer(serializers.Serializer):
    rendered_subject = serializers.CharField(allow_blank=True)
    rendered_body = serializers.CharField(allow_blank=True)
    recipients = serializers.ListField(child=serializers.CharField())
