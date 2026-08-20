import json
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import Group, Permission
from django.core.files import File
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from documents.management.commands.fill_initial_template_fields_and_risk_levels import (
    RISK_LEVELS,
    TEMPLATE_FIELDS,
)
from documents.models import (
    DocumentCategory,
    DocumentTemplate,
    TemplateFieldDefinition,
)
from documents.utils import invalidate_page_images
from partners.management.commands.seed_compliance_finding_types import (
    FINDING_TYPE_PROCESS_TYPES,
)
from partners.management.commands.seed_obligation_catalog import CATALOG
from partners.models import CompanyDocument, CompanyDocumentKind, ComplianceFindingType, RiskLevel
from processes.models import ProcessType, ProcessTemplate

UPUT_TEMPLATE_NAMES = (
    "Uput za lekarski pregled",
    "Uput za prethodni lekarski pregled",
)
UPUT_CATEGORY_NAME = "Lekarski pregledi"

DOCUMENT_CATEGORIES = [
    "Lekarski pregledi",
    "Osposobljavanje i obuke",
    "Lična zaštitna oprema",
]

DOCX_PLACEHOLDER_CONFIG = {"mode": "DOCX_PLACEHOLDER"}

DOCUMENT_TEMPLATE_SHELLS = [
    {
        "name": "Obrazac 6 — evidencija o osposobljenosti za bezbedan rad",
        "context_type": DocumentTemplate.CONTEXT_EMPLOYEE,
        "category": "Osposobljavanje i obuke",
        "description": (
            "Evidencija da je zaposleni osposobljen za bezbedan i zdrav rad. "
            "Popunjava se automatski, iz blanko obrasca njegovog radnog mesta."
        ),
        "generation_config": DOCX_PLACEHOLDER_CONFIG,
    },
    {
        "name": "Karton zaduženja LZO (revers)",
        "context_type": DocumentTemplate.CONTEXT_EMPLOYEE,
        "category": "Lična zaštitna oprema",
        "description": (
            "Potvrda da je zaposlenom uručena lična zaštitna oprema, sa "
            "spiskom zaduženih komada. Popunjava se automatski, iz blanko "
            "obrasca njegovog radnog mesta."
        ),
        "generation_config": DOCX_PLACEHOLDER_CONFIG,
    },
    {
        "name": "Potvrda po članu 5",
        "context_type": DocumentTemplate.CONTEXT_EMPLOYEE,
        "category": "Osposobljavanje i obuke",
        "description": (
            "Potvrda da je zaposleni stručno osposobljen za bezbedan rad, "
            "za konkretnu vrstu obuke. Izdaje se na zahtev zaposlenog."
        ),
        "generation_config": DOCX_PLACEHOLDER_CONFIG,
    },
    {
        "name": "Obrazac 1 — evidencija lekarskih pregleda",
        "context_type": DocumentTemplate.CONTEXT_CLIENT_COMPANY,
        "category": "Lekarski pregledi",
        "description": (
            "Evidencija lekarskih pregleda zaposlenih na radnim mestima sa "
            "povećanim rizikom: ko je pregledan, kada i sa kojom ocenom. "
            "Sastavlja se automatski iz završenih pregleda firme."
        ),
        "generation_config": {
            "mode": "DOCX_PLACEHOLDER",
            "series": [
                {"source": "completed_medical_exams_for_company", "table": 0},
            ],
        },
    },
    {
        "name": "Evidencija radnih mesta sa povećanim rizikom",
        "context_type": DocumentTemplate.CONTEXT_CLIENT_COMPANY,
        "category": "Lekarski pregledi",
        "description": (
            "Spisak radnih mesta u firmi ocenjenih kao povećan rizik, sa "
            "zaposlenima koji na njima rade. Sastavlja se automatski iz "
            "podataka firme."
        ),
        "generation_config": {
            "mode": "DOCX_PLACEHOLDER",
            "series": [
                {"source": "high_risk_employees_for_company", "table": 0},
            ],
        },
    },
]

