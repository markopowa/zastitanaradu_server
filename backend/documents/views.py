import logging
from pathlib import Path

from django.conf import settings
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import DocumentAIFormat, DocumentCategory, DocumentFile, DocumentTemplate
from .serializers import (
    DocumentAIFormatSerializer,
    DocumentCategorySerializer,
    DocumentFileSerializer,
    DocumentTemplatePageImageUrlListSerializer,
    DocumentTemplateSerializer,
)
from .utils import (
    generate_page_images,
    invalidate_page_images,
)

logger = logging.getLogger(__name__)


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

    @action(detail=True, methods=["get"], url_path="pages")
    def pages(self, request, *args, **kwargs):
        instance: DocumentTemplate = self.get_object()
        file_field = getattr(instance, "template_file", None)
        if not file_field:
            return Response(
                {"detail": "Template has no file."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            path = Path(fr"{file_field.path}")
            rel_paths = generate_page_images(instance.pk, path)
        except Exception as exc:
            logger.error("Page image generation failed: %s",
                         exc, exc_info=True)
            return Response(
                {"detail": f"Failed to generate page images: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        urls = [request.build_absolute_uri(
            f"{settings.MEDIA_URL}{p}") for p in rel_paths]
        out = DocumentTemplatePageImageUrlListSerializer(instance=urls)
        return Response(out.data)

    @action(detail=True, methods=["post"], url_path="regenerate-pages")
    def regenerate_pages(self, request, *args, **kwargs):
        instance: DocumentTemplate = self.get_object()
        invalidate_page_images(instance.pk)
        file_field = getattr(instance, "template_file", None)
        if not file_field:
            return Response(
                {"detail": "Template has no file."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            path = Path(fr"{file_field.path}")
            rel_paths = generate_page_images(instance.pk, path)
        except Exception as exc:
            logger.error("Page image regeneration failed: %s",
                         exc, exc_info=True)
            return Response(
                {"detail": f"Failed to regenerate page images: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        urls = [request.build_absolute_uri(
            f"{settings.MEDIA_URL}{p}") for p in rel_paths]
        out = DocumentTemplatePageImageUrlListSerializer(instance=urls)
        return Response(out.data)

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


class DocumentAIFormatViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DocumentAIFormat.objects.filter(is_active=True).order_by("id")
    serializer_class = DocumentAIFormatSerializer
    permission_classes = [permissions.IsAuthenticated]
