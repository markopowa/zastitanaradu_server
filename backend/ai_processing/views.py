from rest_framework import permissions, status, views
from rest_framework.response import Response

from documents.models import DocumentFile, DocumentFileAIFormat, DocumentAIFormat
from documents.serializers import DocumentFileAIFormatSerializer


class RunAIProcessingView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, document_id: int) -> Response:
        format_id = request.data.get("format_id")
        format_code = request.data.get("format_code")

        try:
            document = DocumentFile.objects.get(pk=document_id)
        except DocumentFile.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        ai_format = None
        if format_id is not None:
            ai_format = DocumentAIFormat.objects.filter(pk=format_id).first()
        if ai_format is None and format_code:
            ai_format = DocumentAIFormat.objects.filter(
                code=format_code).first()

        if ai_format is None:
            return Response(
                {"detail": "AI format not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        mapping, _ = DocumentFileAIFormat.objects.get_or_create(
            document_file=document,
            ai_format=ai_format,
        )
        mapping.status = DocumentFileAIFormat.STATUS_PENDING
        mapping.error_message = ""
        mapping.save(update_fields=["status", "error_message"])

        serializer = DocumentFileAIFormatSerializer(mapping)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)


class DocumentAIStatusView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, document_id: int) -> Response:
        try:
            document = DocumentFile.objects.get(pk=document_id)
        except DocumentFile.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        mappings = DocumentFileAIFormat.objects.filter(document_file=document).select_related(
            "ai_format"
        )
        serializer = DocumentFileAIFormatSerializer(mappings, many=True)
        return Response(serializer.data)