MASTER_TEMPLATE_GENERATION_CONFIG = {
    tpl["name"]: tpl["generation_config"]
    for tpl in DOCUMENT_TEMPLATE_SHELLS
    if tpl.get("generation_config")
}

MASTER_TEMPLATE_DIR_NAME = "master_templates"

MASTER_TEMPLATE_FILES = {
    "Uput za prethodni lekarski pregled": "uput_prethodni.docx",
    "Uput za lekarski pregled": "uput_periodicni.docx",
    "Obrazac 6 — evidencija o osposobljenosti za bezbedan rad": "obrazac6_master.docx",
    "Karton zaduženja LZO (revers)": "lzo_revers_master.docx",
    "Potvrda po članu 5": "potvrda_clan5_master.docx",
    "Obrazac 1 — evidencija lekarskih pregleda": "obrazac1_master.docx",
    "Evidencija radnih mesta sa povećanim rizikom": "registar_rm_master.docx",
}

RELEVANT_APPS = ("auth", "documents", "partners", "processes", "testing")
WORK_APPS = ("documents", "partners", "processes", "testing")
SETUP_MODELS = {
    "documenttemplate",
    "documentcategory",
    "templatefielddefinition",
    "documentaiformat",
    "documentfileaiformat",
    "processtype",
    "processtemplate",
    "codesequence",
    "risklevel",
    "compliancefindingtype",
}
ROLE_ADMIN = "Admin"
ROLE_OPERATIVA = "Operativa"
ROLE_PREGLED = "Pregled"
ROLE_NAMES = [ROLE_ADMIN, ROLE_OPERATIVA, ROLE_PREGLED]

GENERATION_WIRING = [
    ("OSPOSOBLJAVANJE_BZR",
     "Obrazac 6 — evidencija o osposobljenosti za bezbedan rad"),
    ("LZO_ZADUZENJE", "Karton zaduženja LZO (revers)"),
]

OPTIONAL_COMPANY_DOCUMENT_KINDS = {
    CompanyDocument.KIND_OCENA_MEDICINE_RADA,
    CompanyDocument.KIND_OBRAZAC1,
    CompanyDocument.KIND_HIGH_RISK_REGISTRY,
}


def _role_permissions(name):
    base = Permission.objects.exclude(content_type__model="permission")
    if name == ROLE_ADMIN:
        return base.filter(content_type__app_label__in=RELEVANT_APPS)
    if name == ROLE_OPERATIVA:
        return base.filter(
            content_type__app_label__in=WORK_APPS,
        ).filter(
            Q(codename__startswith="add_")
            | Q(codename__startswith="change_")
            | Q(codename__startswith="view_")
        ).exclude(content_type__model__in=SETUP_MODELS)
    if name == ROLE_PREGLED:
        return base.filter(
            content_type__app_label__in=WORK_APPS,
            codename__startswith="view_",
        )
    return Permission.objects.none()


def _missing(existing_keys, wanted_keys):
    present = set(existing_keys)
    return [key for key in wanted_keys if key not in present]


