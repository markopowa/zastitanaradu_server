from django.contrib import admin

from .models import (
    ClientCompany,
    CompanyComplianceFinding,
    CompanyDocument,
    CompanyObligationExclusion,
    ComplianceFindingType,
    ContactPerson,
    Employee,
    EquipmentItem,
    JobRole,
    RiskAssessmentAct,
    RiskAssessmentActAmendment,
    RiskAssessmentSection,
    RiskAssessmentSectionRevision,
    RiskLevel,
)


@admin.register(RiskLevel)
class RiskLevelAdmin(admin.ModelAdmin):
    list_display = ("code", "label", "score",
                    "is_acceptable", "is_high_risk", "order")
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


@admin.register(ContactPerson)
class ContactPersonAdmin(admin.ModelAdmin):
    list_display = (
        "full_name",
        "role",
        "client_company",
        "phone",
        "email",
        "is_primary",
    )
    search_fields = ("full_name", "phone", "email")
    list_filter = ("role", "client_company", "is_primary")


@admin.register(CompanyDocument)
class CompanyDocumentAdmin(admin.ModelAdmin):
    list_display = ("client_company", "kind", "uploaded_at")
    list_filter = ("kind", "client_company")


@admin.register(ComplianceFindingType)
class ComplianceFindingTypeAdmin(admin.ModelAdmin):
    list_display = (
        "order",
        "code",
        "name",
        "default_validity_months",
        "process_type",
        "is_active",
    )
    list_filter = ("is_active",)
    search_fields = ("code", "name")


@admin.register(CompanyComplianceFinding)
class CompanyComplianceFindingAdmin(admin.ModelAdmin):
    list_display = (
        "client_company",
        "finding_type",
        "issued_date",
        "valid_until",
    )
    list_filter = ("finding_type",)


@admin.register(RiskAssessmentAct)
class RiskAssessmentActAdmin(admin.ModelAdmin):
    list_display = ("client_company", "act_date", "updated_at")


@admin.register(RiskAssessmentActAmendment)
class RiskAssessmentActAmendmentAdmin(admin.ModelAdmin):
    list_display = ("act", "title", "uploaded_by", "uploaded_at")
    list_filter = ("act__client_company",)
    raw_id_fields = ("act", "uploaded_by")


@admin.register(RiskAssessmentSection)
class RiskAssessmentSectionAdmin(admin.ModelAdmin):
    list_display = ("act", "section_type", "current_version")


@admin.register(RiskAssessmentSectionRevision)
class RiskAssessmentSectionRevisionAdmin(admin.ModelAdmin):
    list_display = ("section", "version", "created_by", "created_at")


@admin.register(EquipmentItem)
class EquipmentItemAdmin(admin.ModelAdmin):
    list_display = ("name", "client_company", "category",
                    "inventory_number", "is_active")
    search_fields = ("name", "inventory_number", "location")
    list_filter = ("client_company", "is_active")


@admin.register(CompanyObligationExclusion)
class CompanyObligationExclusionAdmin(admin.ModelAdmin):
    list_display = ("client_company", "process_type",
                    "created_by", "created_at")
    search_fields = ("client_company__name", "process_type__code", "reason")
    list_filter = ("process_type",)
    raw_id_fields = ("client_company", "process_type", "created_by")
