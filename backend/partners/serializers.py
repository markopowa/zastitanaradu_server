from rest_framework import serializers

from .models import ClientCompany, Employee, EquipmentItem


class ClientCompanySerializer(serializers.ModelSerializer):
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
        )


class EmployeeSerializer(serializers.ModelSerializer):
    client_company_name = serializers.CharField(
        source="client_company.name", read_only=True)

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
        )


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
