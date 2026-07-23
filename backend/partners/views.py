from .serializers import (
    ClientCompanySerializer,
    ClientIntakeLinkSerializer,
    ClientIntakeSubmissionSerializer,
    CompanyDocumentKindSerializer,
    CompanyDocumentSerializer,
    CompanyObligationExclusionSerializer,
    ComplianceFindingTypeSerializer,
    ContactPersonSerializer,
    EmployeeSerializer,
    EmployeeTrainingSerializer,
    EquipmentItemSerializer,
    HazardSerializer,
    JobRoleHazardSerializer,
    JobRoleLZOSerializer,
    RoleLzoTemplateSerializer,
    JobRoleSerializer,
    KinneyScaleOptionSerializer,
    ObligationPlanRowSerializer,
    RiskAssessmentActAmendmentSerializer,
    RiskAssessmentActSerializer,
    RiskLevelSerializer,
    TrainingTypeSerializer,
    WorkInjurySerializer,
)
from .obligation_plan import build_obligation_plan
from .intake import (
    approve_employee_submission,
    approve_equipment_submission,
    reject_submission,
    send_intake_link_email,
)
from .models import (
    ClientCompany,
    ClientIntakeLink,
    ClientIntakeSubmission,
    CompanyComplianceFinding,
    CompanyDocument,
    CompanyDocumentKind,
    CompanyObligationExclusion,
    ComplianceFindingType,
    ContactPerson,
    Employee,
    EmployeeTraining,
    EquipmentItem,
    Hazard,
    JobRole,
    JobRoleHazard,
    JobRoleLZO,
    RoleLzoTemplate,
    normalize_role_name,
    KinneyScaleOption,
    RiskAssessmentAct,
    RiskAssessmentActAmendment,
    RiskAssessmentSection,
    RiskAssessmentSectionRevision,
    RiskLevel,
    TrainingType,
    WorkInjury,
    notify_severe_work_injury,
)
from documents.conversion import ConversionError, _is_office_file, convert_office_to_pdf
from documents.models import DocumentTemplate
from .medical_exam_record import generate_medical_exam_record
from .high_risk_registry import generate_high_risk_registry
from processes.utils import generate_company_document
from .compliance_findings import (
    compliance_finding_row,
    compute_valid_until,
    deactivate_compliance_finding_binding,
    sync_compliance_finding_binding,
)
from .models import CompanyRegistrySnapshot
from .company_registry import lookup_company_by_registration_number
from .blank_templates import (
    BLANK_TARGETS,
    JOB_ROLE_TPL_KEY_TO_TARGET,
    blank_cache_key,
    invalidate_blank_cache,
    master_placeholders_for_target,
)
import json
import time
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.db.models import ProtectedError, Q
from django.http import HttpResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404

from rest_framework import mixins, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from documents.serializers import validate_visual_placeholders
from documents.utils import (
    existing_page_urls,
    get_page_generation_status,
    merge_section_files_to_pdf,
    start_page_generation,
)
from documents.views import ServerSentEventRenderer

_JOB_ROLE_TEMPLATE_FIELDS = {
    "obrazac6": "obrazac6_template",
    "lzo-revers": "lzo_revers_template",
    "potvrda-clan5": "potvrda_clan5_template",
}


def _file_url(file_field, request):
    if not file_field:
        return None
    url = file_field.url
    if not url:
        return None
    if request and url.startswith("/"):
        return request.build_absolute_uri(url)
    return url


def _run_document_row(prd, request):
    run = prd.process_run
    document_file = prd.document_file
    return {
        "id": prd.id,
        "name": document_file.title,
        "file_url": _file_url(document_file.file, request),
        "usage_kind": prd.usage_kind,
        "process_type_name": run.process_type.name,
        "created_at": document_file.uploaded_at,
    }


