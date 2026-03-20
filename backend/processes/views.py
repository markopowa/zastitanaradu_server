import logging
from datetime import date, timedelta

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from django.db.models import Q

from documents.models import DocumentFile
from .models import (
    ProcessBinding,
    ProcessRun,
    ProcessRunDocument,
    ProcessTemplate,
    ProcessType,
    TaskAssignment,
)
from .tasks import run_on_completed_trigger
from .serializers import (
    ProcessBindingSerializer,
    ProcessRunCompleteSerializer,
    ProcessRunDocumentCreateSerializer,
    ProcessRunDocumentSerializer,
    ProcessRunSerializer,
    ProcessTemplateSerializer,
    ProcessTypeSerializer,
    TaskAssignmentSerializer,
)
from .utils import binding_subject_snapshot

logger = logging.getLogger(__name__)


class DashboardExpiringView(ListAPIView):
    serializer_class = ProcessRunSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        today = date.today()
        days_param = self.request.query_params.get("days", "30")
        try:
            days = int(days_param)
        except ValueError:
            days = 30
        to_date = today + timedelta(days=min(days, 365))
        use_lead_time = self.request.query_params.get(
            "use_lead_time", "").lower() in ("true", "1", "yes")

        queryset = (
            ProcessRun.objects.filter(
                status=ProcessRun.STATUS_COMPLETED,
                valid_until__gte=today,
                valid_until__lte=to_date,
            )
            .select_related(
                "process_binding",
                "process_binding__process_type",
                "process_type",
            )
            .order_by("valid_until", "id")
        )

        client_company_id = self.request.query_params.get("client_company_id")
        subject_kind = self.request.query_params.get("subject_kind")
        process_type_id = self.request.query_params.get("process_type_id")

        if client_company_id is not None and client_company_id != "":
            queryset = queryset.filter(
                Q(process_binding__client_company_id=client_company_id)
                | Q(process_binding__employee__client_company_id=client_company_id)
                | Q(process_binding__equipment_item__client_company_id=client_company_id)
            )
        if subject_kind is not None and subject_kind != "":
            queryset = queryset.filter(
                process_binding__subject_kind=subject_kind)
        if process_type_id is not None and process_type_id != "":
            queryset = queryset.filter(process_type_id=process_type_id)

        if use_lead_time:
            ids = []
            for run in queryset[:500]:
                lead_days = (
                    run.process_type.lead_time_days or 0) if run.process_type_id else 0
                if run.valid_until and run.valid_until <= today + timedelta(days=lead_days):
                    ids.append(run.id)
            if ids:
                return ProcessRun.objects.filter(pk__in=ids).select_related(
                    "process_binding", "process_binding__process_type", "process_type"
                ).order_by("valid_until", "id")
            return ProcessRun.objects.none()
        return queryset


