from rest_framework import permissions, viewsets

from .models import DocumentAIFormat, DocumentCategory, DocumentFile
from .serializers import (
    DocumentAIFormatSerializer,
    DocumentCategorySerializer,
    DocumentFileSerializer,
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

class DocumentAIFormatViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DocumentAIFormat.objects.filter(is_active=True).order_by("id")
    serializer_class = DocumentAIFormatSerializer
    permission_classes = [permissions.IsAuthenticated]
