from django.contrib import admin

from .models import Employee, TrainingAttendance, TrainingProgram, TrainingSession, TrainingType

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "org_unit", "position")
    search_fields = ("first_name", "last_name", "email", "org_unit", "position")

@admin.register(TrainingType)
class TrainingTypeAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "default_validity_months", "is_for_high_risk_positions")
    search_fields = ("code", "name")

@admin.register(TrainingProgram)
class TrainingProgramAdmin(admin.ModelAdmin):
    list_display = ("title", "training_type", "created_at")
    list_filter = ("training_type",)

@admin.register(TrainingSession)
class TrainingSessionAdmin(admin.ModelAdmin):
    list_display = ("training_type", "session_date", "location", "instructor")
    list_filter = ("training_type", "session_date")

@admin.register(TrainingAttendance)
class TrainingAttendanceAdmin(admin.ModelAdmin):
    list_display = ("employee", "training_session", "valid_until", "passed")
    list_filter = ("valid_until", "passed")
    search_fields = ("employee__first_name", "employee__last_name", "certificate_number")
