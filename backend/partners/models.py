import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


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
    obrazac6_fields = models.JSONField(default=list, blank=True)
    lzo_revers_template = models.FileField(
        upload_to="job_role_templates/lzo/",
        null=True,
        blank=True,
    )
    lzo_revers_fields = models.JSONField(default=list, blank=True)
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
    email_test_mode = models.BooleanField(
        default=True,
        verbose_name="Test režim slanja mejlova",
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


class TrainingType(models.Model):
    client_company = models.ForeignKey(
        "ClientCompany",
        on_delete=models.CASCADE,
        related_name="training_types",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    potvrda_template = models.FileField(
        upload_to="training_types/potvrda/",
        null=True,
        blank=True,
    )
    potvrda_fields = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Vrsta obuke"
        verbose_name_plural = "Vrste obuka"
        ordering = ("client_company", "name")
        unique_together = ("client_company", "name")

    def __str__(self) -> str:
        return self.name


class EmployeeTraining(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="trainings",
    )
    training_type = models.ForeignKey(
        TrainingType,
        on_delete=models.PROTECT,
        related_name="employee_trainings",
    )
    completed_at = models.DateField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)
    certificate_file = models.FileField(
        upload_to="training_certificates/",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Obuka zaposlenog"
        verbose_name_plural = "Obuke zaposlenih"
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.training_type} — {self.employee}"


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
    KIND_OBRAZAC1 = "OBRAZAC1"
    KIND_HIGH_RISK_REGISTRY = "HIGH_RISK_REGISTRY"
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
        (KIND_OBRAZAC1, "Obrazac 1 — evidencija lekarskih pregleda"),
        (KIND_HIGH_RISK_REGISTRY, "Evidencija radnih mesta sa povećanim rizikom"),
    )
    KIND_LABELS = dict(KIND_CHOICES)

    client_company = models.ForeignKey(
        "ClientCompany",
        on_delete=models.CASCADE,
        related_name="company_documents",
    )
    kind = models.CharField(max_length=32)
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

    def get_kind_display(self) -> str:
        if self.kind in self.KIND_LABELS:
            return self.KIND_LABELS[self.kind]
        entry = CompanyDocumentKind.objects.filter(code=self.kind).first()
        return entry.name if entry else self.kind


class CompanyDocumentKind(models.Model):
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=255)
    optional = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Vrsta dokumenta firme"
        verbose_name_plural = "Vrste dokumenata firme"
        ordering = ("order", "name")

    def __str__(self) -> str:
        return self.name


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
    service_process_type = models.ForeignKey(
        "processes.ProcessType",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="equipment_items",
        verbose_name="Vrsta obaveze servisa/pregleda",
    )

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


