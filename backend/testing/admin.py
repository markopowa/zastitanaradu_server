from django.contrib import admin

from .models import TestAttempt, TestQuestion


@admin.register(TestQuestion)
class TestQuestionAdmin(admin.ModelAdmin):
    list_display = ("text", "client_company", "correct_key", "is_active", "order")
    list_filter = ("client_company", "is_active")
    search_fields = ("text",)


@admin.register(TestAttempt)
class TestAttemptAdmin(admin.ModelAdmin):
    list_display = ("employee", "created_at", "score_pct", "passed", "run")
    list_filter = ("passed",)
    search_fields = ("employee__first_name", "employee__last_name")
    readonly_fields = ("created_at",)