class ProcessTypeViewSet(viewsets.ModelViewSet):
    queryset = ProcessType.objects.all().order_by("code")
    serializer_class = ProcessTypeSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        reasons = []
        if ProcessRun.objects.filter(process_type=instance).exists():
            reasons.append("aktivnosti (procesi)")
        if ProcessTemplate.objects.filter(process_type=instance).exists():
            reasons.append("šabloni procesa")
        if ProcessBinding.objects.filter(process_type=instance).exists():
            reasons.append("rasporedi")
        if reasons:
            msg = (
                f"Ne može se obrisati: postoje {', '.join(reasons)} koji koriste "
                "ovu vrstu obaveze. Obrišite ili prebacite ih pre brisanja."
            )
            return Response(
                {"detail": msg},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get("search")
        if search is not None and search != "":
            queryset = queryset.filter(
                Q(code__icontains=search) | Q(name__icontains=search)
            )
        is_active = self.request.query_params.get("is_active")
        if is_active is not None and is_active != "":
            if is_active.lower() in ("true", "1", "yes"):
                queryset = queryset.filter(is_active=True)
            elif is_active.lower() in ("false", "0", "no"):
                queryset = queryset.filter(is_active=False)
        return queryset


class ProcessTemplateViewSet(viewsets.ModelViewSet):
    queryset = ProcessTemplate.objects.select_related(
        "process_type", "document_template"
    ).all().order_by("process_type__code", "trigger")
    serializer_class = ProcessTemplateSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        process_type_id = self.request.query_params.get("process_type_id")
        if process_type_id is not None and process_type_id != "":
            queryset = queryset.filter(process_type_id=process_type_id)
        return queryset


class ProcessBindingViewSet(viewsets.ModelViewSet):
    queryset = (
        ProcessBinding.objects.select_related(
            "process_type", "employee", "equipment_item", "client_company"
        )
        .all()
        .order_by("process_type__code", "next_run_at")
    )
    serializer_class = ProcessBindingSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        client_company_id = self.request.query_params.get("client_company_id")
        employee_id = self.request.query_params.get("employee_id")
        equipment_item_id = self.request.query_params.get("equipment_item_id")
        process_type_id = self.request.query_params.get("process_type_id")
        is_active = self.request.query_params.get("is_active")
        if client_company_id is not None and client_company_id != "":
            queryset = queryset.filter(
                Q(client_company_id=client_company_id)
                | Q(employee__client_company_id=client_company_id)
                | Q(equipment_item__client_company_id=client_company_id)
            )
        if employee_id is not None and employee_id != "":
            queryset = queryset.filter(employee_id=employee_id)
        if equipment_item_id is not None and equipment_item_id != "":
            queryset = queryset.filter(equipment_item_id=equipment_item_id)
        if process_type_id is not None and process_type_id != "":
            queryset = queryset.filter(process_type_id=process_type_id)
        if is_active is not None and is_active != "":
            if is_active.lower() in ("true", "1", "yes"):
                queryset = queryset.filter(is_active=True)
            elif is_active.lower() in ("false", "0", "no"):
                queryset = queryset.filter(is_active=False)
        return queryset


class ProcessRunViewSet(viewsets.ModelViewSet):
    queryset = (
        ProcessRun.objects.select_related(
            "process_binding", "process_binding__process_type", "process_type"
        )
        .all()
        .order_by("-scheduled_for", "-id")
    )
    serializer_class = ProcessRunSerializer
    permission_classes = [permissions.DjangoModelPermissions]
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        client_company_id = self.request.query_params.get("client_company_id")
        employee_id = self.request.query_params.get("employee_id")
        equipment_item_id = self.request.query_params.get("equipment_item_id")
        process_type_id = self.request.query_params.get("process_type_id")
        status_filter = self.request.query_params.get("status")
        from_valid = self.request.query_params.get("from_valid_until")
        to_valid = self.request.query_params.get("to_valid_until")
        if client_company_id is not None and client_company_id != "":
            queryset = queryset.filter(
                Q(process_binding__client_company_id=client_company_id)
                | Q(process_binding__employee__client_company_id=client_company_id)
                | Q(process_binding__equipment_item__client_company_id=client_company_id)
            )
        if employee_id is not None and employee_id != "":
            queryset = queryset.filter(
                process_binding__employee_id=employee_id)
        if equipment_item_id is not None and equipment_item_id != "":
            queryset = queryset.filter(
                process_binding__equipment_item_id=equipment_item_id)
        if process_type_id is not None and process_type_id != "":
            queryset = queryset.filter(process_type_id=process_type_id)
        if status_filter is not None and status_filter != "":
            queryset = queryset.filter(status=status_filter)
        if from_valid is not None and from_valid != "":
            queryset = queryset.filter(valid_until__gte=from_valid)
        if to_valid is not None and to_valid != "":
            queryset = queryset.filter(valid_until__lte=to_valid)
        return queryset

    def perform_create(self, serializer):
        binding = serializer.validated_data["process_binding"]
        serializer.save(
            process_type=binding.process_type,
            subject_snapshot=binding_subject_snapshot(binding),
            status=ProcessRun.STATUS_PENDING,
        )

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        run = self.get_object()
        if run.status != ProcessRun.STATUS_PENDING:
            return Response(
                {"detail": "Only pending runs can be completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = ProcessRunCompleteSerializer(
            data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        valid_until = serializer.validated_data["valid_until"]
        performed_at = serializer.validated_data.get(
            "performed_at") or date.today()
        notes = serializer.validated_data.get("notes") or ""
        result_data = serializer.validated_data.get("result_data")

        run.performed_at = performed_at
        run.valid_until = valid_until
        run.status = ProcessRun.STATUS_COMPLETED
        if notes:
            run.notes = notes
        if result_data is not None:
            run.result_data = result_data
        update_fields = ["performed_at", "valid_until", "status", "notes"]
        if result_data is not None:
            update_fields.append("result_data")
        run.save(update_fields=update_fields)
        user = getattr(request, "user", None)
        logger.info(
            "ProcessRun id=%s completed by user_id=%s (%s), valid_until=%s",
            run.id,
            getattr(user, "id", None),
            getattr(user, "username", ""),
            valid_until,
        )

        binding = run.process_binding
        binding.last_run_at = performed_at
        period_months = binding.custom_period_months or binding.process_type.default_period_months
        if period_months:
            next_run_at = valid_until + timedelta(days=period_months * 30)
            binding.next_run_at = next_run_at
        binding.save(update_fields=["last_run_at", "next_run_at"])

        run_on_completed_trigger(run)

        run_serializer = ProcessRunSerializer(run)
        return Response(run_serializer.data)

    @action(detail=True, methods=["get", "post"], url_path="documents")
    def documents(self, request, pk=None):
        run = self.get_object()
        if request.method == "GET":
            docs = run.documents.select_related("document_file").all()
            serializer = ProcessRunDocumentSerializer(docs, many=True)
            return Response(serializer.data)
        serializer = ProcessRunDocumentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document_file_id = serializer.validated_data["document_file_id"]
        usage_kind = serializer.validated_data["usage_kind"]
        try:
            doc_file = DocumentFile.objects.get(pk=document_file_id)
        except DocumentFile.DoesNotExist:
            return Response(
                {"detail": "Document not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        prd = ProcessRunDocument.objects.create(
            process_run=run,
            document_file=doc_file,
            usage_kind=usage_kind,
        )
        user = getattr(request, "user", None)
        logger.info(
            "ProcessRunDocument id=%s attached to run id=%s document_file id=%s by user_id=%s (%s)",
            prd.id,
            run.id,
            document_file_id,
            getattr(user, "id", None),
            getattr(user, "username", ""),
        )
        return Response(
            ProcessRunDocumentSerializer(prd).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path="documents/(?P<doc_pk>[^/.]+)",
    )
    def remove_document(self, request, pk=None, doc_pk=None):
        run = self.get_object()
        try:
            prd = ProcessRunDocument.objects.get(
                process_run=run,
                pk=doc_pk,
            )
        except ProcessRunDocument.DoesNotExist:
            return Response(
                {"detail": "Not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        prd.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TaskAssignmentViewSet(viewsets.ModelViewSet):
    queryset = TaskAssignment.objects.select_related("process_run", "assigned_to").all().order_by(
        "-due_date", "id"
    )
    serializer_class = TaskAssignmentSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        process_run_id = self.request.query_params.get("process_run_id")
        assigned_to_id = self.request.query_params.get("assigned_to_id")
        status_filter = self.request.query_params.get("status")
        if process_run_id is not None and process_run_id != "":
            queryset = queryset.filter(process_run_id=process_run_id)
        if assigned_to_id is not None and assigned_to_id != "":
            queryset = queryset.filter(assigned_to_id=assigned_to_id)
        if status_filter is not None and status_filter != "":
            queryset = queryset.filter(status=status_filter)
        return queryset
