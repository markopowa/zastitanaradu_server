from django.contrib import admin

from .models import ClientCompany, Employee, EquipmentItem, JobRole, RiskLevel


@admin.register(RiskLevel)
class RiskLevelAdmin(admin.ModelAdmin):
    list_display = ("code", "label", "score", "is_acceptable", "is_high_risk", "order")
    search_fields = ("code", "label")
    list_filter = ("is_acceptable", "is_high_risk")


@admin.register(JobRole)
class JobRoleAdmin(admin.ModelAdmin):
    list_display = ("name", "client_company", "risk_level")
    search_fields = ("name",)
    list_filter = ("client_company", "risk_level")


@admin.register(ClientCompany)
class ClientCompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "tax_id", "email", "phone")
    search_fields = ("name", "tax_id", "registration_number", "email")


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        "first_name",
        "last_name",
        "national_id",
        "org_unit",
        "position",
        "job_role",
        "client_company",
    )
    search_fields = (
        "first_name",
        "last_name",
        "email",
        "national_id",
        "org_unit",
        "position",
        "occupation",
        "high_risk_position_name",
    )
    list_filter = ("client_company", "job_role")


@admin.register(EquipmentItem)
class EquipmentItemAdmin(admin.ModelAdmin):
    list_display = ("name", "client_company", "category",
                    "inventory_number", "is_active")
    search_fields = ("name", "inventory_number", "location")
    list_filter = ("client_company", "is_active")
