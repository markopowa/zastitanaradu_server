import json
import logging
import time
from pathlib import Path

from django.conf import settings
from django.http import HttpResponse, StreamingHttpResponse
from rest_framework import permissions, renderers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response


class ServerSentEventRenderer(renderers.BaseRenderer):
    """Lets DRF content negotiation accept the EventSource `text/event-stream`
    Accept header. The actual body is a StreamingHttpResponse, so render() is
    never invoked, but the media type must be advertised to avoid a 406."""

    media_type = "text/event-stream"
    format = "event-stream"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data

from .models import (
    DocumentAIFormat,
    DocumentCategory,
    DocumentFile,
    DocumentTemplate,
    TemplateFieldDefinition,
)
from .serializers import (
    DocumentAIFormatSerializer,
    DocumentCategorySerializer,
    DocumentFileSerializer,
    DocumentTemplatePageImageUrlListSerializer,
    DocumentTemplateSerializer,
    TemplateFieldDefinitionSerializer,
)
from .utils import (
    build_preview_context,
    existing_page_urls,
    fill_pdf_at_coordinates,
    get_page_generation_status,
    invalidate_page_images,
    start_page_generation,
)

logger = logging.getLogger(__name__)


def versioned_media_url(request, rel_path):
    url = request.build_absolute_uri(f"{settings.MEDIA_URL}{rel_path}")
    try:
        version = int((Path(settings.MEDIA_ROOT) / rel_path).stat().st_mtime)
    except OSError:
        version = 0
    return f"{url}?v={version}"


class DocumentCategoryViewSet(viewsets.ModelViewSet):
    queryset = DocumentCategory.objects.all().order_by("id")
    serializer_class = DocumentCategorySerializer
    permission_classes = [permissions.DjangoModelPermissions]


