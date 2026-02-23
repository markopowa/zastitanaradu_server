from rest_framework import serializers

from .models import (
    DocumentAIFormat,
    DocumentCategory,
    DocumentFile,
    DocumentFileAIFormat,
)


class DocumentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentCategory
        fields = ("id", "code", "name", "description")


class DocumentAIFormatSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentAIFormat
        fields = ("id", "code", "name", "description", "prompt_template", "is_active")


class DocumentFileSerializer(serializers.ModelSerializer):
    category = DocumentCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source="category",
        queryset=DocumentCategory.objects.all(),
        write_only=True,
    )
    # Force relative URL so browser uses current https origin
    file = serializers.SerializerMethodField()

    class Meta:
        model = DocumentFile
        fields = (
            "id",
            "category",
            "category_id",
            "title",
            "file",
            "uploaded_at",
            "uploaded_by",
            "valid_from",
            "valid_until",
            "version",
            "language",
        )
        read_only_fields = ("uploaded_at", "uploaded_by")

    def get_file(self, obj: DocumentFile) -> str | None:
        f = getattr(obj, "file", None)
        if not f:
            return None
        # This is typically something like "/media/documents/xxx.docx"
        return f.url

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user and not validated_data.get("uploaded_by"):
            validated_data["uploaded_by"] = request.user
        return super().create(validated_data)


class DocumentFileAIFormatSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentFileAIFormat
        fields = (
            "id",
            "document_file",
            "ai_format",
            "parsed_at",
            "status",
            "error_message",
        )
