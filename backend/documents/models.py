from django.conf import settings
from django.db import models


class DocumentCategory(models.Model):
    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = "Document category"
        verbose_name_plural = "Document categories"

    def __str__(self) -> str:
        return self.name


class DocumentAIFormat(models.Model):
    code = models.CharField(max_length=128, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    prompt_template = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Document AI format"
        verbose_name_plural = "Document AI formats"

    def __str__(self) -> str:
        return self.code


class DocumentFile(models.Model):
    category = models.ForeignKey(
        DocumentCategory,
        on_delete=models.PROTECT,
        related_name="documents",
    )
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to="documents/")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="uploaded_documents",
    )
    valid_from = models.DateField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)
    version = models.CharField(max_length=64, blank=True)
    language = models.CharField(max_length=8, blank=True)

    class Meta:
        verbose_name = "Document file"
        verbose_name_plural = "Document files"

    def __str__(self) -> str:
        return self.title


class DocumentFileAIFormat(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_IN_PROGRESS = "IN_PROGRESS"
    STATUS_DONE = "DONE"
    STATUS_FAILED = "FAILED"

    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_IN_PROGRESS, "In progress"),
        (STATUS_DONE, "Done"),
        (STATUS_FAILED, "Failed"),
    )

    document_file = models.ForeignKey(
        DocumentFile,
        on_delete=models.CASCADE,
        related_name="ai_formats",
    )
    ai_format = models.ForeignKey(
        DocumentAIFormat,
        on_delete=models.CASCADE,
        related_name="document_files",
    )
    parsed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )
    error_message = models.TextField(blank=True)

    class Meta:
        verbose_name = "Document file AI format"
        verbose_name_plural = "Document file AI formats"
        unique_together = ("document_file", "ai_format")

