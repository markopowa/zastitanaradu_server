import logging
from datetime import date, timedelta

from django.db.models import Exists, OuterRef, Prefetch, Q

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from documents.models import DocumentCategory, DocumentFile
from partners.models import Employee

from .activity_log import log_activity
from .date_format import format_date_display
from .models import (
    ActivityLog,
    NotificationOutbox,
    ProcessBinding,
    ProcessNote,
    ProcessRun,
    ProcessRunDocument,
    ProcessTemplate,
    ProcessTriggerRun,
    ProcessType,
    TaskAssignment,
)
from .process_run_completion import apply_process_run_completion
from .send_now import send_now_for_binding
from .serializers import (
    ActivityLogSerializer,
    EmployeeSendNowSerializer,
    NotificationOutboxPreviewSerializer,
    NotificationOutboxSerializer,
    ProcessBindingSerializer,
    ProcessNoteCreateSerializer,
    ProcessNoteSerializer,
    ProcessRunCompleteSerializer,
    ProcessRunDocumentCreateSerializer,
    ProcessRunDocumentSerializer,
    ProcessRunDocumentUploadSerializer,
    ProcessRunSerializer,
    ProcessTemplateSerializer,
    ProcessTypeSerializer,
    SendNowResponseSerializer,
    TaskAssignmentSerializer,
    UpcomingDeadlineSerializer,
)
from .tasks import (
    OPEN_RUN_STATUSES,
    cancel_open_runs_for_binding,
    ensure_process_run_for_binding,
    process_lead_for_run,
)
from .utils import binding_subject_snapshot

logger = logging.getLogger(__name__)


class ActivityLogView(ListAPIView):
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = (
            ActivityLog.objects.select_related(
                "user",
                "process_run",
                "process_run__process_type",
                "process_run__process_binding",
                "process_binding",
                "process_binding__process_type",
            )
            .order_by("-timestamp")
        )
        params = self.request.query_params

        event_type = params.get("event_type")
        if event_type:
            qs = qs.filter(event_type=event_type)

        date_from = params.get("date_from")
        if date_from:
            qs = qs.filter(timestamp__date__gte=date_from)

        date_to = params.get("date_to")
        if date_to:
            qs = qs.filter(timestamp__date__lte=date_to)

        user_id = params.get("user_id")
        if user_id == "system":
            qs = qs.filter(user__isnull=True)
        elif user_id:
            qs = qs.filter(user_id=user_id)

        username = params.get("username", "").strip()
        if username:
            qs = qs.filter(user__username__icontains=username)

        process_run_id = params.get("process_run_id")
        if process_run_id:
            qs = qs.filter(process_run_id=process_run_id)

        process_type_id = params.get("process_type_id")
        if process_type_id:
            qs = qs.filter(
                Q(process_run__process_type_id=process_type_id)
                | Q(process_binding__process_type_id=process_type_id)
            )

        client_company_id = params.get("client_company_id")
        if client_company_id:
            qs = qs.filter(
                Q(
                    process_run__process_binding__employee__client_company_id=(
                        client_company_id
                    )
                )
                | Q(
                    process_run__process_binding__equipment_item__client_company_id=(
                        client_company_id
                    )
                )
                | Q(
                    process_run__process_binding__client_company_id=(
                        client_company_id
                    )
                )
                | Q(
                    process_binding__employee__client_company_id=(
                        client_company_id
                    )
                )
                | Q(
                    process_binding__equipment_item__client_company_id=(
                        client_company_id
                    )
                )
                | Q(process_binding__client_company_id=client_company_id)
            )

        search = params.get("q", "").strip()
        if search:
            qs = qs.filter(description__icontains=search)

        return qs[:500]


