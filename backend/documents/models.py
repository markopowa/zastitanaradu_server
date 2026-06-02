from django.conf import settings
from django.db import models
from django.utils.text import slugify
import uuid


class DocumentCategory(models.Model):
    code = models.CharField(max_length=64, unique=True, blank=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = "Kategorija dokumenata"
        verbose_name_plural = "Kategorije dokumenata"

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs) -> None:
        if not self.code:
            base = slugify(self.name or "") or "category"
            for _ in range(10):
                candidate = f"{base}-{uuid.uuid4().hex[:8]}"
                if not DocumentCategory.objects.filter(code=candidate).exists():
                    self.code = candidate
                    break
        super().save(*args, **kwargs)


class DocumentAIFormat(models.Model):
    code = models.CharField(max_length=128, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    prompt_template = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "AI format dokumenta"
        verbose_name_plural = "AI formati dokumenata"

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
        verbose_name = "Dokument"
        verbose_name_plural = "Dokumenti"

    def __str__(self) -> str:
        return self.title


class DocumentTemplate(models.Model):
    CONTEXT_EMPLOYEE = "EMPLOYEE"
    CONTEXT_EQUIPMENT = "EQUIPMENT"
    CONTEXT_CLIENT_COMPANY = "CLIENT_COMPANY"
    CONTEXT_MIXED = "MIXED"

    CONTEXT_CHOICES = (
        (CONTEXT_EMPLOYEE, "Zaposleni"),
        (CONTEXT_EQUIPMENT, "Oprema"),
        (CONTEXT_CLIENT_COMPANY, "Klijentska firma"),
        (CONTEXT_MIXED, "Mešovito"),
    )

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.ForeignKey(
        DocumentCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="templates",
    )
    template_body = models.TextField(blank=True)
    template_file = models.FileField(
        upload_to="document_templates/",
        null=True,
        blank=True,
    )
    source_document_file_id = models.PositiveIntegerField(
        null=True, blank=True)
    context_type = models.CharField(
        max_length=32,
        choices=CONTEXT_CHOICES,
    )
    generation_config = models.JSONField(blank=True, null=True, default=dict)

    class Meta:
        verbose_name = "Šablon dokumenta"
        verbose_name_plural = "Šabloni dokumenata"

    def __str__(self) -> str:
        return self.name


class TemplateFieldDefinition(models.Model):
    CATEGORY_EMPLOYEE = "EMPLOYEE"
    CATEGORY_EQUIPMENT = "EQUIPMENT"
    CATEGORY_CLIENT_COMPANY = "CLIENT_COMPANY"
    CATEGORY_PROCESS = "PROCESS"

    CATEGORY_CHOICES = (
        (CATEGORY_EMPLOYEE, "Employee"),
        (CATEGORY_EQUIPMENT, "Equipment"),
        (CATEGORY_CLIENT_COMPANY, "Client company"),
        (CATEGORY_PROCESS, "Process"),
    )

    key = models.CharField(max_length=128, unique=True)
    label = models.CharField(max_length=255)
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Template field"
        verbose_name_plural = "Template fields"
        ordering = ("category", "order", "label")

    def __str__(self) -> str:
        return f"{self.label} ({self.key})"


class DocumentFileAIFormat(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_IN_PROGRESS = "IN_PROGRESS"
    STATUS_DONE = "DONE"
    STATUS_FAILED = "FAILED"

    STATUS_CHOICES = (
        (STATUS_PENDING, "Na čekanju"),
        (STATUS_IN_PROGRESS, "U toku"),
        (STATUS_DONE, "Završeno"),
        (STATUS_FAILED, "Neuspešno"),
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
        verbose_name = "AI format dokumenta (instanca)"
        verbose_name_plural = "AI formati dokumenata (instance)"
        unique_together = ("document_file", "ai_format")
