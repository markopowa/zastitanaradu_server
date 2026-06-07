from django.conf import settings
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


class ContactPerson(models.Model):
    ROLE_DIRECTOR = "DIRECTOR"
    ROLE_SAFETY_OFFICER = "SAFETY_OFFICER"
    ROLE_CONTACT = "CONTACT"
    ROLE_OTHER = "OTHER"
    ROLE_CHOICES = (
        (ROLE_DIRECTOR, "Direktor"),
        (ROLE_SAFETY_OFFICER, "Lice za BZNR"),
        (ROLE_CONTACT, "Lice za kontakt"),
        (ROLE_OTHER, "Ostalo"),
    )

    client_company = models.ForeignKey(
        "ClientCompany",
        on_delete=models.CASCADE,
        related_name="contact_persons",
    )
    full_name = models.CharField(max_length=255)
    role = models.CharField(
        max_length=32,
        choices=ROLE_CHOICES,
        default=ROLE_CONTACT,
    )
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    is_primary = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Kontakt-lice"
        verbose_name_plural = "Kontakt-lica"
        ordering = ("-is_primary", "full_name")

    def __str__(self) -> str:
        return self.full_name


class CompanyDocument(models.Model):
    KIND_CONTRACT = "CONTRACT"
    KIND_DECISION = "DECISION"
    KIND_RULEBOOK_OSH = "RULEBOOK_OSH"
    KIND_RULEBOOK_PPE = "RULEBOOK_PPE"
    KIND_TRAINING_EMPLOYEES = "TRAINING_EMPLOYEES"
    KIND_TRAINING_MANAGERS = "TRAINING_MANAGERS"
    KIND_TRAINING_PPE = "TRAINING_PPE"
    KIND_CHOICES = (
        (KIND_CONTRACT, "Ugovor"),
        (KIND_DECISION, "Odluka o imenovanju lica za BZNR"),
        (KIND_RULEBOOK_OSH, "Pravilnik o BZNR"),
        (KIND_RULEBOOK_PPE, "Pravilnik o LZO"),
        (KIND_TRAINING_EMPLOYEES, "Program obuke za zaposlene"),
        (KIND_TRAINING_MANAGERS, "Program obuke za rukovodioce"),
        (KIND_TRAINING_PPE, "Program obuke za LZO"),
    )

    client_company = models.ForeignKey(
        "ClientCompany",
        on_delete=models.CASCADE,
        related_name="company_documents",
    )
    kind = models.CharField(max_length=32, choices=KIND_CHOICES)
    file = models.FileField(upload_to="company_documents/")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="uploaded_company_documents",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Dokument firme"
        verbose_name_plural = "Dokumenti firme"
        ordering = ("client_company", "kind")
        unique_together = ("client_company", "kind")

    def __str__(self) -> str:
        return f"{self.get_kind_display()} ({self.client_company_id})"


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
