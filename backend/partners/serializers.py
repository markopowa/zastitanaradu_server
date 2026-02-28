from rest_framework import serializers

from .models import ClientCompany, Employee, EquipmentItem


class ClientCompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientCompany
        fields = (
            "id",
            "name",
            "pib",
            "registration_number",
            "address",
            "phone",
            "email",
            "website",
            "logo",
            "notes",
        )


class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = (
            "id",
            "client_company",
            "first_name",
            "last_name",
            "email",
            "org_unit",
            "position",
        )


class EquipmentItemSerializer(serializers.ModelSerializer):
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