class WorkInjury(models.Model):
    SEVERITY_LAKA = "LAKA"
    SEVERITY_TESKA = "TESKA"
    SEVERITY_SMRTNA = "SMRTNA"
    SEVERITY_KOLEKTIVNA = "KOLEKTIVNA"
    SEVERITY_CHOICES = (
        (SEVERITY_LAKA, "Laka povreda"),
        (SEVERITY_TESKA, "Teška povreda"),
        (SEVERITY_SMRTNA, "Smrtna povreda"),
        (SEVERITY_KOLEKTIVNA, "Kolektivna povreda"),
    )

    client_company = models.ForeignKey(
        ClientCompany,
        on_delete=models.CASCADE,
        related_name="work_injuries",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="work_injuries",
    )
    date = models.DateField()
    severity = models.CharField(max_length=16, choices=SEVERITY_CHOICES)
    description = models.TextField(blank=True)
    report_file = models.FileField(
        upload_to="injuries/",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_work_injuries",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Povreda na radu"
        verbose_name_plural = "Povrede na radu"
        ordering = ("-date",)

    def __str__(self) -> str:
        return f"{self.employee} – {self.date}"


SEVERE_WORK_INJURY_SEVERITIES = (
    WorkInjury.SEVERITY_TESKA,
    WorkInjury.SEVERITY_SMRTNA,
    WorkInjury.SEVERITY_KOLEKTIVNA,
)


def notify_severe_work_injury(injury: "WorkInjury") -> None:
    import logging

    logger = logging.getLogger(__name__)

    if injury.severity not in SEVERE_WORK_INJURY_SEVERITIES:
        return

    try:
        _send_severe_work_injury_alert(injury, logger)
    except Exception:
        logger.exception(
            "Failed to process severe work injury alert for injury id=%s",
            injury.pk,
        )


def _send_severe_work_injury_alert(injury: "WorkInjury", logger) -> None:
    from processes.activity_log import log_activity
    from processes.date_format import format_date_display
    from processes.models import ActivityLog
    from processes.utils import internal_mak_recipients

    employee_name = f"{injury.employee.first_name} {injury.employee.last_name}".strip()
    company_name = injury.client_company.name
    severity_label = injury.get_severity_display()
    date_display = format_date_display(injury.date)

    subject = f"HITNO: {severity_label} na radu – {company_name}"
    body = (
        f"Prijavljena je {severity_label.lower()} na radu.\n\n"
        f"Zaposleni: {employee_name}\n"
        f"Firma: {company_name}\n"
        f"Datum: {date_display}\n"
        f"Težina: {severity_label}\n\n"
        f"Prijaviti inspekciji rada odmah, najkasnije u roku od 24 časa — "
        f"usmeno i pismeno. Pravni osnov: Zakon o BZR čl. 50."
    )

    recipients = list(internal_mak_recipients())
    company_email = (injury.client_company.email or "").strip()
    if company_email and company_email not in recipients:
        recipients.append(company_email)

    sent = False
    if recipients:
        try:
            from core.email_context import company_email_test_mode
            from core.email_sender import get_email_sender

            with company_email_test_mode(injury.client_company):
                sent = bool(
                    get_email_sender().send(
                        recipients=recipients,
                        subject=subject,
                        body=body,
                        fail_silently=True,
                    )
                )
        except Exception:
            logger.exception(
                "Failed to send severe work injury alert for injury id=%s",
                injury.pk,
            )

    log_activity(
        ActivityLog.EVENT_RUN_SENT,
        (
            f"Prijava povrede na radu ({severity_label}): {employee_name} – "
            f"{company_name}, {date_display}."
        ),
        extra_data={
            "work_injury_id": injury.pk,
            "severity": injury.severity,
            "recipients": recipients,
            "email_sent": sent,
        },
    )


def _generate_intake_token() -> str:
    return uuid.uuid4().hex


class ClientIntakeLink(models.Model):
    client_company = models.ForeignKey(
        ClientCompany,
        on_delete=models.CASCADE,
        related_name="intake_links",
    )
    token = models.CharField(
        max_length=32,
        unique=True,
        default=_generate_intake_token,
        editable=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Link za upitnik klijenta"
        verbose_name_plural = "Linkovi za upitnik klijenta"
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.client_company} — {self.token}"

    @property
    def is_valid(self) -> bool:
        if not self.is_active:
            return False
        if self.expires_at and timezone.now() > self.expires_at:
            return False
        return True


class ClientIntakeSubmission(models.Model):
    KIND_EMPLOYEE = "EMPLOYEE"
    KIND_EQUIPMENT = "EQUIPMENT"
    KIND_CHOICES = (
        (KIND_EMPLOYEE, "Novi zaposleni"),
        (KIND_EQUIPMENT, "Nova oprema"),
    )

    STATUS_PENDING = "PENDING"
    STATUS_APPROVED = "APPROVED"
    STATUS_REJECTED = "REJECTED"
    STATUS_CHOICES = (
        (STATUS_PENDING, "Na čekanju"),
        (STATUS_APPROVED, "Odobreno"),
        (STATUS_REJECTED, "Odbijeno"),
    )

    link = models.ForeignKey(
        ClientIntakeLink,
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    kind = models.CharField(max_length=16, choices=KIND_CHOICES)
    data = models.JSONField(default=dict)
    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="reviewed_intake_submissions",
        null=True,
        blank=True,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Prijava upitnika klijenta"
        verbose_name_plural = "Prijave upitnika klijenta"
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.get_kind_display()} ({self.link.client_company_id}) — {self.status}"


class Hazard(models.Model):
    KIND_OPASNOST = "OPASNOST"
    KIND_STETNOST = "STETNOST"
    KIND_CHOICES = (
        (KIND_OPASNOST, "Opasnost"),
        (KIND_STETNOST, "Štetnost"),
    )

    code = models.CharField(max_length=32, unique=True)
    label = models.CharField(max_length=255)
    kind = models.CharField(max_length=16, choices=KIND_CHOICES)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Opasnost/štetnost"
        verbose_name_plural = "Opasnosti i štetnosti"
        ordering = ("kind", "order", "label")

    def __str__(self) -> str:
        return f"{self.label} ({self.get_kind_display()})"


class KinneyScaleOption(models.Model):
    FACTOR_VEROVATNOCA = "V"
    FACTOR_IZLOZENOST = "I"
    FACTOR_POSLEDICA = "P"
    FACTOR_CHOICES = (
        (FACTOR_VEROVATNOCA, "Verovatnoća"),
        (FACTOR_IZLOZENOST, "Izloženost"),
        (FACTOR_POSLEDICA, "Posledica"),
    )

    factor = models.CharField(max_length=1, choices=FACTOR_CHOICES)
    value = models.FloatField()
    label = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Skala procene rizika (opcija)"
        verbose_name_plural = "Skala procene rizika (opcije)"
        ordering = ("factor", "order", "value")
        unique_together = ("factor", "value")

    def __str__(self) -> str:
        return f"{self.get_factor_display()}: {self.value} ({self.label})"


class JobRoleHazard(models.Model):
    job_role = models.ForeignKey(
        JobRole,
        on_delete=models.CASCADE,
        related_name="hazards",
    )
    hazard = models.ForeignKey(
        Hazard,
        on_delete=models.PROTECT,
        related_name="job_role_hazards",
    )
    verovatnoca = models.FloatField(default=1.0)
    izlozenost = models.FloatField(default=1.0)
    posledica = models.FloatField(default=1.0)
    rizik = models.FloatField(default=0.0)
    risk_category = models.CharField(max_length=16, blank=True)
    mere = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Procena rizika radnog mesta"
        verbose_name_plural = "Procene rizika radnih mesta"
        ordering = ("job_role", "order", "id")
        unique_together = ("job_role", "hazard")

    def save(self, *args, **kwargs):
        from .kinney import categorize, compute_rizik

        self.rizik = compute_rizik(
            self.verovatnoca, self.izlozenost, self.posledica)
        self.risk_category = categorize(self.rizik)[0]
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.job_role.name} — {self.hazard.label} (R={self.rizik})"


