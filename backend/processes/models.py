from django.conf import settings
from django.contrib.auth.models import Group
from django.db import models, transaction

from documents.models import DocumentFile, DocumentTemplate

from partners.models import ClientCompany, Employee, EquipmentItem


class CodeSequence(models.Model):
    name = models.CharField(max_length=50, unique=True)
    value = models.PositiveIntegerField(default=0)


def get_next_code(name, prefix):
    with transaction.atomic():
        seq, _ = CodeSequence.objects.select_for_update().get_or_create(
            name=name
        )
        seq.value += 1
        seq.save()

        return f"{prefix}-{seq.value:04d}"


class ProcessType(models.Model):
    SUBJECT_EMPLOYEE = "EMPLOYEE"
    SUBJECT_EQUIPMENT = "EQUIPMENT"
    SUBJECT_CLIENT_COMPANY = "CLIENT_COMPANY"

    SUBJECT_CHOICES = (
        (SUBJECT_EMPLOYEE, "Zaposleni"),
        (SUBJECT_EQUIPMENT, "Oprema"),
        (SUBJECT_CLIENT_COMPANY, "Klijentska firma"),
    )

    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    subject_kind = models.CharField(
        max_length=32,
        choices=SUBJECT_CHOICES,
    )
    default_period_months = models.PositiveIntegerField(null=True, blank=True)
    lead_time_days = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    include_in_medical_exam_record = models.BooleanField(
        default=True,
        help_text="Ako je uključeno, završeni run-ovi ove vrste ulaze u generisanje Obrazca 1.",
    )

    class Meta:
        verbose_name = "Vrsta obaveze"
        verbose_name_plural = "Vrste obaveza"
        ordering = ("code",)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = get_next_code("process_type", "PRT")

        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class ProcessTemplate(models.Model):
    TRIGGER_ON_SCHEDULED = "ON_SCHEDULED"
    TRIGGER_ON_COMPLETED = "ON_COMPLETED"
    TRIGGER_ON_EXPIRED = "ON_EXPIRED"

    TRIGGER_CHOICES = (
        (TRIGGER_ON_SCHEDULED, "Na zakazani datum"),
        (TRIGGER_ON_COMPLETED, "Kada se završi pregled"),
        (TRIGGER_ON_EXPIRED, "Kada istekne rok važenja"),
    )

    EMAIL_TO_CLIENT_MAIN = "CLIENT_MAIN_EMAIL"
    EMAIL_TO_EMPLOYEE = "EMPLOYEE_EMAIL"
    EMAIL_TO_INTERNAL_ROLE = "INTERNAL_ROLE"
    EMAIL_TO_CUSTOM = "CUSTOM"

    EMAIL_TO_CHOICES = (
        (EMAIL_TO_CLIENT_MAIN, "Glavni email klijenta"),
        (EMAIL_TO_EMPLOYEE, "Email zaposlenog"),
        (EMAIL_TO_INTERNAL_ROLE, "Interna uloga"),
        (EMAIL_TO_CUSTOM, "Prilagođena adresa"),
    )

    process_type = models.ForeignKey(
        ProcessType,
        on_delete=models.CASCADE,
        related_name="templates",
    )
    document_template = models.ForeignKey(
        DocumentTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="process_templates",
    )
    trigger = models.CharField(
        max_length=32,
        choices=TRIGGER_CHOICES,
    )
    generate_document = models.BooleanField(default=False)
    send_email = models.BooleanField(default=False)
    email_to_kind = models.CharField(
        max_length=32,
        choices=EMAIL_TO_CHOICES,
        blank=True,
    )
    email_subject_template = models.CharField(max_length=255, blank=True)
    email_body_template = models.TextField(blank=True)
    custom_email_recipient = models.EmailField(blank=True)
    notification_role_group = models.ForeignKey(
        Group,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="process_templates",
    )
    followup_process_type = models.ForeignKey(
        "ProcessType",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="followup_templates",
        help_text=(
            "Opciona sledeća vrsta obaveze koja se automatski povezuje "
            "za isti subjekt nakon završetka ove obaveze."
        ),
    )

    class Meta:
        verbose_name = "Šablon procesa"
        verbose_name_plural = "Šabloni procesa"
        ordering = ("process_type", "trigger")

    def __str__(self) -> str:
        return f"{self.process_type.name} – {self.get_trigger_display()}"


