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


def validate_visual_placeholders(placeholders):
    if not isinstance(placeholders, list):
        raise serializers.ValidationError({"placeholders": "Must be a list."})
    for index, placeholder in enumerate(placeholders):
        if not isinstance(placeholder, dict):
            raise serializers.ValidationError(
                {"placeholders": f"Item {index} must be an object."}
            )
        if "fontSize" in placeholder:
            font_size = placeholder["fontSize"]
            if (
                not isinstance(font_size, (int, float))
                or font_size < 6
                or font_size > 48
            ):
                raise serializers.ValidationError(
                    {
                        "placeholders": (
                            f"Item {index}: fontSize must be between 6 and 48."
                        )
                    }
                )
        if "widthPct" in placeholder:
            width_pct = placeholder["widthPct"]
            if (
                not isinstance(width_pct, (int, float))
                or width_pct < 2
                or width_pct > 100
            ):
                raise serializers.ValidationError(
                    {
                        "placeholders": (
                            f"Item {index}: widthPct must be between 2 and 100."
                        )
                    }
                )
    return placeholders


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

    def validate_generation_config(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("Must be an object.")
        if value.get("mode") != "VISUAL":
            return value
        validate_visual_placeholders(value.get("placeholders") or [])
        return value


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