class JobRoleLZO(models.Model):
    job_role = models.ForeignKey(
        JobRole,
        on_delete=models.CASCADE,
        related_name="lzo_items",
    )
    name = models.CharField(max_length=255)
    standard = models.CharField(max_length=255, blank=True)
    interval_months = models.PositiveIntegerField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Sredstvo lične zaštite po radnom mestu"
        verbose_name_plural = "Sredstva lične zaštite po radnom mestu"
        ordering = ("job_role", "order", "id")

    def __str__(self) -> str:
        return f"{self.job_role.name}: {self.name}"


def normalize_role_name(name: str) -> str:
    import re
    text = (name or "").lower().strip()
    text = re.sub(r"[^0-9a-zšđčćžŠĐČĆŽ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


class RoleLzoTemplate(models.Model):
    role_name = models.CharField(max_length=255)
    role_key = models.CharField(max_length=255, db_index=True)
    name = models.CharField(max_length=255)
    standard = models.CharField(max_length=255, blank=True)
    interval_months = models.PositiveIntegerField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Tipska LZO po radnom mestu"
        verbose_name_plural = "Tipska LZO po radnom mestu"
        ordering = ("role_name", "order", "id")

    def save(self, *args, **kwargs):
        self.role_key = normalize_role_name(self.role_name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.role_name}: {self.name}"
