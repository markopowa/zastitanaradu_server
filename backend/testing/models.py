from django.db import models

from partners.models import ClientCompany, Employee
from processes.models import ProcessRun


class TestQuestion(models.Model):
    client_company = models.ForeignKey(
        ClientCompany,
        on_delete=models.CASCADE,
        related_name="test_questions",
        null=True,
        blank=True,
    )
    text = models.TextField()
    choices = models.JSONField(default=list)
    correct_key = models.CharField(max_length=32)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Pitanje testa"
        verbose_name_plural = "Pitanja testa"
        ordering = ("client_company_id", "order", "id")

    def __str__(self) -> str:
        return self.text[:80]


class TestAttempt(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="test_attempts",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    score_pct = models.FloatField()
    passed = models.BooleanField(default=False)
    answers = models.JSONField(default=dict)
    run = models.ForeignKey(
        ProcessRun,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="test_attempts",
    )

    class Meta:
        verbose_name = "Pokušaj testa"
        verbose_name_plural = "Pokušaji testa"
        ordering = ("-created_at", "-id")

    def __str__(self) -> str:
        status = "položio" if self.passed else "nije položio"
        return f"{self.employee} – {self.score_pct}% ({status})"