def _binding_subject_label(binding):
    if binding.employee_id:
        return f"{binding.employee.first_name} {binding.employee.last_name}".strip()
    if binding.equipment_item_id:
        return binding.equipment_item.name
    if binding.client_company_id:
        return binding.client_company.name
    return ""


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

    @action(detail=True, methods=["post"], url_path="apply-lzo-template")
    def apply_lzo_template(self, request, pk=None):
        role = self.get_object()
        key = normalize_role_name(role.name)
        templates = RoleLzoTemplate.objects.filter(role_key=key).order_by("order")
        if not templates.exists():
            return Response(
                {"detail": "Za ovo radno mesto nema tipske LZO."},
                status=status.HTTP_404_NOT_FOUND,
            )
        existing = {
            (item.name or "").strip().lower()
            for item in role.lzo_items.all()
        }
        base = role.lzo_items.count()
        created = 0
        for tpl in templates:
            if (tpl.name or "").strip().lower() in existing:
                continue
            JobRoleLZO.objects.create(
                job_role=role,
                name=tpl.name,
                standard=tpl.standard,
                interval_months=tpl.interval_months,
                order=base + created,
            )
            created += 1
        items = JobRoleLZOSerializer(
            role.lzo_items.all().order_by("order", "id"), many=True
        ).data
        return Response({"created": created, "items": items})

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
        blank_target = JOB_ROLE_TPL_KEY_TO_TARGET.get(tpl_key)
        if request.method == "DELETE":
            field = getattr(role, field_name)
            if field:
                field.delete(save=False)
                setattr(role, field_name, None)
                role.save(update_fields=[field_name])
            if blank_target:
                invalidate_blank_cache(blank_target, role.pk)
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
        if blank_target:
            invalidate_blank_cache(blank_target, role.pk)
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


def _company_document_via_template(source_key: str, company, fallback):
    templates = DocumentTemplate.objects.filter(
        context_type=DocumentTemplate.CONTEXT_CLIENT_COMPANY,
    ).exclude(template_file="")
    for tpl in templates:
        series = (tpl.generation_config or {}).get("series") or []
        if not any(s.get("source") == source_key for s in series):
            continue
        try:
            content = generate_company_document(tpl, company)
        except Exception:
            content = None
        if content:
            return content
        break
    return fallback(company.id)


