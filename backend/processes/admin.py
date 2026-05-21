from django.contrib import admin

from .models import (
    ProcessBinding,
    ProcessNote,
    ProcessRun,
    ProcessTemplate,
    ProcessTriggerRun,
    ProcessType,
    TaskAssignment,
)


@admin.register(ProcessType)
class ProcessTypeAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "name",
        "subject_kind",
        "default_period_months",
        "lead_time_days",
        "is_active",
        "include_in_medical_exam_record",
    )
    search_fields = ("code", "name")
    list_filter = ("subject_kind", "is_active")


@admin.register(ProcessNote)
class ProcessNoteAdmin(admin.ModelAdmin):
    list_display = ("process_run", "author", "created_at")
    search_fields = ("body",)
    raw_id_fields = ("process_run", "author")


@admin.register(ProcessTemplate)
class ProcessTemplateAdmin(admin.ModelAdmin):
    list_display = (
        "process_type",
        "trigger",
        "generate_document",
        "send_email",
        "attach_generated_document",
        "attach_uploaded_documents",
        "email_to_kind",
        "notification_role_group",
    )
    list_filter = ("process_type", "trigger")
    search_fields = ("process_type__name", "email_subject_template")


@admin.register(ProcessBinding)
class ProcessBindingAdmin(admin.ModelAdmin):
    list_display = ("process_type", "subject_kind", "employee",
                    "equipment_item", "client_company", "next_run_at", "is_active")
    list_filter = ("process_type", "subject_kind", "is_active")
    search_fields = ("process_type__name",)
    raw_id_fields = ("employee", "equipment_item", "client_company")


@admin.register(ProcessRun)
class ProcessRunAdmin(admin.ModelAdmin):
    list_display = (
        "process_type",
        "process_binding",
        "scheduled_for",
        "performed_at",
        "valid_until",
        "status",
    )
    list_filter = ("status", "process_type")
    search_fields = ("process_binding__process_type__name",)
    raw_id_fields = ("process_binding",)


@admin.register(ProcessTriggerRun)
class ProcessTriggerRunAdmin(admin.ModelAdmin):
    list_display = (
        "process_run",
        "trigger",
        "executed_at",
        "email_sent",
    )
    list_filter = ("trigger",)
    raw_id_fields = ("process_run", "process_template", "executed_by", "document_file")


@admin.register(TaskAssignment)
class TaskAssignmentAdmin(admin.ModelAdmin):
    list_display = ("title", "process_run",
                    "assigned_to", "due_date", "status")
    list_filter = ("status",)
    search_fields = ("title", "description")
    raw_id_fields = ("process_run", "assigned_to")