class ProcessBinding(models.Model):
    SUBJECT_EMPLOYEE = "EMPLOYEE"
    SUBJECT_EQUIPMENT = "EQUIPMENT"
    SUBJECT_CLIENT_COMPANY = "CLIENT_COMPANY"

    SUBJECT_CHOICES = (
        (SUBJECT_EMPLOYEE, "Zaposleni"),
        (SUBJECT_EQUIPMENT, "Oprema"),
        (SUBJECT_CLIENT_COMPANY, "Klijentska firma"),
    )

    process_type = models.ForeignKey(
        ProcessType,
        on_delete=models.CASCADE,
        related_name="bindings",
    )
    subject_kind = models.CharField(
        max_length=32,
        choices=SUBJECT_CHOICES,
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="process_bindings",
        null=True,
        blank=True,
    )
    equipment_item = models.ForeignKey(
        EquipmentItem,
        on_delete=models.CASCADE,
        related_name="process_bindings",
        null=True,
        blank=True,
    )
    client_company = models.ForeignKey(
        ClientCompany,
        on_delete=models.CASCADE,
        related_name="process_bindings",
        null=True,
        blank=True,
    )
    custom_period_months = models.PositiveIntegerField(null=True, blank=True)
    lead_time_days = models.PositiveIntegerField(null=True, blank=True)
    next_run_at = models.DateField(null=True, blank=True)
    last_run_at = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Raspored obaveze"
        verbose_name_plural = "Rasporedi obaveza"
        ordering = ("process_type__code",)

    def __str__(self) -> str:
        subject = self.employee or self.equipment_item or self.client_company
        return f"{self.process_type.name} – {subject}"


class ProcessRun(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_SENT = "SENT"
    STATUS_COMPLETED = "COMPLETED"
    STATUS_CANCELLED = "CANCELLED"
    STATUS_FAILED = "FAILED"

    STATUS_CHOICES = (
        (STATUS_PENDING, "Na čekanju"),
        (STATUS_SENT, "Poslat"),
        (STATUS_COMPLETED, "Završeno"),
        (STATUS_CANCELLED, "Otkazano"),
        (STATUS_FAILED, "Neuspešno"),
    )

    process_binding = models.ForeignKey(
        ProcessBinding,
        on_delete=models.CASCADE,
        related_name="runs",
    )
    process_type = models.ForeignKey(
        ProcessType,
        on_delete=models.PROTECT,
        related_name="runs",
    )
    subject_snapshot = models.JSONField(default=dict, blank=True)
    scheduled_for = models.DateField(null=True, blank=True)
    performed_at = models.DateField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )
    notes = models.TextField(blank=True)
    result_data = models.JSONField(default=dict, blank=True)
    expired_reminder_sent_at = models.DateField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_process_runs",
    )
    email_error = models.TextField(blank=True)

    class Meta:
        verbose_name = "Aktivnost obaveze"
        verbose_name_plural = "Aktivnosti obaveza"
        ordering = ("-scheduled_for", "-id")

    def __str__(self) -> str:
        return f"{self.process_type.name} – {self.scheduled_for} ({self.status})"


class ProcessRunDocument(models.Model):
    USAGE_INVITATION = "INVITATION"
    USAGE_REPORT = "REPORT"
    USAGE_CERTIFICATE = "CERTIFICATE"

    USAGE_CHOICES = (
        (USAGE_INVITATION, "Poziv"),
        (USAGE_REPORT, "Izveštaj"),
        (USAGE_CERTIFICATE, "Potvrda"),
    )

    process_run = models.ForeignKey(
        ProcessRun,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    document_file = models.ForeignKey(
        DocumentFile,
        on_delete=models.CASCADE,
        related_name="process_run_documents",
    )
    usage_kind = models.CharField(
        max_length=32,
        choices=USAGE_CHOICES,
    )

    class Meta:
        verbose_name = "Dokument aktivnosti"
        verbose_name_plural = "Dokumenti aktivnosti"


class TaskAssignment(models.Model):

    STATUS_TODO = "TODO"
    STATUS_IN_PROGRESS = "IN_PROGRESS"
    STATUS_DONE = "DONE"

    STATUS_CHOICES = (
        (STATUS_TODO, "Za uraditi"),
        (STATUS_IN_PROGRESS, "U toku"),
        (STATUS_DONE, "Završeno"),
    )

    process_run = models.ForeignKey(
        ProcessRun,
        on_delete=models.CASCADE,
        related_name="task_assignments",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="process_task_assignments",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default=STATUS_TODO,
    )

    class Meta:
        verbose_name = "Zadatak procesa"
        verbose_name_plural = "Zadaci procesa"
        ordering = ("-due_date", "id")

    def __str__(self) -> str:
        return f"{self.title} – {self.assigned_to}"


class ProcessNote(models.Model):
    process_run = models.ForeignKey(
        ProcessRun,
        on_delete=models.CASCADE,
        related_name="process_notes",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="process_notes",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Beleška aktivnosti"
        verbose_name_plural = "Beleške aktivnosti"
        ordering = ("created_at",)

    def __str__(self) -> str:
        return f"Beleška #{self.pk} – {self.process_run}"
