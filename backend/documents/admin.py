from django.contrib import admin

from .models import (
    DocumentAIFormat,
    DocumentCategory,
    DocumentFile,
    DocumentFileAIFormat,
    DocumentTemplate,
)


@admin.register(DocumentCategory)
class DocumentCategoryAdmin(admin.ModelAdmin):
    list_display = ("code", "name")
    search_fields = ("code", "name")


@admin.register(DocumentAIFormat)
class DocumentAIFormatAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "is_active")
    list_filter = ("is_active",)
    search_fields = ("code", "name")


@admin.register(DocumentFile)
class DocumentFileAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "uploaded_by",
                    "uploaded_at", "valid_from", "valid_until")
    list_filter = ("category", "uploaded_at", "valid_until")
    search_fields = ("title", "category__name", "uploaded_by__username")


@admin.register(DocumentTemplate)
class DocumentTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "context_type")
    list_filter = ("category", "context_type")
    search_fields = ("name", "category__name")


@admin.register(DocumentFileAIFormat)
class DocumentFileAIFormatAdmin(admin.ModelAdmin):
    list_display = ("document_file", "ai_format", "status", "parsed_at")
    list_filter = ("status", "ai_format")
    search_fields = ("document_file__title", "ai_format__code")
