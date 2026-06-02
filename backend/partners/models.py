from django.db import models


class RiskLevel(models.Model):
    code = models.CharField(max_length=32, unique=True)
    label = models.CharField(max_length=64)
    score = models.PositiveIntegerField()
    is_acceptable = models.BooleanField(default=True)
    is_high_risk = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Risk level"
        verbose_name_plural = "Risk levels"
        ordering = ("order", "score")

    def __str__(self) -> str:
        return f"{self.label} (R={self.score})"


class JobRole(models.Model):
    client_company = models.ForeignKey(
        "ClientCompany",
        on_delete=models.CASCADE,
        related_name="job_roles",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    risk_level = models.ForeignKey(
        RiskLevel,
        on_delete=models.PROTECT,
        related_name="job_roles",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Job role"
        verbose_name_plural = "Job roles"
        ordering = ("client_company", "name")
        unique_together = ("client_company", "name")

    def __str__(self) -> str:
        return self.name


class ClientCompany(models.Model):
    name = models.CharField(max_length=255)
    tax_id = models.CharField("PIB", max_length=32, unique=True)
    registration_number = models.CharField(max_length=32, blank=True)
    address = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    logo = models.FileField(upload_to="client_logos/", null=True, blank=True)
    notes = models.TextField(blank=True)
    activity_code = models.CharField(max_length=64, blank=True)
    risk_assessment_act_file = models.FileField(
        "Akt o proceni rizika (fajl)",
        upload_to="risk_assessment_acts/",
        null=True,
        blank=True,
        help_text="Fajl Akta o proceni rizika (PDF, DOCX, slika).",
    )
    risk_assessment_act_date = models.DateField(
        "Datum donošenja Akta o proceni rizika",
        null=True,
        blank=True,
        help_text="Datum donošenja Akta o proceni rizika.",
    )

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
    father_name = models.CharField(
        max_length=150,
        blank=True,
        help_text="Ime oca zaposlenog (za potrebe lekarskih obrazaca).",
    )
    national_id = models.CharField(
        "JMBG",
        max_length=13,
        blank=True,
        help_text="JMBG zaposlenog.",
    )
    date_of_birth = models.DateField(
        null=True,
        blank=True,
        help_text="Datum rođenja zaposlenog.",
    )
    place_of_birth = models.CharField(
        max_length=255,
        blank=True,
        help_text="Mesto rođenja zaposlenog.",
    )
    occupation = models.CharField(
        max_length=255,
        blank=True,
        help_text="Zanimanje zaposlenog (prema lekarskom obrascu).",
    )
    high_risk_position_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Naziv radnog mesta sa povećanim rizikom.",
    )
    job_role = models.ForeignKey(
        JobRole,
        on_delete=models.SET_NULL,
        related_name="employees",
        null=True,
        blank=True,
    )
    risk_level_override = models.ForeignKey(
        RiskLevel,
        on_delete=models.SET_NULL,
        related_name="employee_overrides",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Zaposleni klijenta"
        verbose_name_plural = "Zaposleni klijenata"

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def effective_risk_level(self) -> "RiskLevel | None":
        if self.risk_level_override_id:
            return self.risk_level_override
        if self.job_role_id:
            return self.job_role.risk_level
        return None


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
