from rest_framework import serializers

from .models import (
    DocumentAIFormat,
    DocumentCategory,
    DocumentFile,
    DocumentFileAIFormat,
    DocumentTemplate,
    TemplateFieldDefinition,
)


class TemplateFieldDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateFieldDefinition
        fields = ("id", "key", "label", "category", "order", "is_active")


class DocumentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentCategory
        fields = ("id", "code", "name", "description")
        read_only_fields = ("code",)


class DocumentAIFormatSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentAIFormat
        fields = ("id", "code", "name", "description",
                  "prompt_template", "is_active")


class DocumentFileSerializer(serializers.ModelSerializer):
    category = DocumentCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source="category",
        queryset=DocumentCategory.objects.all(),
        write_only=True,
    )
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
        return f.url

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user and not validated_data.get("uploaded_by"):
            validated_data["uploaded_by"] = request.user
        return super().create(validated_data)


class DocumentTemplateSerializer(serializers.ModelSerializer):
    category = DocumentCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source="category",
        queryset=DocumentCategory.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )
    template_file = serializers.SerializerMethodField()
    source_document_file_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = DocumentTemplate
        fields = (
            "id",
            "name",
            "description",
            "category",
            "category_id",
            "template_body",
            "template_file",
            "source_document_file_id",
            "context_type",
            "generation_config",
        )

    def get_template_file(self, obj: DocumentTemplate) -> str | None:
        f = getattr(obj, "template_file", None)
        if not f:
            return None
        return f.url


class DocumentTemplatePageImageUrlListSerializer(serializers.ListSerializer):
    child = serializers.CharField()


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