class Command(BaseCommand):
    help = (
        "Inject everything we already know about the setup: risk levels, "
        "template field definitions, the obligation catalog (periodic "
        "obligations + compliance finding types), their reminder/email "
        "triggers, the medical referral template, document categories, "
        "document template shells, and roles (Admin/Operativa/Pregled). "
        "Idempotent; existing rows and role permissions are left untouched. "
        "Files for document templates are added by hand — see manual.md."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what is missing without writing anything.",
        )

    def handle(self, *args, **options):
        if options["dry_run"]:
            self._dry_run()
            return

        with transaction.atomic():
            call_command("fill_initial_template_fields_and_risk_levels")
            call_command("seed_obligation_catalog")
            call_command("seed_compliance_finding_types")
            call_command("seed_role_lzo_templates")
            categories_created = self._create_categories()
            shells_created = self._create_template_shells()
            self._link_uput_category()
            roles_created = self._create_roles()
            wiring_created = self._wire_generation()
            kinds_created = self._seed_company_document_kinds()
            masters_attached, masters_synced = self._attach_master_templates()
            previews_refreshed = self._refresh_template_previews()

        self.stdout.write(self.style.SUCCESS(
            f"Setup injected. {categories_created} document categories, "
            f"{shells_created} template shells, {roles_created} roles, "
            f"{wiring_created} generation wirings, "
            f"{kinds_created} company document kinds created, "
            f"{masters_attached} master template(s) attached, "
            f"{masters_synced} generation config(s) synced (VISUAL where a "
            "placements.json sidecar exists, DOCX_PLACEHOLDER otherwise), "
            f"{previews_refreshed} template preview cache(s) invalidated "
            "(add template files and mark fields afterwards). Run with "
            "--dry-run to review, or see manual.md for the manual steps."
        ))

    def _refresh_template_previews(self):
        templates = DocumentTemplate.objects.exclude(
            template_file=""
        ).exclude(template_file__isnull=True)
        count = 0
        for tpl in templates:
            invalidate_page_images(tpl.pk)
            count += 1
        return count

    def _create_categories(self):
        created = 0
        for name in DOCUMENT_CATEGORIES:
            _, was_created = DocumentCategory.objects.get_or_create(name=name)
            created += int(was_created)
        return created

    def _create_template_shells(self):
        created = 0
        for tpl in DOCUMENT_TEMPLATE_SHELLS:
            category = DocumentCategory.objects.filter(
                name=tpl["category"]).first()
            doc_tpl, was_created = DocumentTemplate.objects.get_or_create(
                name=tpl["name"],
                defaults={
                    "context_type": tpl["context_type"],
                    "description": tpl["description"],
                    "category": category,
                    "generation_config": tpl.get("generation_config") or {},
                },
            )
            created += int(was_created)
            if not was_created and doc_tpl.description != tpl["description"]:
                doc_tpl.description = tpl["description"]
                doc_tpl.save(update_fields=["description"])
        return created

    def _link_uput_category(self):
        category = DocumentCategory.objects.filter(
            name=UPUT_CATEGORY_NAME).first()
        if category is None:
            return
        DocumentTemplate.objects.filter(
            name__in=UPUT_TEMPLATE_NAMES, category__isnull=True
        ).update(category=category)

    def _create_roles(self):
        created = 0
        for name in ROLE_NAMES:
            group, was_created = Group.objects.get_or_create(name=name)
            group.permissions.set(_role_permissions(name))
            created += int(was_created)
        return created

    def _wire_generation(self):
        created = 0
        for pt_code, doc_name in GENERATION_WIRING:
            pt = ProcessType.objects.filter(code=pt_code).first()
            doc = DocumentTemplate.objects.filter(name=doc_name).first()
            if pt is None or doc is None:
                continue
            obj, was_created = ProcessTemplate.objects.get_or_create(
                process_type=pt,
                trigger=ProcessTemplate.TRIGGER_ON_COMPLETED,
                document_template=doc,
                defaults={"generate_document": True},
            )
            if not obj.generate_document:
                obj.generate_document = True
                obj.save(update_fields=["generate_document"])
            created += int(was_created)
        return created

    def _seed_company_document_kinds(self):
        created = 0
        for order, (code, name) in enumerate(CompanyDocument.KIND_CHOICES):
            obj, was_created = CompanyDocumentKind.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "order": order,
                    "optional": code in OPTIONAL_COMPANY_DOCUMENT_KINDS,
                    "is_active": True,
                },
            )
            created += int(was_created)
        return created

    def _load_master_placements_sidecar(self, master_dir):
        sidecar_path = master_dir / "placements.json"
        if not sidecar_path.is_file():
            return {}
        try:
            return json.loads(sidecar_path.read_text())
        except (ValueError, OSError):
            return {}

    def _attach_master_templates(self):
        master_dir = Path(settings.BASE_DIR) / MASTER_TEMPLATE_DIR_NAME
        placements_sidecar = self._load_master_placements_sidecar(master_dir)
        attached = 0
        synced = 0
        for name, filename in MASTER_TEMPLATE_FILES.items():
            doc_tpl = DocumentTemplate.objects.filter(name=name).first()
            if doc_tpl is None:
                continue
            desired_config = placements_sidecar.get(name) or MASTER_TEMPLATE_GENERATION_CONFIG.get(
                name, DOCX_PLACEHOLDER_CONFIG,
            )
            has_file = bool(doc_tpl.template_file)
            file_attached_now = False
            if not has_file:
                master_path = master_dir / filename
                if master_path.is_file():
                    with open(master_path, "rb") as fh:
                        doc_tpl.template_file.save(
                            filename, File(fh), save=False,
                        )
                    has_file = True
                    file_attached_now = True
                    attached += 1
            if not has_file:
                continue
            mode_synced = doc_tpl.generation_config != desired_config
            if mode_synced:
                doc_tpl.generation_config = dict(desired_config)
                synced += 1
            if file_attached_now or mode_synced:
                doc_tpl.save()
        return attached, synced

    def _dry_run(self):
        risk_codes = [item["code"] for item in RISK_LEVELS]
        field_keys = [key for key, _label, _cat in TEMPLATE_FIELDS]
        catalog_codes = [item["code"] for item in CATALOG]
        finding_pt_codes = [
            item["process_type"]["code"] for item in FINDING_TYPE_PROCESS_TYPES
        ]
        finding_codes = [item["code"] for item in FINDING_TYPE_PROCESS_TYPES]
        shell_names = [tpl["name"] for tpl in DOCUMENT_TEMPLATE_SHELLS]
        kind_codes = [code for code, _name in CompanyDocument.KIND_CHOICES]

        rows = [
            ("Risk levels", risk_codes, _missing(
                RiskLevel.objects.values_list("code", flat=True), risk_codes)),
            ("Template fields", field_keys, _missing(
                TemplateFieldDefinition.objects.values_list("key", flat=True),
                field_keys)),
            ("Obligations (periodic)", catalog_codes, _missing(
                ProcessType.objects.values_list("code", flat=True),
                catalog_codes)),
            ("Finding process types", finding_pt_codes, _missing(
                ProcessType.objects.values_list("code", flat=True),
                finding_pt_codes)),
            ("Compliance finding types", finding_codes, _missing(
                ComplianceFindingType.objects.values_list("code", flat=True),
                finding_codes)),
            ("Document categories", DOCUMENT_CATEGORIES, _missing(
                DocumentCategory.objects.values_list("name", flat=True),
                DOCUMENT_CATEGORIES)),
            ("Document template shells", shell_names, _missing(
                DocumentTemplate.objects.filter(
                    name__in=shell_names).values_list("name", flat=True),
                shell_names)),
            ("Roles", ROLE_NAMES, _missing(
                Group.objects.values_list("name", flat=True), ROLE_NAMES)),
            ("Company document kinds", kind_codes, _missing(
                CompanyDocumentKind.objects.values_list("code", flat=True),
                kind_codes)),
        ]

        self.stdout.write("Dry run — would create the missing items below:")
        for label, wanted, missing in rows:
            self.stdout.write(
                f"  {label}: {len(missing)} missing of {len(wanted)}")
            for code in missing:
                self.stdout.write(f"      + {code}")

        uput_existing = set(
            DocumentTemplate.objects.filter(
                name__in=UPUT_TEMPLATE_NAMES
            ).values_list("name", flat=True)
        )
        uput_missing = [
            name for name in UPUT_TEMPLATE_NAMES if name not in uput_existing
        ]
        self.stdout.write(
            f"  Medical referral templates: {len(uput_missing)} missing of "
            f"{len(UPUT_TEMPLATE_NAMES)}"
        )
