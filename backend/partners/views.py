from django.conf import settings
from django.db.models import ProtectedError, Q
from django.http import HttpResponse

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .apr import fetch_company_from_apr
from .medical_exam_record import generate_medical_exam_record
from .models import (
    ClientCompany,
    CompanyDocument,
    ContactPerson,
    Employee,
    EquipmentItem,
    JobRole,
    RiskLevel,
)
from .serializers import (
    ClientCompanySerializer,
    CompanyDocumentSerializer,
    ContactPersonSerializer,
    EmployeeSerializer,
    EquipmentItemSerializer,
    JobRoleSerializer,
    RiskLevelSerializer,
)


class RiskLevelViewSet(viewsets.ModelViewSet):
    queryset = RiskLevel.objects.all().order_by("order", "score")
    serializer_class = RiskLevelSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Nivo rizika se koristi i ne moze se obrisati."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class JobRoleViewSet(viewsets.ModelViewSet):
    queryset = JobRole.objects.select_related(
        "client_company", "risk_level").all().order_by("client_company", "name")
    serializer_class = JobRoleSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        client_company_id = self.request.query_params.get("client_company_id")
        if client_company_id is not None and client_company_id != "":
            queryset = queryset.filter(client_company_id=client_company_id)
        return queryset


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
        "client_company",
        "job_role",
        "job_role__risk_level",
        "risk_level_override",
    ).all().order_by("last_name", "first_name")
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        client_company_id = self.request.query_params.get("client_company_id")
        if client_company_id is not None and client_company_id != "":
            queryset = queryset.filter(client_company_id=client_company_id)
        search = (self.request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(national_id__icontains=search)
            )
        risk_level_id = self.request.query_params.get("risk_level_id")
        if risk_level_id is not None and risk_level_id != "":
            queryset = queryset.filter(
                Q(risk_level_override_id=risk_level_id)
                | Q(job_role__risk_level_id=risk_level_id)
            )
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


class ContactPersonViewSet(viewsets.ModelViewSet):
    queryset = ContactPerson.objects.select_related("client_company").all()
    serializer_class = ContactPersonSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        client_company_id = self.request.query_params.get("client_company_id")
        if client_company_id is not None and client_company_id != "":
            queryset = queryset.filter(client_company_id=client_company_id)
        return queryset


class CompanyDocumentViewSet(viewsets.ModelViewSet):
    queryset = CompanyDocument.objects.select_related("client_company").all()
    serializer_class = CompanyDocumentSerializer
    permission_classes = [permissions.DjangoModelPermissions]
    parser_classes = [MultiPartParser, FormParser]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        client_company_id = self.request.query_params.get("client_company_id")
        if client_company_id is not None and client_company_id != "":
            queryset = queryset.filter(client_company_id=client_company_id)
        return queryset

    def create(self, request, *args, **kwargs):
        client_company_id = request.data.get("client_company")
        kind = request.data.get("kind")
        file_obj = request.FILES.get("file")
        if not client_company_id or not kind or file_obj is None:
            return Response(
                {"detail": "Obavezno: client_company, kind, file."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        existing = CompanyDocument.objects.filter(
            client_company_id=client_company_id,
            kind=kind,
        ).first()
        if existing is not None:
            return Response(
                {
                    "detail": (
                        "Slot za ovaj tip već postoji. Prvo obriši postojeći."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        obj = CompanyDocument.objects.create(
            client_company_id=client_company_id,
            kind=kind,
            file=file_obj,
            uploaded_by=(
                request.user if request.user.is_authenticated else None
            ),
        )
        return Response(
            self.get_serializer(obj).data,
            status=status.HTTP_201_CREATED,
        )

    def perform_destroy(self, instance):
        if instance.file:
            instance.file.delete(save=False)
        instance.delete()


class APRLookupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not getattr(settings, "APR_INTEGRATION_ENABLED", False):
            return Response(
                {"detail": "APR integracija nije omogućena."},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )
        tax_id = (request.data.get("tax_id") or "").strip()
        if not tax_id:
            return Response(
                {"detail": "PIB je obavezan."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = fetch_company_from_apr(tax_id)
        if data is None:
            return Response(
                {"detail": "Firma nije pronađena u APR-u."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(data)
