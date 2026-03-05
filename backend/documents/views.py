from pathlib import Path

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from processes.tasks import logger

from .models import DocumentAIFormat, DocumentCategory, DocumentFile, DocumentTemplate
from .serializers import (
    DocumentAIFormatSerializer,
    DocumentCategorySerializer,
    DocumentFileSerializer,
    DocumentTemplateSerializer,
)
from .utils import (
    PdfNoTextError,
    PdfReadError,
    TemplateUnsupportedError,
    build_template_body_from_document_path,
    build_template_body_from_uploaded_file,
    build_template_preview_html,
    parse_docx_structure,
    parse_pdf_structure,
)


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

    @action(detail=True, methods=["get"], url_path="structure")
    def structure(self, request, *args, **kwargs):
        instance: DocumentTemplate = self.get_object()
        file_field = getattr(instance, "template_file", None)
        if not file_field:
            return Response({"detail": "Template has no file."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            path = Path(file_field.path)
        except Exception:
            return Response({"detail": "Could not resolve file path."}, status=status.HTTP_400_BAD_REQUEST)
        suffix = path.suffix.lower()
        if suffix not in {".docx", ".pdf"}:
            return Response(
                {"detail": "Structural editing is only supported for .docx and .pdf files."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            if suffix == ".docx":
                blocks = parse_docx_structure(path)
            else:
                blocks = parse_pdf_structure(path)
        except Exception as exc:
            return Response({"detail": f"Failed to parse document: {exc}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(blocks)

    @action(detail=True, methods=["get"], url_path="preview-html")
    def preview_html(self, request, *args, **kwargs):
        instance: DocumentTemplate = self.get_object()
        file_field = getattr(instance, "template_file", None)
        if not file_field:
            return Response({"html": ""})
        try:
            path = Path(file_field.path)
        except Exception:
            return Response({"html": ""})
        html = build_template_preview_html(path)
        return Response({"html": html})

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

        path = Path(file_field.path)

        try:
            body = build_template_body_from_document_path(path)
        except PdfReadError:
            return Response(
                {
                    "detail": "PDF file could not be processed.",
                    "reason": "pdf_read_error",
                    # TODO: For image-based or unsupported PDFs use AWS Textract/OCR.
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except PdfNoTextError:
            return Response(
                {
                    "detail": (
                        "PDF does not contain readable text and cannot be "
                        "used to generate a template. Image-based PDFs are "
                        "not supported yet."
                    ),
                    "reason": "pdf_no_text",
                    # TODO: For image-based PDFs add AWS Textract/OCR support.
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except TemplateUnsupportedError as exc:
            return Response(
                {
                    "detail": "Unsupported file type for template generation.",
                    "extension": exc.extension,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = {
            "name": request.data.get("name") or document_file.title,
            "description": request.data.get("description") or "",
            "category_id": request.data.get("category_id"),
            "context_type": context_type,
            "template_body": body or "",
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

        try:
            body = build_template_body_from_uploaded_file(uploaded_file)
        except PdfReadError as exc:
            logger.error(f"PDF file could not be processed: {exc}", exc_info=True)
            print(exc)
            return Response(
                {
                    "detail": "PDF file could not be processed.",
                    "reason": "pdf_read_error",
                    # TODO: For image-based or unsupported PDFs use AWS Textract/OCR.
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except PdfNoTextError as exc:
            logger.error(f"PDF file could not be processed: {exc}", exc_info=True)
            print(exc)
            return Response(
                {
                    "detail": (
                        "PDF does not contain readable text and cannot be "
                        "used to generate a template. Image-based PDFs are "
                        "not supported yet."
                    ),
                    "reason": "pdf_no_text",
                    # TODO: For image-based PDFs add AWS Textract/OCR support.
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except TemplateUnsupportedError:
            body = request.data.get("template_body") or ""

        payload = {
            "name": name,
            "description": description,
            "category_id": category_id,
            "context_type": context_type,
            "template_body": body or "",
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