class ClientCompanyViewSet(viewsets.ModelViewSet):
    queryset = ClientCompany.objects.all().order_by("name")
    serializer_class = ClientCompanySerializer
    permission_classes = [permissions.DjangoModelPermissions]

    @action(detail=True, methods=["get"], url_path="medical-exam-record")
    def medical_exam_record(self, request, pk=None):
        company = self.get_object()
        content = _company_document_via_template(
            "completed_medical_exams_for_company",
            company,
            generate_medical_exam_record,
        )
        slug = company.name.replace(" ", "_")[:40]
        filename = f"obrazac1_{slug}.docx"
        user = request.user if request.user.is_authenticated else None
        obj, created = CompanyDocument.objects.get_or_create(
            client_company=company,
            kind=CompanyDocument.KIND_OBRAZAC1,
            defaults={"uploaded_by": user},
        )
        if not created and obj.file:
            obj.file.delete(save=False)
        obj.file = ContentFile(content, name=filename)
        obj.uploaded_by = user
        obj.save()
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

    @action(detail=True, methods=["get"], url_path="high-risk-registry")
    def high_risk_registry(self, request, pk=None):
        company = self.get_object()
        content = _company_document_via_template(
            "high_risk_employees_for_company",
            company,
            generate_high_risk_registry,
        )
        slug = company.name.replace(" ", "_")[:40]
        filename = f"evidencija_povecan_rizik_{slug}.docx"
        user = request.user if request.user.is_authenticated else None
        obj, created = CompanyDocument.objects.get_or_create(
            client_company=company,
            kind=CompanyDocument.KIND_HIGH_RISK_REGISTRY,
            defaults={"uploaded_by": user},
        )
        if not created and obj.file:
            obj.file.delete(save=False)
        obj.file = ContentFile(content, name=filename)
        obj.uploaded_by = user
        obj.save()
        response = HttpResponse(
            content,
            content_type=(
                "application/vnd.openxmlformats-officedocument"
                ".wordprocessingml.document"
            ),
        )
        response["Content-Disposition"] = (
            f'attachment; filename="{filename}"'
        )
        return response

    @action(detail=True, methods=["get"], url_path="risk-assessment-act-generated")
    def risk_assessment_act_generated(self, request, pk=None):
        from .risk_assessment_act import generate_risk_assessment_act

        company = self.get_object()
        content = generate_risk_assessment_act(company.id)
        slug = company.name.replace(" ", "_")[:40]
        filename = f"akt_o_proceni_rizika_{slug}.docx"
        response = HttpResponse(
            content,
            content_type=(
                "application/vnd.openxmlformats-officedocument"
                ".wordprocessingml.document"
            ),
        )
        response["Content-Disposition"] = (
            f'attachment; filename="{filename}"'
        )
        return response

    @action(detail=False, methods=["get"], url_path="bzr-documents-catalog")
    def bzr_documents_catalog(self, request):
        from .bzr_documents import bzr_document_catalog
        return Response(bzr_document_catalog())

    @action(detail=True, methods=["get"], url_path="bzr-document")
    def bzr_document(self, request, pk=None):
        from .bzr_documents import generate_bzr_document
        company = self.get_object()
        kind = request.query_params.get("kind", "")
        content, fname = generate_bzr_document(kind, company)
        if content is None:
            return Response(
                {"detail": "Nepoznata vrsta dokumenta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        slug = company.name.replace(" ", "_")[:40]
        filename = f"{fname}_{slug}.docx"
        response = HttpResponse(
            content,
            content_type=(
                "application/vnd.openxmlformats-officedocument"
                ".wordprocessingml.document"
            ),
        )
        response["Content-Disposition"] = (
            f'attachment; filename="{filename}"'
        )
        return response

    @action(detail=True, methods=["get"], url_path="inspection-bundle")
    def inspection_bundle(self, request, pk=None):
        from .inspection_bundle import build_inspection_bundle

        company = self.get_object()
        paths, skipped = build_inspection_bundle(company)
        if not paths:
            return Response(
                {"detail": "Nema dokumenata za uključivanje u paket za inspekciju."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        content = merge_section_files_to_pdf(paths)
        slug = company.name.replace(" ", "_")[:40]
        response = HttpResponse(content, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="inspekcija_{slug}.pdf"'
        )
        response["X-Included-Count"] = str(len(paths))
        response["X-Skipped"] = str(skipped)
        return response

    @action(detail=True, methods=["get"], url_path="generated-documents")
    def generated_documents(self, request, pk=None):
        from processes.models import ProcessRunDocument

        company = self.get_object()
        prds = (
            ProcessRunDocument.objects.filter(
                Q(process_run__process_binding__employee__client_company_id=company.id)
                | Q(process_run__process_binding__equipment_item__client_company_id=company.id)
                | Q(process_run__process_binding__client_company_id=company.id)
            )
            .select_related(
                "document_file",
                "process_run",
                "process_run__process_type",
                "process_run__process_binding",
                "process_run__process_binding__employee",
                "process_run__process_binding__equipment_item",
                "process_run__process_binding__client_company",
            )
            .order_by("-document_file__uploaded_at", "-id")
        )
        rows = []
        for prd in prds:
            row = _run_document_row(prd, request)
            row["subject_label"] = _binding_subject_label(
                prd.process_run.process_binding)
            rows.append(row)
        return Response(rows)

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

    @action(detail=True, methods=["post"], url_path="generate-obrazac6-all")
    def generate_obrazac6_all(self, request, pk=None):
        from .document_generation import generate_employee_document

        company = self.get_object()
        generated = []
        skipped = []
        for employee in company.employees.all().order_by("last_name", "first_name"):
            try:
                doc_file, _content_bytes = generate_employee_document(
                    employee, "OBRAZAC6",
                )
            except ValueError as e:
                skipped.append(
                    f"{employee.first_name} {employee.last_name}".strip() + f": {e}"
                )
                continue
            generated.append(doc_file)

        if not generated:
            return Response(
                {
                    "detail": "Nijedan zaposleni nema generisan Obrazac 6.",
                    "skipped": skipped,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        paths = [Path(doc_file.file.path) for doc_file in generated]
        content = merge_section_files_to_pdf(paths)
        slug = company.name.replace(" ", "_")[:40]
        response = HttpResponse(content, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="obrazac6_{slug}.pdf"'
        )
        response["X-Generated-Count"] = str(len(generated))
        response["X-Skipped-Count"] = str(len(skipped))
        return response

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

    @action(detail=True, methods=["get"], url_path="documents")
    def documents(self, request, pk=None):
        from processes.models import ProcessRunDocument

        employee = self.get_object()
        prds = (
            ProcessRunDocument.objects.filter(
                process_run__process_binding__employee_id=employee.id,
            )
            .select_related(
                "document_file",
                "process_run",
                "process_run__process_type",
            )
            .order_by("-document_file__uploaded_at", "-id")
        )
        rows = [_run_document_row(prd, request) for prd in prds]
        return Response(rows)

    @action(detail=True, methods=["post"], url_path="generate-document")
    def generate_document(self, request, pk=None):
        from .document_generation import generate_employee_document

        employee = self.get_object()
        kind = (request.data.get("kind") or "").strip()
        training_type_id = request.data.get("training_type_id")
        try:
            doc_file, content_bytes = generate_employee_document(
                employee, kind, training_type_id=training_type_id,
            )
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        filename = doc_file.file.name.split("/")[-1]
        content_type = (
            "application/pdf"
            if filename.lower().endswith(".pdf")
            else (
                "application/vnd.openxmlformats-officedocument"
                ".wordprocessingml.document"
            )
        )
        response = HttpResponse(content_bytes, content_type=content_type)
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class TrainingTypeViewSet(viewsets.ModelViewSet):
    queryset = TrainingType.objects.select_related(
        "client_company").all().order_by("client_company", "name")
    serializer_class = TrainingTypeSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        client_company_id = self.request.query_params.get("client_company_id")
        if client_company_id is not None and client_company_id != "":
            queryset = queryset.filter(client_company_id=client_company_id)
        return queryset

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Vrsta obuke se koristi i ne moze se obrisati."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def perform_update(self, serializer):
        instance = serializer.instance
        old_name = instance.potvrda_template.name if instance.potvrda_template else None
        updated = serializer.save()
        new_name = updated.potvrda_template.name if updated.potvrda_template else None
        if old_name != new_name:
            invalidate_blank_cache("training-type-potvrda", updated.pk)


class EmployeeTrainingViewSet(viewsets.ModelViewSet):
    queryset = EmployeeTraining.objects.select_related(
        "employee", "training_type").all()
    serializer_class = EmployeeTrainingSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        employee_id = self.request.query_params.get("employee_id")
        if employee_id is not None and employee_id != "":
            queryset = queryset.filter(employee_id=employee_id)
        client_company_id = self.request.query_params.get("client_company_id")
        if client_company_id is not None and client_company_id != "":
            queryset = queryset.filter(
                employee__client_company_id=client_company_id)
        return queryset


class CompanyDocumentKindViewSet(viewsets.ModelViewSet):
    queryset = CompanyDocumentKind.objects.all().order_by("order", "name")
    serializer_class = CompanyDocumentKindSerializer
    permission_classes = [permissions.DjangoModelPermissions]


class HazardViewSet(viewsets.ModelViewSet):
    queryset = Hazard.objects.all().order_by("kind", "order", "label")
    serializer_class = HazardSerializer
    permission_classes = [permissions.DjangoModelPermissions]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        kind = self.request.query_params.get("kind")
        if kind:
            queryset = queryset.filter(kind=kind)
        active = self.request.query_params.get("is_active")
        if active in ("1", "true", "True"):
            queryset = queryset.filter(is_active=True)
        return queryset

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Opasnost/štetnost se koristi u proceni i ne može "
                           "se obrisati."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class KinneyScaleOptionViewSet(viewsets.ModelViewSet):
    queryset = KinneyScaleOption.objects.all().order_by(
        "factor", "order", "value")
    serializer_class = KinneyScaleOptionSerializer
    permission_classes = [permissions.DjangoModelPermissions]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        factor = self.request.query_params.get("factor")
        if factor:
            queryset = queryset.filter(factor=factor)
        return queryset


class JobRoleHazardViewSet(viewsets.ModelViewSet):
    queryset = JobRoleHazard.objects.select_related(
        "hazard", "job_role").all()
    serializer_class = JobRoleHazardSerializer
    permission_classes = [permissions.DjangoModelPermissions]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        job_role_id = self.request.query_params.get("job_role_id")
        if job_role_id is not None and job_role_id != "":
            queryset = queryset.filter(job_role_id=job_role_id)
        client_company_id = self.request.query_params.get("client_company_id")
        if client_company_id is not None and client_company_id != "":
            queryset = queryset.filter(
                job_role__client_company_id=client_company_id)
        return queryset


class JobRoleLZOViewSet(viewsets.ModelViewSet):
    queryset = JobRoleLZO.objects.select_related("job_role").all()
    serializer_class = JobRoleLZOSerializer
    permission_classes = [permissions.DjangoModelPermissions]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        job_role_id = self.request.query_params.get("job_role_id")
        if job_role_id is not None and job_role_id != "":
            queryset = queryset.filter(job_role_id=job_role_id)
        client_company_id = self.request.query_params.get("client_company_id")
        if client_company_id is not None and client_company_id != "":
            queryset = queryset.filter(
                job_role__client_company_id=client_company_id)
        return queryset


class RoleLzoTemplateViewSet(viewsets.ModelViewSet):
    queryset = RoleLzoTemplate.objects.all().order_by("role_name", "order")
    serializer_class = RoleLzoTemplateSerializer
    permission_classes = [permissions.DjangoModelPermissions]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        role_name = self.request.query_params.get("role_name")
        if role_name:
            queryset = queryset.filter(role_key=normalize_role_name(role_name))
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


class WorkInjuryViewSet(viewsets.ModelViewSet):
    queryset = WorkInjury.objects.select_related(
        "client_company", "employee").all()
    serializer_class = WorkInjurySerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        injury = serializer.save(created_by=user)
        notify_severe_work_injury(injury)

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


class ClientIntakeLinkViewSet(viewsets.ModelViewSet):
    queryset = ClientIntakeLink.objects.select_related(
        "client_company").all().order_by("-created_at")
    serializer_class = ClientIntakeLinkSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def get_queryset(self):
        queryset = super().get_queryset()
        client_company_id = self.request.query_params.get("client_company_id")
        if client_company_id is not None and client_company_id != "":
            queryset = queryset.filter(client_company_id=client_company_id)
        return queryset

    @action(detail=True, methods=["post"], url_path="send")
    def send(self, request, pk=None):
        link = self.get_object()
        to_email = (
            request.data.get("to")
            or link.client_company.email
            or ""
        ).strip()
        if not to_email:
            return Response(
                {"detail": "Email adresa nije zadata i firma nema email."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        sent = send_intake_link_email(link, to_email, request=request)
        if not sent:
            return Response(
                {"detail": "Slanje emaila nije uspelo."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({"detail": "Email poslat.", "to": to_email})


class ClientIntakeSubmissionViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = ClientIntakeSubmission.objects.select_related(
        "link", "link__client_company", "reviewed_by",
    ).all().order_by("-created_at")
    serializer_class = ClientIntakeSubmissionSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        client_company_id = self.request.query_params.get("client_company_id")
        if client_company_id is not None and client_company_id != "":
            queryset = queryset.filter(
                link__client_company_id=client_company_id)
        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        submission = self.get_object()
        if submission.status != ClientIntakeSubmission.STATUS_PENDING:
            return Response(
                {"detail": "Prijava je već obrađena."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = request.user if request.user.is_authenticated else None
        if submission.kind == ClientIntakeSubmission.KIND_EMPLOYEE:
            approve_employee_submission(submission, user)
        else:
            approve_equipment_submission(submission, user)
        submission.refresh_from_db()
        return Response(self.get_serializer(submission).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        submission = self.get_object()
        if submission.status != ClientIntakeSubmission.STATUS_PENDING:
            return Response(
                {"detail": "Prijava je već obrađena."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = request.user if request.user.is_authenticated else None
        reject_submission(submission, user)
        submission.refresh_from_db()
        return Response(self.get_serializer(submission).data)


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


def _blank_target_or_400(target_key: str):
    target = BLANK_TARGETS.get(target_key)
    if not target:
        return None, Response(
            {"detail": "Nepoznat tip blanko obrasca."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return target, None


def _require_blank_change_permission(request, target):
    opts = target.model._meta
    perm = f"{opts.app_label}.change_{opts.model_name}"
    if not request.user.has_perm(perm):
        return Response(
            {"detail": "Nemate dozvolu za ovu akciju."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


class BlankTemplatePagesStreamView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    renderer_classes = [ServerSentEventRenderer]

    SSE_MAX_DURATION_SECONDS = 240
    SSE_POLL_INTERVAL_SECONDS = 1.5

    def get(self, request, target, pk, *args, **kwargs):
        target_cfg, error = _blank_target_or_400(target)
        if error:
            return error
        instance = get_object_or_404(target_cfg.model, pk=pk)
        file_field = getattr(instance, target_cfg.file_field, None)
        if not file_field:
            return Response(
                {"detail": "Blanko obrazac nema fajl."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cache_key = blank_cache_key(target, instance.pk)
        file_path = Path(fr"{file_field.path}")

        def media_urls(rel_paths):
            from documents.views import versioned_media_url
            return [versioned_media_url(request, p) for p in rel_paths]

        def event_stream():
            yield "retry: 3000\n\n"

            if existing_page_urls(cache_key) is None:
                gen = get_page_generation_status(cache_key)
                if gen["state"] not in ("generating", "error"):
                    start_page_generation(cache_key, file_path)

            deadline = time.monotonic() + self.SSE_MAX_DURATION_SECONDS
            while time.monotonic() < deadline:
                rel_paths = existing_page_urls(cache_key)
                if rel_paths is not None:
                    payload = json.dumps(
                        {"status": "ready", "pages": media_urls(rel_paths)})
                    yield f"event: done\ndata: {payload}\n\n"
                    return
                gen = get_page_generation_status(cache_key)
                if gen["state"] == "error":
                    payload = json.dumps(
                        {"status": "error", "detail": gen["detail"]})
                    yield f"event: failed\ndata: {payload}\n\n"
                    return
                yield ": keepalive\n\n"
                time.sleep(self.SSE_POLL_INTERVAL_SECONDS)

        response = StreamingHttpResponse(
            event_stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response


class BlankTemplateRegeneratePagesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, target, pk, *args, **kwargs):
        target_cfg, error = _blank_target_or_400(target)
        if error:
            return error
        instance = get_object_or_404(target_cfg.model, pk=pk)
        perm_error = _require_blank_change_permission(request, target_cfg)
        if perm_error:
            return perm_error
        file_field = getattr(instance, target_cfg.file_field, None)
        if not file_field:
            return Response(
                {"detail": "Blanko obrazac nema fajl."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cache_key = blank_cache_key(target, instance.pk)
        invalidate_blank_cache(target, instance.pk)
        start_page_generation(cache_key, Path(fr"{file_field.path}"))
        return Response(
            {"status": "generating"},
            status=status.HTTP_202_ACCEPTED,
        )


class BlankTemplateFieldsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, target, pk, *args, **kwargs):
        target_cfg, error = _blank_target_or_400(target)
        if error:
            return error
        instance = get_object_or_404(target_cfg.model, pk=pk)
        placeholders = getattr(instance, target_cfg.fields_field) or []
        master_placeholders = master_placeholders_for_target(target_cfg)
        return Response(
            {
                "placeholders": placeholders,
                "master_placeholders": master_placeholders,
            }
        )

    def post(self, request, target, pk, *args, **kwargs):
        target_cfg, error = _blank_target_or_400(target)
        if error:
            return error
        instance = get_object_or_404(target_cfg.model, pk=pk)
        perm_error = _require_blank_change_permission(request, target_cfg)
        if perm_error:
            return perm_error
        placeholders = request.data.get("placeholders")
        if placeholders is None:
            raise serializers.ValidationError(
                {"placeholders": "Ovo polje je obavezno."}
            )
        validate_visual_placeholders(placeholders)
        setattr(instance, target_cfg.fields_field, placeholders)
        instance.save(update_fields=[target_cfg.fields_field])
        return Response({"placeholders": placeholders})
