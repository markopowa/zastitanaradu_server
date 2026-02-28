from rest_framework import permissions, viewsets

from .models import ClientCompany, Employee, EquipmentItem
from .serializers import ClientCompanySerializer, EmployeeSerializer, EquipmentItemSerializer


class ClientCompanyViewSet(viewsets.ModelViewSet):
    queryset = ClientCompany.objects.all().order_by("name")
    serializer_class = ClientCompanySerializer
    permission_classes = [permissions.DjangoModelPermissions]


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related(
        "client_company").all().order_by("id")
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        client_company_id = self.request.query_params.get("client_company_id")
        if client_company_id is not None and client_company_id != "":
            queryset = queryset.filter(client_company_id=client_company_id)
        return queryset


class EquipmentItemViewSet(viewsets.ModelViewSet):
    queryset = EquipmentItem.objects.select_related(
        "client_company").all().order_by("name")
    serializer_class = EquipmentItemSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        client_company_id = self.request.query_params.get("client_company_id")
        if client_company_id is not None and client_company_id != "":
            queryset = queryset.filter(client_company_id=client_company_id)
        return queryset
