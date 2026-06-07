import os

from rest_framework import serializers

from .models import (
    ClientCompany,
    CompanyDocument,
    ContactPerson,
    Employee,
    EquipmentItem,
    JobRole,
    RiskLevel,
)


class RiskLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskLevel
        fields = (
            "id",
            "code",
            "label",
            "score",
            "is_acceptable",
            "is_high_risk",
            "order",
        )


class JobRoleSerializer(serializers.ModelSerializer):
    risk_level_detail = RiskLevelSerializer(source="risk_level", read_only=True)
    employee_count = serializers.IntegerField(
        source="employees.count", read_only=True)

    class Meta:
        model = JobRole
        fields = (
            "id",
            "client_company",
            "name",
            "description",
            "risk_level",
            "risk_level_detail",
            "employee_count",
        )


class ClientCompanySerializer(serializers.ModelSerializer):
    risk_assessment_act_name = serializers.SerializerMethodField()

    class Meta:
        model = ClientCompany
        fields = (
            "id",
            "name",
            "tax_id",
            "registration_number",
            "address",
            "phone",
            "email",
            "website",
            "logo",
            "notes",
            "activity_code",
            "risk_assessment_act_file",
            "risk_assessment_act_name",
            "risk_assessment_act_date",
        )
        read_only_fields = ("risk_assessment_act_file",)

    def get_risk_assessment_act_name(self, obj):
        f = obj.risk_assessment_act_file
        if not f:
            return ""
        base = os.path.basename(f.name)
        name, _ = os.path.splitext(base)
        return name


class EmployeeSerializer(serializers.ModelSerializer):
    client_company_name = serializers.CharField(
        source="client_company.name", read_only=True)
    job_role_name = serializers.CharField(
        source="job_role.name", read_only=True)
    job_role_risk_level = RiskLevelSerializer(
        source="job_role.risk_level", read_only=True)
    risk_level_override_detail = RiskLevelSerializer(
        source="risk_level_override", read_only=True)
    effective_risk_level = RiskLevelSerializer(read_only=True)

    class Meta:
        model = Employee
        fields = (
            "id",
            "client_company",
            "client_company_name",
            "first_name",
            "last_name",
            "father_name",
            "national_id",
            "date_of_birth",
            "place_of_birth",
            "email",
            "org_unit",
            "position",
            "occupation",
            "high_risk_position_name",
            "job_role",
            "job_role_name",
            "job_role_risk_level",
            "risk_level_override",
            "risk_level_override_detail",
            "effective_risk_level",
        )


class ContactPersonSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(
        source="get_role_display",
        read_only=True,
    )

    class Meta:
        model = ContactPerson
        fields = (
            "id",
            "client_company",
            "full_name",
            "role",
            "role_display",
            "phone",
            "email",
            "is_primary",
        )


class CompanyDocumentSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(
        source="get_kind_display",
        read_only=True,
    )
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = CompanyDocument
        fields = (
            "id",
            "client_company",
            "kind",
            "kind_display",
            "file",
            "file_name",
            "uploaded_at",
        )
        read_only_fields = ("file", "uploaded_at")

    def get_file_name(self, obj):
        if not obj.file:
            return ""
        base = os.path.basename(obj.file.name)
        name, _ = os.path.splitext(base)
        return name


class EquipmentItemSerializer(serializers.ModelSerializer):
    client_company_name = serializers.CharField(
        source="client_company.name", read_only=True)

    class Meta:
        model = EquipmentItem
        fields = (
            "id",
            "client_company",
            "name",
            "category",
            "inventory_number",
            "location",
            "notes",
            "is_active",
        )
