from .serializers import (
    ClientCompanySerializer,
    CompanyDocumentSerializer,
    CompanyObligationExclusionSerializer,
    ComplianceFindingTypeSerializer,
    ContactPersonSerializer,
    EmployeeSerializer,
    EquipmentItemSerializer,
    JobRoleSerializer,
    ObligationPlanRowSerializer,
    RiskAssessmentActAmendmentSerializer,
    RiskAssessmentActSerializer,
    RiskLevelSerializer,
)
from .obligation_plan import build_obligation_plan
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
from documents.conversion import ConversionError, _is_office_file, convert_office_to_pdf
from .medical_exam_record import generate_medical_exam_record
from documents.utils import merge_section_files_to_pdf
from .compliance_findings import (
    compliance_finding_row,
    compute_valid_until,
    deactivate_compliance_finding_binding,
    sync_compliance_finding_binding,
)
from .models import CompanyRegistrySnapshot
from .company_registry import lookup_company_by_registration_number
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.db.models import ProtectedError, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

_JOB_ROLE_TEMPLATE_FIELDS = {
    "obrazac6": "obrazac6_template",
    "lzo-revers": "lzo_revers_template",
    "potvrda-clan5": "potvrda_clan5_template",
}


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

    @action(
        detail=True,
        methods=["post", "delete"],
        url_path=r"templates/(?P<tpl_key>[^/.]+)",
        parser_classes=[MultiPartParser, FormParser],
    )
    def job_role_template(self, request, pk=None, tpl_key=None):
        field_name = _JOB_ROLE_TEMPLATE_FIELDS.get(tpl_key)
        if not field_name:
            return Response(
                {"detail": "Nepoznat tip šablona. Dozvoljeno: obrazac6, lzo-revers, potvrda-clan5."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        role = self.get_object()
        if request.method == "DELETE":
            field = getattr(role, field_name)
            if field:
                field.delete(save=False)
                setattr(role, field_name, None)
                role.save(update_fields=[field_name])
            return Response(self.get_serializer(role).data)
        file_obj = request.FILES.get("file")
        if file_obj is None:
            return Response(
                {"detail": "Nije priložen fajl (polje 'file')."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        existing = getattr(role, field_name)
        if existing:
            existing.delete(save=False)
        setattr(role, field_name, file_obj)
        role.save(update_fields=[field_name])
        return Response(self.get_serializer(role).data)


class ComplianceFindingTypeViewSet(viewsets.ModelViewSet):
    queryset = ComplianceFindingType.objects.all().order_by("order", "name")
    serializer_class = ComplianceFindingTypeSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        is_active = self.request.query_params.get("is_active")
        if is_active is not None and is_active != "":
            queryset = queryset.filter(is_active=(is_active.lower() == "true"))
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

    @action(detail=True, methods=["get"], url_path="compliance-findings")
    def compliance_findings(self, request, pk=None):
        company = self.get_object()
        types = ComplianceFindingType.objects.filter(
            is_active=True,
        ).order_by("order", "name")
        existing = {
            f.finding_type_id: f
            for f in CompanyComplianceFinding.objects.filter(
                client_company=company,
            ).select_related("finding_type")
        }
        rows = [
            compliance_finding_row(t, existing.get(t.id))
            for t in types
        ]
        return Response(rows)

    @action(
        detail=True,
        methods=["post", "delete"],
        url_path=r"compliance-findings/(?P<type_id>[0-9]+)",
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_compliance_finding(self, request, pk=None, type_id=None):
        company = self.get_object()
        finding_type = get_object_or_404(ComplianceFindingType, pk=type_id)
        if request.method == "DELETE":
            try:
                finding = CompanyComplianceFinding.objects.get(
                    client_company=company,
                    finding_type=finding_type,
                )
            except CompanyComplianceFinding.DoesNotExist:
                return Response(status=status.HTTP_204_NO_CONTENT)
            deactivate_compliance_finding_binding(finding)
            if finding.file:
                finding.file.delete(save=False)
            finding.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        file_obj = request.FILES.get("file")
        if file_obj is None:
            return Response(
                {"detail": "Nije priložen fajl (polje 'file')."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        issued_raw = request.data.get("issued_date")
        try:
            parsed_issued = datetime.strptime(
                issued_raw,
                "%Y-%m-%d",
            ).date()
        except (TypeError, ValueError):
            return Response(
                {"detail": "Nedostaje ili je neispravan datum izdavanja."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        finding, _ = CompanyComplianceFinding.objects.get_or_create(
            client_company=company,
            finding_type=finding_type,
        )
        if finding.file:
            finding.file.delete(save=False)
        finding.file = file_obj
        finding.issued_date = parsed_issued
        finding.valid_until = compute_valid_until(
            parsed_issued,
            finding_type,
        )
        finding.save()
        sync_compliance_finding_binding(finding)
        finding.refresh_from_db()
        return Response(
            compliance_finding_row(finding_type, finding),
        )

    @action(detail=True, methods=["get"], url_path="obligation-plan")
    def obligation_plan(self, request, pk=None):
        company = self.get_object()
        rows = build_obligation_plan(company)
        serializer = ObligationPlanRowSerializer(rows, many=True)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post", "delete"],
        url_path=r"obligation-plan/(?P<type_id>[0-9]+)/exclusion",
    )
    def obligation_exclusion(self, request, pk=None, type_id=None):
        from processes.models import ProcessType as PT

        company = self.get_object()
        process_type = get_object_or_404(PT, pk=type_id)

        if request.method == "DELETE":
            deleted, _ = CompanyObligationExclusion.objects.filter(
                client_company=company,
                process_type=process_type,
            ).delete()
            if deleted:
                return Response(status=status.HTTP_204_NO_CONTENT)
            return Response(
                {"detail": "Isključenje nije pronađeno."},
                status=status.HTTP_404_NOT_FOUND,
            )

        reason = (request.data.get("reason") or "").strip()
        if not reason:
            return Response(
                {"detail": "Razlog isključenja je obavezan."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = request.user if getattr(
            request.user, "is_authenticated", False) else None
        exclusion, created = CompanyObligationExclusion.objects.get_or_create(
            client_company=company,
            process_type=process_type,
            defaults={"reason": reason, "created_by": user},
        )
        if not created:
            exclusion.reason = reason
            exclusion.save(update_fields=["reason"])
        return Response(
            CompanyObligationExclusionSerializer(exclusion).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related(
        "client_company",
        "job_role",
        "job_role__risk_level",
        "risk_level_override",
    ).all().order_by("last_name", "first_name")
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def perform_create(self, serializer):
        from .employee_bindings import ensure_default_bindings_for_employee

        employee = serializer.save()
        ensure_default_bindings_for_employee(employee)

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

    def perform_create(self, serializer):
        from .equipment_bindings import ensure_default_bindings_for_equipment

        equipment = serializer.save()
        ensure_default_bindings_for_equipment(equipment)

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
        if _is_office_file(file_obj.name):
            try:
                file_obj = convert_office_to_pdf(file_obj)
            except ConversionError:
                return Response(
                    {
                        "detail": (
                            "Konverzija u PDF nije uspela. "
                            "Pošaljite PDF ili pokušajte ponovo."
                        )
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


class RiskAssessmentActViewSet(viewsets.ModelViewSet):
    queryset = RiskAssessmentAct.objects.select_related(
        "client_company",
    ).prefetch_related(
        "sections__revisions",
        "sections__revisions__created_by",
        "amendments",
        "amendments__uploaded_by",
    ).all()
    serializer_class = RiskAssessmentActSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        client_company_id = self.request.query_params.get("client_company_id")
        if client_company_id is not None and client_company_id != "":
            queryset = queryset.filter(client_company_id=client_company_id)
        return queryset

    def perform_create(self, serializer):
        act = serializer.save()
        section_defs = (
            (RiskAssessmentSection.SECTION_INTRO, 0),
            (RiskAssessmentSection.SECTION_ASSESSMENTS, 1),
            (RiskAssessmentSection.SECTION_CONCLUSION, 2),
        )
        for section_type, order in section_defs:
            RiskAssessmentSection.objects.get_or_create(
                act=act,
                section_type=section_type,
                defaults={"order": order},
            )

    @action(
        detail=True,
        methods=["post"],
        url_path=r"sections/(?P<section_type>[^/.]+)/revisions",
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_section_revision(self, request, pk=None, section_type=None):
        act = self.get_object()
        valid_types = {
            RiskAssessmentSection.SECTION_INTRO,
            RiskAssessmentSection.SECTION_ASSESSMENTS,
            RiskAssessmentSection.SECTION_CONCLUSION,
        }
        if section_type not in valid_types:
            return Response(
                {"detail": "Nepoznat tip sekcije."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        file_obj = request.FILES.get("file")
        if file_obj is None:
            return Response(
                {"detail": "Nije priložen fajl (polje 'file')."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if _is_office_file(file_obj.name):
            try:
                file_obj = convert_office_to_pdf(file_obj)
            except ConversionError:
                return Response(
                    {
                        "detail": (
                            "Konverzija u PDF nije uspela. "
                            "Pošaljite PDF ili pokušajte ponovo."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        try:
            section = act.sections.get(section_type=section_type)
        except RiskAssessmentSection.DoesNotExist:
            return Response(
                {"detail": "Sekcija nije pronađena."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if section.current_version == 0:
            section.current_file = file_obj
            section.current_version = 1
            section.save(update_fields=["current_file", "current_version"])
        else:
            reason = (request.data.get("reason") or "").strip()
            if not reason:
                return Response(
                    {"detail": "Razlog izmene je obavezan."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if len(reason) < 5:
                return Response(
                    {"detail": "Razlog izmene mora imati najmanje 5 znakova."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            version = section.current_version + 1
            revision = RiskAssessmentSectionRevision.objects.create(
                section=section,
                version=version,
                file=file_obj,
                reason=reason,
                created_by=(
                    request.user if request.user.is_authenticated else None
                ),
            )
            section.current_file = revision.file
            section.current_version = version
            section.save(update_fields=["current_file", "current_version"])
        act = self.get_queryset().get(pk=act.pk)
        return Response(RiskAssessmentActSerializer(act).data)

    @action(detail=True, methods=["get"], url_path="merged-pdf")
    def merged_pdf(self, request, pk=None):
        act = self.get_object()
        paths = []
        for section in act.sections.order_by("order"):
            if section.current_file:
                paths.append(Path(section.current_file.path))
        if not paths:
            return Response(
                {"detail": "Nijedna sekcija nema priložen fajl."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        content = merge_section_files_to_pdf(paths)
        slug = act.client_company.name.replace(" ", "_")[:40]
        response = HttpResponse(content, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="akt_{slug}.pdf"'
        )
        return response

    @action(
        detail=True,
        methods=["post"],
        url_path="amendments",
        parser_classes=[MultiPartParser, FormParser],
    )
    def create_amendment(self, request, pk=None):
        act = self.get_object()
        title = (request.data.get("title") or "").strip()
        if not title:
            return Response(
                {"detail": "Naslov izmene je obavezan."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        file_obj = request.FILES.get("file")
        if file_obj is None:
            return Response(
                {"detail": "Nije priložen fajl (polje 'file')."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if _is_office_file(file_obj.name):
            try:
                file_obj = convert_office_to_pdf(file_obj)
            except ConversionError:
                return Response(
                    {
                        "detail": (
                            "Konverzija u PDF nije uspela. "
                            "Pošaljite PDF ili pokušajte ponovo."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        note = (request.data.get("note") or "").strip()
        amendment = RiskAssessmentActAmendment.objects.create(
            act=act,
            title=title,
            note=note,
            file=file_obj,
            uploaded_by=(
                request.user if request.user.is_authenticated else None
            ),
        )
        return Response(
            RiskAssessmentActAmendmentSerializer(amendment).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"amendments/(?P<amendment_pk>[0-9]+)",
    )
    def delete_amendment(self, request, pk=None, amendment_pk=None):
        act = self.get_object()
        amendment = get_object_or_404(
            RiskAssessmentActAmendment, pk=amendment_pk, act=act
        )
        if amendment.file:
            amendment.file.delete(save=False)
        amendment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CompanyRegistryLookupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        registration_number = (
            request.data.get("registration_number")
            or request.data.get("tax_id")
            or ""
        ).strip()
        if not registration_number:
            return Response(
                {"detail": "Matični broj je obavezan."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not CompanyRegistrySnapshot.objects.filter(is_current=True).exists():
            return Response(
                {
                    "detail": (
                        "Registar firmi nije učitan. "
                        "Pokrenite: python manage.py sync_company_registry"
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        data = lookup_company_by_registration_number(registration_number)
        if data is None:
            return Response(
                {"detail": "Firma nije pronađena u registru."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(data)