class ProcessTypeViewSet(viewsets.ModelViewSet):
    queryset = ProcessType.objects.all().order_by("code")
    serializer_class = ProcessTypeSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        reasons = []
        if ProcessRun.objects.filter(process_type=instance).exists():
            reasons.append("aktivnosti (obaveze)")
        if instance.templates.exists():
            reasons.append("šabloni obaveza")
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
        open_run_qs = ProcessRun.objects.filter(
            process_binding=OuterRef("pk"),
            status__in=OPEN_RUN_STATUSES,
        )
        queryset = queryset.annotate(has_open_run=Exists(open_run_qs))
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

    def perform_create(self, serializer):
        binding = serializer.save()
        run = ensure_process_run_for_binding(binding)
        if run:
            process_lead_for_run(run, binding)

    def perform_update(self, serializer):
        binding = serializer.instance
        was_active = binding.is_active
        binding = serializer.save()
        if was_active and not binding.is_active:
            cancel_open_runs_for_binding(binding)
            return
        if binding.is_active:
            run = ensure_process_run_for_binding(binding)
            if run:
                process_lead_for_run(run, binding)

    @action(detail=True, methods=["post"], url_path="send-now")
    def send_now(self, request, pk=None):
        binding = self.get_object()
        if not binding.next_run_at:
            return Response(
                {"detail": "Obaveza nema termin."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = request.user if getattr(
            request.user, "is_authenticated", False) else None
        run, created = send_now_for_binding(binding, user=user)
        run.refresh_from_db()
        doc_url = ""
        first_doc = run.documents.select_related("document_file").first()
        if first_doc and first_doc.document_file.file:
            doc_url = first_doc.document_file.file.url
        subject = run.subject_snapshot.get(
            "name") or run.subject_snapshot.get("kind") or ""
        scheduled_trigger = run.trigger_runs.filter(
            trigger=ProcessTriggerRun.TRIGGER_ON_SCHEDULED
        ).first()
        email_error = scheduled_trigger.email_error if scheduled_trigger else ""
        email_sent = bool(scheduled_trigger and scheduled_trigger.email_sent)
        if email_error:
            log_activity(
                ActivityLog.EVENT_EMAIL_ERROR,
                f"Greška pri slanju poziva za '{run.process_type.name}' ({subject}): {email_error[:200]}",
                user=user,
                process_run=run,
                process_binding=binding,
                extra_data={"email_error": email_error},
            )
        else:
            log_activity(
                ActivityLog.EVENT_RUN_SENT,
                f"Poslat poziv za '{run.process_type.name}' ({subject})",
                user=user,
                process_run=run,
                process_binding=binding,
            )
        data = SendNowResponseSerializer({
            "process_run": run,
            "document_url": doc_url,
            "email_sent": email_sent,
        }).data
        return Response(data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ProcessRunViewSet(viewsets.ModelViewSet):
    queryset = (
        ProcessRun.objects.select_related(
            "process_binding", "process_binding__process_type",
            "process_type",
        ).prefetch_related(
            Prefetch(
                "trigger_runs",
                queryset=ProcessTriggerRun.objects.select_related(
                    "executed_by",
                    "process_template",
                ),
            ),
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
        binding_id = self.request.data.get("process_binding")
        if binding_id in (None, ""):
            raise ValidationError({"process_binding": "Obavezno polje."})
        try:
            binding = ProcessBinding.objects.get(pk=binding_id)
        except (ProcessBinding.DoesNotExist, ValueError, TypeError):
            raise ValidationError(
                {"process_binding": "Nepostojeća obaveza (binding)."})
        run = serializer.save(
            process_type=binding.process_type,
            subject_snapshot=binding_subject_snapshot(binding),
            status=ProcessRun.STATUS_PENDING,
        )
        user = getattr(self.request, "user", None)
        subject = run.subject_snapshot.get(
            "name") or run.subject_snapshot.get("kind") or ""
        log_activity(
            ActivityLog.EVENT_RUN_CREATED,
            f"Ručno kreirana aktivnost '{run.process_type.name}' za {subject}",
            user=user if getattr(user, "is_authenticated", False) else None,
            process_run=run,
            process_binding=binding,
        )

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        run = self.get_object()
        if run.status not in (ProcessRun.STATUS_PENDING, ProcessRun.STATUS_SENT):
            return Response(
                {"detail": "Only pending or sent runs can be completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = ProcessRunCompleteSerializer(
            data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = getattr(request, "user", None)
        apply_process_run_completion(
            run, serializer.validated_data, user=user)
        subject = run.subject_snapshot.get(
            "name") or run.subject_snapshot.get("kind") or ""
        log_activity(
            ActivityLog.EVENT_RUN_COMPLETED,
            f"Završena aktivnost '{run.process_type.name}' za {subject}, važi do {format_date_display(run.valid_until)}",
            user=user if getattr(user, "is_authenticated", False) else None,
            process_run=run,
            process_binding=run.process_binding,
        )
        run_serializer = ProcessRunSerializer(run)
        return Response(run_serializer.data)

    @action(detail=True, methods=["get", "post"], url_path="documents")
    def documents(self, request, pk=None):
        run = self.get_object()
        if request.method == "GET":
            docs = run.documents.select_related("document_file").all()
            serializer = ProcessRunDocumentSerializer(
                docs, many=True, context={"request": request},
            )
            return Response(serializer.data)
        if request.FILES.get("file"):
            upload_serializer = ProcessRunDocumentUploadSerializer(
                data=request.data,
            )
            upload_serializer.is_valid(raise_exception=True)
            category = DocumentCategory.objects.order_by("id").first()
            if category is None:
                return Response(
                    {"detail": "Nema kategorije dokumenata."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user = getattr(request, "user", None)
            uploaded = upload_serializer.validated_data["file"]
            title = (
                upload_serializer.validated_data.get("title") or ""
            ).strip() or uploaded.name
            doc_file = DocumentFile(
                category=category,
                title=title,
                valid_from=run.scheduled_for,
            )
            doc_file.file = uploaded
            if user and getattr(user, "is_authenticated", False):
                doc_file.uploaded_by = user
            doc_file.save()
            prd = ProcessRunDocument.objects.create(
                process_run=run,
                document_file=doc_file,
                usage_kind=ProcessRunDocument.USAGE_REPORT,
            )
            subject = (
                run.subject_snapshot.get("name")
                or run.subject_snapshot.get("kind")
                or ""
            )
            log_activity(
                ActivityLog.EVENT_DOCUMENT_ATTACHED,
                f"Dodat prilog '{doc_file.title}' na aktivnost '{run.process_type.name}' ({subject})",
                user=user if getattr(
                    user, "is_authenticated", False) else None,
                process_run=run,
                process_binding=run.process_binding,
            )
            return Response(
                ProcessRunDocumentSerializer(
                    prd, context={"request": request},
                ).data,
                status=status.HTTP_201_CREATED,
            )
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
        subject = run.subject_snapshot.get(
            "name") or run.subject_snapshot.get("kind") or ""
        user = getattr(request, "user", None)
        log_activity(
            ActivityLog.EVENT_DOCUMENT_ATTACHED,
            f"Priložen dokument '{doc_file.title}' na aktivnost '{run.process_type.name}' ({subject})",
            user=user if getattr(user, "is_authenticated", False) else None,
            process_run=run,
            process_binding=run.process_binding,
        )
        return Response(
            ProcessRunDocumentSerializer(
                prd, context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get", "post"], url_path="notes")
    def notes(self, request, pk=None):
        run = self.get_object()
        if request.method == "GET":
            qs = run.process_notes.select_related("author").all()
            return Response(ProcessNoteSerializer(qs, many=True).data)
        ser = ProcessNoteCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = getattr(request, "user", None)
        author = user if getattr(user, "is_authenticated", False) else None
        note = ProcessNote.objects.create(
            process_run=run,
            author=author,
            body=ser.validated_data["body"],
        )
        return Response(
            ProcessNoteSerializer(note).data,
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
        if prd.generated_by_template_id:
            return Response(
                {"detail": "Sistemski generisan dokument se ne može obrisati."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        prd.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="generate-document")
    def generate_document(self, request, pk=None):
        from .utils import _generate_document_for_run, binding_subject_snapshot

        run = self.get_object()
        binding = run.process_binding
        templates = list(
            ProcessTemplate.objects.filter(
                process_type_id=run.process_type_id,
                generate_document=True,
                document_template__isnull=False,
            ).select_related("document_template")
        )
        if not templates:
            return Response(
                {"detail": "Za ovu obavezu nema šablona za generisanje dokumenta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        preferred = (
            next(
                (
                    t
                    for t in templates
                    if t.trigger == ProcessTemplate.TRIGGER_ON_SCHEDULED
                ),
                None,
            )
            or next(
                (
                    t
                    for t in templates
                    if t.trigger == ProcessTemplate.TRIGGER_ON_COMPLETED
                ),
                None,
            )
            or templates[0]
        )
        snapshot = binding_subject_snapshot(binding)
        doc_file = _generate_document_for_run(run, preferred, snapshot)
        if doc_file is None:
            return Response(
                {"detail": "Generisanje dokumenta nije uspelo."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        prd = (
            ProcessRunDocument.objects.filter(
                process_run=run,
                document_file=doc_file,
            )
            .select_related("document_file")
            .first()
        )
        if prd is None:
            prd = ProcessRunDocument.objects.create(
                process_run=run,
                document_file=doc_file,
                usage_kind=ProcessRunDocument.USAGE_INVITATION,
                generated_by_template=preferred,
            )
        subject = (
            run.subject_snapshot.get("name")
            or run.subject_snapshot.get("kind")
            or ""
        )
        user = getattr(request, "user", None)
        log_activity(
            ActivityLog.EVENT_DOCUMENT_ATTACHED,
            f"Generisan dokument '{doc_file.title}' za aktivnost "
            f"'{run.process_type.name}' ({subject}) — bez slanja mejla",
            user=user if getattr(user, "is_authenticated", False) else None,
            process_run=run,
            process_binding=binding,
        )
        return Response(
            ProcessRunDocumentSerializer(
                prd, context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )


def _run_client_company(run: ProcessRun):
    binding = run.process_binding
    if binding.client_company_id:
        return binding.client_company
    if binding.employee_id and binding.employee.client_company_id:
        return binding.employee.client_company
    if binding.equipment_item_id and binding.equipment_item.client_company_id:
        return binding.equipment_item.client_company
    return None


class UpcomingDeadlinesView(APIView):
    permission_classes = [permissions.DjangoModelPermissions]
    queryset = ProcessRun.objects.all()

    def get(self, request):
        today = date.today()
        within_raw = request.query_params.get("within_days", "30")
        try:
            within_days = int(within_raw)
        except (TypeError, ValueError):
            within_days = 30
        within_days = max(1, min(365, within_days))
        cutoff = today + timedelta(days=within_days)

        qs = (
            ProcessRun.objects.filter(
                status__in=(ProcessRun.STATUS_PENDING, ProcessRun.STATUS_SENT),
                scheduled_for__isnull=False,
                scheduled_for__lte=cutoff,
            )
            .select_related(
                "process_type",
                "process_binding",
                "process_binding__client_company",
                "process_binding__employee",
                "process_binding__employee__client_company",
                "process_binding__equipment_item",
                "process_binding__equipment_item__client_company",
            )
            .order_by("scheduled_for", "id")
        )

        client_company_id = request.query_params.get("client_company_id")
        if client_company_id is not None and client_company_id != "":
            qs = qs.filter(
                Q(process_binding__client_company_id=client_company_id)
                | Q(
                    process_binding__employee__client_company_id=(
                        client_company_id
                    )
                )
                | Q(
                    process_binding__equipment_item__client_company_id=(
                        client_company_id
                    )
                )
            )

        rows = []
        for run in qs:
            scheduled = run.scheduled_for
            days_until = (scheduled - today).days if scheduled else None
            is_overdue = bool(scheduled and scheduled < today)
            snapshot = run.subject_snapshot or {}
            client = _run_client_company(run)
            rows.append(
                {
                    "run_id": run.id,
                    "process_type_id": run.process_type_id,
                    "process_type_name": run.process_type.name,
                    "subject_kind": run.process_type.subject_kind,
                    "subject_name": snapshot.get("name") or "",
                    "client_company_id": client.id if client else None,
                    "client_company_name": client.name if client else "",
                    "scheduled_for": scheduled,
                    "valid_until": run.valid_until,
                    "status": run.status,
                    "is_overdue": is_overdue,
                    "days_until_deadline": days_until,
                }
            )

        serializer = UpcomingDeadlineSerializer(rows, many=True)
        return Response(serializer.data)


class EmployeeSendNowView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk=None):
        if not request.user.has_perm("processes.add_processrun"):
            return Response(
                {"detail": "Nemate dozvolu za slanje pregleda."},
                status=status.HTTP_403_FORBIDDEN,
            )

        ser = EmployeeSendNowSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        process_type_id = ser.validated_data["process_type_id"]

        try:
            employee = Employee.objects.select_related(
                "client_company").get(pk=pk)
        except Employee.DoesNotExist:
            return Response(
                {"detail": "Employee not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            pt = ProcessType.objects.get(pk=process_type_id, is_active=True)
        except ProcessType.DoesNotExist:
            return Response(
                {"detail": "Process type not found or inactive."},
                status=status.HTTP_404_NOT_FOUND,
            )

        binding = ProcessBinding.objects.filter(
            process_type=pt,
            employee=employee,
        ).exclude(next_run_at__isnull=True).first()
        if not binding:
            return Response(
                {
                    "detail": (
                        "Obaveza sa terminom ne postoji. "
                        "Dodaj obavezu pre slanja."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user if getattr(
            request.user, "is_authenticated", False) else None
        run, created = send_now_for_binding(binding, user=user)
        run.refresh_from_db()
        doc_url = ""
        first_doc = run.documents.select_related("document_file").first()
        if first_doc and first_doc.document_file.file:
            doc_url = first_doc.document_file.file.url
        subject = run.subject_snapshot.get(
            "name") or run.subject_snapshot.get("kind") or ""
        scheduled_trigger = run.trigger_runs.filter(
            trigger=ProcessTriggerRun.TRIGGER_ON_SCHEDULED
        ).first()
        email_error = scheduled_trigger.email_error if scheduled_trigger else ""
        email_sent = bool(scheduled_trigger and scheduled_trigger.email_sent)
        if email_error:
            log_activity(
                ActivityLog.EVENT_EMAIL_ERROR,
                f"Greška pri slanju poziva za '{run.process_type.name}' ({subject}): {email_error[:200]}",
                user=user,
                process_run=run,
                process_binding=binding,
                extra_data={"email_error": email_error},
            )
        else:
            log_activity(
                ActivityLog.EVENT_RUN_SENT,
                f"Poslat poziv za '{run.process_type.name}' ({subject})",
                user=user,
                process_run=run,
                process_binding=binding,
            )
        data = SendNowResponseSerializer({
            "process_run": run,
            "document_url": doc_url,
            "email_sent": email_sent,
        }).data
        return Response(data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


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


class NotificationOutboxViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        NotificationOutbox.objects.select_related(
            "process_run",
            "process_run__process_type",
            "process_run__process_binding",
            "process_run__process_binding__client_company",
            "process_run__process_binding__employee",
            "process_run__process_binding__employee__client_company",
            "process_run__process_binding__equipment_item",
            "process_run__process_binding__equipment_item__client_company",
            "process_template",
            "document_file",
        )
        .all()
        .order_by("scheduled_send_on", "id")
    )
    serializer_class = NotificationOutboxSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        status_filter = params.get("status")
        if status_filter is not None and status_filter != "":
            queryset = queryset.filter(status=status_filter)

        client_company_id = params.get("client_company_id")
        if client_company_id is not None and client_company_id != "":
            queryset = queryset.filter(
                Q(process_run__process_binding__client_company_id=client_company_id)
                | Q(process_run__process_binding__employee__client_company_id=client_company_id)
                | Q(process_run__process_binding__equipment_item__client_company_id=client_company_id)
            )

        date_from = params.get("date_from")
        if date_from is not None and date_from != "":
            queryset = queryset.filter(scheduled_send_on__gte=date_from)

        date_to = params.get("date_to")
        if date_to is not None and date_to != "":
            queryset = queryset.filter(scheduled_send_on__lte=date_to)

        return queryset

    @action(detail=True, methods=["post"], url_path="retry")
    def retry(self, request, pk=None):
        outbox = self.get_object()
        if outbox.status != NotificationOutbox.STATUS_FAILED:
            return Response(
                {"detail": "Može se ponovo poslati samo red sa statusom FAILED."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        outbox.status = NotificationOutbox.STATUS_PENDING
        outbox.attempts = 0
        outbox.save(update_fields=["status", "attempts"])
        return Response(NotificationOutboxSerializer(outbox).data)

    @action(detail=True, methods=["get"], url_path="preview")
    def preview(self, request, pk=None):
        outbox = self.get_object()
        if outbox.status != NotificationOutbox.STATUS_PENDING:
            return Response(
                {"detail": "Pregled je dostupan samo za red sa statusom PENDING."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        template = outbox.process_template
        run = outbox.process_run
        binding = run.process_binding
        if template is None:
            from .utils import build_generic_reminder, resolve_reminder_recipients

            subject, body = build_generic_reminder(run, outbox.offset_days)
            data = NotificationOutboxPreviewSerializer({
                "rendered_subject": subject,
                "rendered_body": body,
                "recipients": resolve_reminder_recipients(binding),
            }).data
            return Response(data)
        from .utils import (
            _build_document_context,
            _render_template_body,
            _resolve_email_recipients,
        )
        snapshot = run.subject_snapshot or {}
        context = _build_document_context(run, snapshot)
        rendered_subject = _render_template_body(
            template.email_subject_template or "", context
        )
        rendered_body = _render_template_body(
            template.email_body_template or "", context
        )
        recipients = _resolve_email_recipients(template, binding)
        data = NotificationOutboxPreviewSerializer({
            "rendered_subject": rendered_subject,
            "rendered_body": rendered_body,
            "recipients": recipients,
        }).data
        return Response(data)