class DocumentFileViewSet(viewsets.ModelViewSet):
    queryset = DocumentFile.objects.select_related("category", "uploaded_by").all().order_by(
        "-uploaded_at"
    )
    serializer_class = DocumentFileSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class DocumentTemplateViewSet(viewsets.ModelViewSet):
    queryset = DocumentTemplate.objects.select_related(
        "category").all().order_by("id")
    serializer_class = DocumentTemplateSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def _page_urls_response(self, request, rel_paths):
        urls = [versioned_media_url(request, p) for p in rel_paths]
        out = DocumentTemplatePageImageUrlListSerializer(instance=urls)
        return Response(out.data)

    @staticmethod
    def _use_badges(instance: "DocumentTemplate") -> bool:
        generation_config = getattr(instance, "generation_config", None) or {}
        return generation_config.get("mode") != "VISUAL"

    @action(detail=True, methods=["get"], url_path="pages")
    def pages(self, request, *args, **kwargs):
        instance: DocumentTemplate = self.get_object()
        file_field = getattr(instance, "template_file", None)
        if not file_field:
            return Response(
                {"detail": "Template has no file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rel_paths = existing_page_urls(instance.pk)
        if rel_paths is not None:
            return self._page_urls_response(request, rel_paths)

        gen = get_page_generation_status(instance.pk)
        if gen["state"] == "error":
            return Response(
                {
                    "status": "error",
                    "detail": f"Failed to generate page images: {gen['detail']}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        if gen["state"] != "generating":
            path = Path(fr"{file_field.path}")
            start_page_generation(
                instance.pk, path, use_badges=self._use_badges(instance))
        return Response(
            {"status": "generating"},
            status=status.HTTP_202_ACCEPTED,
        )

    # Cap on a single SSE connection's lifetime. The browser's EventSource
    # reconnects automatically, so generation longer than this just resumes on
    # the next connection — no client-side polling code involved.
    SSE_MAX_DURATION_SECONDS = 240
    SSE_POLL_INTERVAL_SECONDS = 1.5

    @action(
        detail=True,
        methods=["get"],
        url_path="pages/stream",
        renderer_classes=[ServerSentEventRenderer],
    )
    def pages_stream(self, request, *args, **kwargs):
        instance: DocumentTemplate = self.get_object()
        file_field = getattr(instance, "template_file", None)
        template_id = instance.pk
        use_badges = self._use_badges(instance)

        def media_urls(rel_paths):
            return [versioned_media_url(request, p) for p in rel_paths]

        def event_stream():
            # Hint the browser's reconnect delay (ms).
            yield "retry: 3000\n\n"

            if not file_field:
                payload = json.dumps(
                    {"status": "error", "detail": "Template has no file."})
                yield f"event: failed\ndata: {payload}\n\n"
                return

            # Kick off generation if it hasn't started (idempotent).
            if existing_page_urls(template_id) is None:
                gen = get_page_generation_status(template_id)
                if gen["state"] not in ("generating", "error"):
                    start_page_generation(
                        template_id, Path(fr"{file_field.path}"),
                        use_badges=use_badges)

            deadline = time.monotonic() + self.SSE_MAX_DURATION_SECONDS
            while time.monotonic() < deadline:
                rel_paths = existing_page_urls(template_id)
                if rel_paths is not None:
                    payload = json.dumps(
                        {"status": "ready", "pages": media_urls(rel_paths)})
                    yield f"event: done\ndata: {payload}\n\n"
                    return
                gen = get_page_generation_status(template_id)
                if gen["state"] == "error":
                    payload = json.dumps(
                        {"status": "error", "detail": gen["detail"]})
                    yield f"event: failed\ndata: {payload}\n\n"
                    return
                # Comment line keeps the connection (and nginx) alive.
                yield ": keepalive\n\n"
                time.sleep(self.SSE_POLL_INTERVAL_SECONDS)
            # Lifetime exceeded — EventSource will reconnect and keep watching.

        response = StreamingHttpResponse(
            event_stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        # Disable nginx proxy buffering for this response only.
        response["X-Accel-Buffering"] = "no"
        return response

    @action(detail=True, methods=["post"], url_path="regenerate-pages")
    def regenerate_pages(self, request, *args, **kwargs):
        instance: DocumentTemplate = self.get_object()
        file_field = getattr(instance, "template_file", None)
        if not file_field:
            return Response(
                {"detail": "Template has no file."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        invalidate_page_images(instance.pk)
        path = Path(fr"{file_field.path}")
        start_page_generation(
            instance.pk, path, use_badges=self._use_badges(instance))
        return Response(
            {"status": "generating"},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["post"], url_path="preview")
    def preview(self, request, *args, **kwargs):
        instance: DocumentTemplate = self.get_object()
        file_field = getattr(instance, "template_file", None)
        if not file_field:
            return Response(
                {"detail": "Template has no file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        placeholders = request.data.get("placeholders")
        if placeholders is None:
            generation_config = getattr(
                instance, "generation_config", None) or {}
            placeholders = generation_config.get("placeholders") or []

        if not isinstance(placeholders, list):
            return Response(
                {"detail": "placeholders must be a list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            path = Path(file_field.path)
            pdf_bytes = fill_pdf_at_coordinates(
                path, placeholders, build_preview_context())
        except Exception as exc:
            logger.error("Template preview failed: %s", exc, exc_info=True)
            return Response(
                {"detail": f"Failed to generate preview: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return HttpResponse(pdf_bytes, content_type="application/pdf")

    @action(detail=False, methods=["post"], url_path="from-document")
    def from_document(self, request, *args, **kwargs):
        document_file_id = request.data.get("document_file_id")
        context_type = request.data.get("context_type")
        if not document_file_id or not context_type:
            return Response(
                {"detail": "document_file_id and context_type are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            document_file = DocumentFile.objects.get(pk=document_file_id)
        except DocumentFile.DoesNotExist:
            return Response(
                {"detail": "Document file not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file_field = getattr(document_file, "file", None)
        if not file_field:
            return Response(
                {"detail": "Document file has no associated file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = {
            "name": request.data.get("name") or document_file.title,
            "description": request.data.get("description") or "",
            "category_id": request.data.get("category_id"),
            "context_type": context_type,
        }

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        instance: DocumentTemplate = serializer.save(
            source_document_file_id=document_file.id)

        file_field = getattr(document_file, "file", None)
        if file_field:
            instance.template_file.save(
                Path(file_field.name).name, file_field.file, save=True)

        out = self.get_serializer(instance)
        headers = self.get_success_headers(out.data)
        return Response(out.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=["post"], url_path="from-file")
    def from_file(self, request, *args, **kwargs):
        uploaded_file = request.FILES.get("file")
        context_type = request.data.get("context_type")
        if not uploaded_file or not context_type:
            return Response(
                {"detail": "file and context_type are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        name = request.data.get("name") or getattr(
            uploaded_file, "name", "") or "Novi šablon"
        description = request.data.get("description") or ""
        category_id = request.data.get("category_id")

        payload = {
            "name": name,
            "description": description,
            "category_id": category_id,
            "context_type": context_type,
        }

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        instance: DocumentTemplate = serializer.save()
        try:
            uploaded_file.seek(0)
        except (AttributeError, OSError):
            pass
        instance.template_file.save(
            uploaded_file.name, uploaded_file, save=True)
        out = self.get_serializer(instance)
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="set-file")
    def set_file(self, request, *args, **kwargs):
        instance: DocumentTemplate = self.get_object()
        uploaded_file = request.FILES.get("file")
        document_file_id = request.data.get("document_file_id")

        if uploaded_file:
            try:
                uploaded_file.seek(0)
            except (AttributeError, OSError):
                pass
            instance.template_file.save(
                uploaded_file.name, uploaded_file, save=True)
        elif document_file_id:
            try:
                document_file = DocumentFile.objects.get(pk=document_file_id)
            except DocumentFile.DoesNotExist:
                return Response(
                    {"detail": "Document file not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            file_field = getattr(document_file, "file", None)
            if not file_field:
                return Response(
                    {"detail": "Document file has no associated file."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            instance.source_document_file_id = document_file.id
            instance.template_file.save(
                Path(file_field.name).name, file_field.file, save=True)
        else:
            return Response(
                {"detail": "file or document_file_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        out = self.get_serializer(instance)
        return Response(out.data, status=status.HTTP_200_OK)


class DocumentAIFormatViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DocumentAIFormat.objects.filter(is_active=True).order_by("id")
    serializer_class = DocumentAIFormatSerializer
    permission_classes = [permissions.IsAuthenticated]


class TemplateFieldDefinitionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TemplateFieldDefinition.objects.filter(
        is_active=True).order_by("category", "order", "label")
    serializer_class = TemplateFieldDefinitionSerializer
    permission_classes = [permissions.IsAuthenticated]
