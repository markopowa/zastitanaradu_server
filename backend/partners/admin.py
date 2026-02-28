from django.contrib import admin

from .models import ClientCompany, Employee, EquipmentItem


@admin.register(ClientCompany)
class ClientCompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "pib", "email", "phone")
    search_fields = ("name", "pib", "registration_number", "email")


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "org_unit",
                    "position", "client_company")
    search_fields = ("first_name", "last_name",
                     "email", "org_unit", "position")
    list_filter = ("client_company",)


@admin.register(EquipmentItem)
class EquipmentItemAdmin(admin.ModelAdmin):
    list_display = ("name", "client_company", "category",
                    "inventory_number", "is_active")
    search_fields = ("name", "inventory_number", "location")
    list_filter = ("client_company", "is_active")
