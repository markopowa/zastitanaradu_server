from django.conf import settings
from django.db import models

from documents.models import DocumentFile

class Employee(models.Model):
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    org_unit = models.CharField(max_length=255, blank=True)
    position = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "Employee"
        verbose_name_plural = "Employees"

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

class TrainingType(models.Model):
    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    default_validity_months = models.PositiveIntegerField(null=True, blank=True)
    is_for_high_risk_positions = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Training type"
        verbose_name_plural = "Training types"

    def __str__(self) -> str:
        return self.name

class TrainingProgram(models.Model):
    training_type = models.ForeignKey(
        TrainingType,
        on_delete=models.CASCADE,
        related_name="programs",
    )
    title = models.CharField(max_length=255)
    document_file = models.ForeignKey(
        DocumentFile,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="training_programs",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Training program"
        verbose_name_plural = "Training programs"

    def __str__(self) -> str:
        return self.title

class TrainingSession(models.Model):
    training_type = models.ForeignKey(
        TrainingType,
        on_delete=models.PROTECT,
        related_name="sessions",
    )
    program = models.ForeignKey(
        TrainingProgram,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sessions",
    )
    session_date = models.DateField()
    location = models.CharField(max_length=255)
    instructor = models.CharField(max_length=255)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = "Training session"
        verbose_name_plural = "Training sessions"

    def __str__(self) -> str:
        return f"{self.training_type.name} - {self.session_date}"

class TrainingAttendance(models.Model):
    STATUS_ACTIVE = "ACTIVE"
    STATUS_EXPIRES_SOON = "EXPIRES_SOON"
    STATUS_EXPIRED = "EXPIRED"

    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_EXPIRES_SOON, "Expires soon"),
        (STATUS_EXPIRED, "Expired"),
    )

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="training_attendance",
    )
    training_session = models.ForeignKey(
        TrainingSession,
        on_delete=models.CASCADE,
        related_name="attendance",
    )
    valid_until = models.DateField()
    certificate_number = models.CharField(max_length=128, blank=True)
    passed = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_training_attendance",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Training attendance"
        verbose_name_plural = "Training attendance"
        indexes = [
            models.Index(fields=["employee", "valid_until"]),
            models.Index(fields=["valid_until"]),
        ]

    def __str__(self) -> str:
        return f"{self.employee} - {self.training_session}"
