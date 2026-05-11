from django.http import HttpResponse

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .medical_exam_record import generate_medical_exam_record
from .models import ClientCompany, Employee, EquipmentItem
from .serializers import ClientCompanySerializer, EmployeeSerializer, EquipmentItemSerializer


class ClientCompanyViewSet(viewsets.ModelViewSet):
    queryset = ClientCompany.objects.all().order_by("name")
    serializer_class = ClientCompanySerializer
    permission_classes = [permissions.DjangoModelPermissions]

    @action(detail=True, methods=["get"], url_path="medical-exam-record")
    def medical_exam_record(self, request, pk=None):
        company = self.get_object()
        content = generate_medical_exam_record(company.id)
        slug = company.name.replace(" ", "_")[:40]
        response = HttpResponse(
            content,
            content_type=(
                "application/vnd.openxmlformats-officedocument"
                ".wordprocessingml.document"
            ),
        )
        response["Content-Disposition"] = (
            f'attachment; filename="medical_exam_record_{slug}.docx"'
        )
        return response

    @action(
        detail=True,
        methods=["post", "delete"],
        url_path="risk-assessment-act",
        parser_classes=[MultiPartParser, FormParser],
    )
    def risk_assessment_act(self, request, pk=None):
        company = self.get_object()
        if request.method == "DELETE":
            if company.risk_assessment_act_file:
                company.risk_assessment_act_file.delete(save=False)
                company.risk_assessment_act_file = None
                company.save(update_fields=["risk_assessment_act_file"])
            return Response(self.get_serializer(company).data)
        file_obj = request.FILES.get("file")
        if file_obj is None:
            return Response(
                {"detail": "Nije priložen fajl (polje 'file')."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if company.risk_assessment_act_file:
            company.risk_assessment_act_file.delete(save=False)
        company.risk_assessment_act_file = file_obj
        company.save(update_fields=["risk_assessment_act_file"])
        return Response(self.get_serializer(company).data)


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
