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
    obrazac6_template = models.FileField(
        upload_to="job_role_templates/obrazac6/",
        null=True,
        blank=True,
    )
    lzo_revers_template = models.FileField(
        upload_to="job_role_templates/lzo/",
        null=True,
        blank=True,
    )
    potvrda_clan5_template = models.FileField(
        upload_to="job_role_templates/potvrda_clan5/",
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
    ZOP_CATEGORY_I = "I"
    ZOP_CATEGORY_II = "II"
    ZOP_CATEGORY_III = "III"
    ZOP_CATEGORY_CHOICES = (
        (ZOP_CATEGORY_I, "Kategorija I"),
        (ZOP_CATEGORY_II, "Kategorija II"),
        (ZOP_CATEGORY_III, "Kategorija III"),
    )

    INSTALLATION_HYDRANT_NETWORK = "HYDRANT_NETWORK"
    INSTALLATION_FIRE_ALARM_SYSTEM = "FIRE_ALARM_SYSTEM"
    INSTALLATION_LIGHTNING_PROTECTION = "LIGHTNING_PROTECTION"
    INSTALLATION_STABLE_EXTINGUISHING_SYSTEM = "STABLE_EXTINGUISHING_SYSTEM"
    INSTALLATION_FIRE_EXTINGUISHERS = "FIRE_EXTINGUISHERS"

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
    zop_category = models.CharField(
        max_length=4,
        choices=ZOP_CATEGORY_CHOICES,
        blank=True,
        default="",
        verbose_name="ZOP kategorija",
    )
    high_risk_activity = models.BooleanField(
        default=False,
        verbose_name="Delatnost visokog rizika",
    )
    installations = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Instalacije",
        help_text=(
            "Kodovi instalacija koje firma ima: HYDRANT_NETWORK, FIRE_ALARM_SYSTEM, "
            "LIGHTNING_PROTECTION, STABLE_EXTINGUISHING_SYSTEM, FIRE_EXTINGUISHERS."
        ),
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
    KIND_PLAN_ZOP = "PLAN_ZOP"
    KIND_PRAVILA_ZOP = "PRAVILA_ZOP"
    KIND_PLAN_EVAKUACIJE = "PLAN_EVAKUACIJE"
    KIND_DECISION_ZOP = "DECISION_ZOP"
    KIND_OCENA_MEDICINE_RADA = "OCENA_MEDICINE_RADA"
    KIND_CHOICES = (
        (KIND_CONTRACT, "Ugovor"),
        (KIND_DECISION, "Odluka o imenovanju lica za BZNR"),
        (KIND_RULEBOOK_OSH, "Pravilnik o BZNR"),
        (KIND_RULEBOOK_PPE, "Pravilnik o LZO"),
        (KIND_TRAINING_EMPLOYEES, "Program obuke za zaposlene"),
        (KIND_TRAINING_MANAGERS, "Program obuke za rukovodioce"),
        (KIND_TRAINING_PPE, "Program obuke za LZO"),
        (KIND_PLAN_ZOP, "Plan zaštite od požara"),
        (KIND_PRAVILA_ZOP, "Pravila zaštite od požara"),
        (KIND_PLAN_EVAKUACIJE, "Plan evakuacije"),
        (KIND_DECISION_ZOP, "Odluka o imenovanju lica za ZOP"),
        (KIND_OCENA_MEDICINE_RADA, "Ocena medicine rada"),
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


class RiskAssessmentAct(models.Model):
    client_company = models.OneToOneField(
        ClientCompany,
        on_delete=models.CASCADE,
        related_name="risk_assessment_act",
    )
    act_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Akt o proceni rizika"
        verbose_name_plural = "Akti o proceni rizika"

    def __str__(self) -> str:
        return f"Akt — {self.client_company.name}"


class RiskAssessmentSection(models.Model):
    SECTION_INTRO = "INTRO"
    SECTION_ASSESSMENTS = "ASSESSMENTS"
    SECTION_CONCLUSION = "CONCLUSION"
    SECTION_CHOICES = (
        (SECTION_INTRO, "Uvod"),
        (SECTION_ASSESSMENTS, "Procene po radnom mestu"),
        (SECTION_CONCLUSION, "Zaključak"),
    )

    act = models.ForeignKey(
        RiskAssessmentAct,
        on_delete=models.CASCADE,
        related_name="sections",
    )
    section_type = models.CharField(max_length=32, choices=SECTION_CHOICES)
    order = models.PositiveIntegerField(default=0)
    current_file = models.FileField(
        upload_to="risk_assessment_acts/sections/",
        null=True,
        blank=True,
    )
    current_version = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Sekcija Akta o proceni rizika"
        verbose_name_plural = "Sekcije Akta o proceni rizika"
        ordering = ("act", "order")
        unique_together = ("act", "section_type")

    def __str__(self) -> str:
        return f"{self.get_section_type_display()} ({self.act_id})"


class RiskAssessmentSectionRevision(models.Model):
    section = models.ForeignKey(
        RiskAssessmentSection,
        on_delete=models.CASCADE,
        related_name="revisions",
    )
    version = models.PositiveIntegerField()
    file = models.FileField(upload_to="risk_assessment_acts/revisions/")
    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="risk_assessment_revisions",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Revizija sekcije Akta"
        verbose_name_plural = "Revizije sekcija Akta"
        ordering = ("section", "-version")
        unique_together = ("section", "version")

    def __str__(self) -> str:
        return f"{self.section} v{self.version}"


class RiskAssessmentActAmendment(models.Model):
    act = models.ForeignKey(
        RiskAssessmentAct,
        on_delete=models.CASCADE,
        related_name="amendments",
        verbose_name="Akt o proceni rizika",
    )
    title = models.CharField(
        max_length=255,
        verbose_name="Naziv izmene",
    )
    note = models.TextField(
        blank=True,
        verbose_name="Napomena",
    )
    file = models.FileField(
        upload_to="risk_assessment_acts/amendments/",
        verbose_name="Fajl izmene",
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="risk_assessment_act_amendments",
        verbose_name="Postavio",
    )
    uploaded_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Datum postavljanja",
    )

    class Meta:
        verbose_name = "Izmena Akta o proceni rizika"
        verbose_name_plural = "Izmene Akta o proceni rizika"
        ordering = ("act", "uploaded_at")

    def __str__(self) -> str:
        return f"{self.title} ({self.act_id})"


class ComplianceFindingType(models.Model):
    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    default_validity_months = models.PositiveIntegerField(default=36)
    process_type = models.ForeignKey(
        "processes.ProcessType",
        on_delete=models.SET_NULL,
        related_name="compliance_finding_types",
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Tip stručnog nalaza"
        verbose_name_plural = "Tipovi stručnih nalaza"
        ordering = ("order", "name")

    def __str__(self) -> str:
        return self.name


class CompanyComplianceFinding(models.Model):
    STATUS_VALID = "VALID"
    STATUS_EXPIRING = "EXPIRING"
    STATUS_EXPIRED = "EXPIRED"
    STATUS_MISSING = "MISSING"

    EXPIRING_THRESHOLD_DAYS = 30

    client_company = models.ForeignKey(
        ClientCompany,
        on_delete=models.CASCADE,
        related_name="compliance_findings",
    )
    finding_type = models.ForeignKey(
        ComplianceFindingType,
        on_delete=models.PROTECT,
        related_name="company_findings",
    )
    file = models.FileField(
        upload_to="compliance_findings/",
        null=True,
        blank=True,
    )
    issued_date = models.DateField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)
    process_binding = models.ForeignKey(
        "processes.ProcessBinding",
        on_delete=models.SET_NULL,
        related_name="compliance_findings",
        null=True,
        blank=True,
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Stručni nalaz firme"
        verbose_name_plural = "Stručni nalazi firme"
        ordering = ("client_company", "finding_type__order")
        unique_together = ("client_company", "finding_type")

    def __str__(self) -> str:
        return f"{self.finding_type} ({self.client_company_id})"

    @property
    def status(self) -> str:
        if not self.file or not self.valid_until:
            return self.STATUS_MISSING
        from django.utils import timezone

        today = timezone.localdate()
        if self.valid_until < today:
            return self.STATUS_EXPIRED
        days_left = (self.valid_until - today).days
        if days_left <= self.EXPIRING_THRESHOLD_DAYS:
            return self.STATUS_EXPIRING
        return self.STATUS_VALID


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


class CompanyRegistrySnapshot(models.Model):
    cut_off_date = models.DateField()
    downloaded_at = models.DateTimeField(auto_now_add=True)
    source_url = models.URLField(max_length=512)
    file_path = models.CharField(max_length=512, blank=True)
    company_count = models.PositiveIntegerField(default=0)
    is_current = models.BooleanField(default=False, db_index=True)

    class Meta:
        verbose_name = "Company registry snapshot"
        verbose_name_plural = "Company registry snapshots"
        ordering = ("-cut_off_date", "-downloaded_at")

    def __str__(self) -> str:
        return f"Registry {self.cut_off_date} ({self.company_count})"


class CompanyObligationExclusion(models.Model):
    client_company = models.ForeignKey(
        ClientCompany,
        on_delete=models.CASCADE,
        related_name="obligation_exclusions",
        verbose_name="Klijentska firma",
    )
    process_type = models.ForeignKey(
        "processes.ProcessType",
        on_delete=models.CASCADE,
        related_name="obligation_exclusions",
        verbose_name="Vrsta obaveze",
    )
    reason = models.TextField(verbose_name="Razlog isključenja")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="obligation_exclusions",
        verbose_name="Kreirao",
    )
    created_at = models.DateTimeField(
        auto_now_add=True, verbose_name="Datum kreiranja")

    class Meta:
        verbose_name = "Isključenje obaveze"
        verbose_name_plural = "Isključenja obaveza"
        unique_together = ("client_company", "process_type")

    def __str__(self) -> str:
        return f"{self.client_company} – {self.process_type}"


class CompanyRegistryEntry(models.Model):
    snapshot = models.ForeignKey(
        CompanyRegistrySnapshot,
        on_delete=models.CASCADE,
        related_name="entries",
    )
    registration_number = models.CharField(max_length=32, db_index=True)
    name = models.CharField(max_length=512)
    municipality_code = models.CharField(max_length=16, blank=True)
    municipality_name = models.CharField(max_length=255, blank=True)
    status_name = models.CharField(max_length=128, blank=True)
    founded_date = models.DateField(null=True, blank=True)
    legal_form_name = models.CharField(max_length=255, blank=True)
    activity_code = models.CharField(max_length=32, blank=True)

    class Meta:
        verbose_name = "Company registry entry"
        verbose_name_plural = "Company registry entries"
        constraints = [
            models.UniqueConstraint(
                fields=("snapshot", "registration_number"),
                name="uniq_registry_entry_per_snapshot",
            ),
        ]
        indexes = [
            models.Index(
                fields=("snapshot", "registration_number"),
                name="registry_entry_snapshot_mb_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.registration_number} {self.name}"
