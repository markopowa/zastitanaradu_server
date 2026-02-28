from django.conf import settings
from django.db import models


class ClientCompany(models.Model):
    name = models.CharField(max_length=255)
    pib = models.CharField(max_length=32, unique=True)
    registration_number = models.CharField(max_length=32, blank=True)
    address = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    logo = models.FileField(upload_to="client_logos/", null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = "Klijentska firma"
        verbose_name_plural = "Klijentske firme"
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name


class Employee(models.Model):
    client_company = models.ForeignKey(
        ClientCompany,
        on_delete=models.CASCADE,
        related_name="employees",
        null=True,
        blank=True,
    )
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)
    org_unit = models.CharField(max_length=255, blank=True)
    position = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "Zaposleni klijenta"
        verbose_name_plural = "Zaposleni klijenata"

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class EquipmentItem(models.Model):
    client_company = models.ForeignKey(
        ClientCompany,
        on_delete=models.CASCADE,
        related_name="equipment_items",
    )
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=128, blank=True)
    inventory_number = models.CharField(max_length=128, blank=True)
    location = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Oprema klijenta"
        verbose_name_plural = "Oprema klijenata"
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name
