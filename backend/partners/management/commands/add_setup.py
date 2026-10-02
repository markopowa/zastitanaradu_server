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
from partners.document_service import (
    AKT_PROCENA_RIZIKA,
    LZO_REVERS,
    MASTER_FILES,
    OBRAZAC1,
    OBRAZAC6,
    POTVRDA_CLAN5,
    PRAVILNIK_BZR,
    PROGRAM_PREDSTAVNICI,
    PROGRAM_RUKOVODIOCI,
    PROGRAM_ZAPOSLENI,
    RAD_OD_KUCE_ANEKS,
    RAD_OD_KUCE_IZJAVA,
    RAD_OD_KUCE_KONTROLNA_LISTA,
    RAD_OD_KUCE_TEST,
    RAD_OD_KUCE_UPUTSTVO,
    REGISTAR_RM,
    UPUT_PERIODICNI,
    UPUT_PRETHODNI,
    master_path,
)
from partners.models import CompanyDocument, CompanyDocumentKind, RiskLevel
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
    "Procena rizika",
    "Opšta akta i programi",
    "Rad od kuće",
]

EMPLOYEE = DocumentTemplate.CONTEXT_EMPLOYEE
COMPANY = DocumentTemplate.CONTEXT_CLIENT_COMPANY

DOCUMENT_TEMPLATE_SHELLS = [
    (UPUT_PRETHODNI, "Uput za prethodni lekarski pregled", EMPLOYEE,
     "Lekarski pregledi",
     "Uput poslodavca službi medicine rada pre početka rada na radnom mestu "
     "sa povećanim rizikom (Obrazac 1)."),
    (UPUT_PERIODICNI, "Uput za lekarski pregled", EMPLOYEE,
     "Lekarski pregledi",
     "Uput za periodični lekarski pregled zaposlenog na radnom mestu sa "
     "povećanim rizikom (Obrazac 2)."),
    (OBRAZAC6, "Obrazac 6, evidencija o obučenim zaposlenima", EMPLOYEE,
     "Osposobljavanje i obuke",
     "Evidencija o zaposlenom obučenom za bezbedan i zdrav rad i korišćenje "
     "lične zaštitne opreme."),
    (POTVRDA_CLAN5, "Potvrda o osposobljenosti za rad na opremi", EMPLOYEE,
     "Osposobljavanje i obuke",
     "Potvrda da je zaposleni osposobljen za bezbedno korišćenje opreme za "
     "rad."),
    (LZO_REVERS, "Karton zaduženja LZO (revers)", EMPLOYEE,
     "Lična zaštitna oprema",
     "Spisak lične zaštitne opreme koju je zaposleni zadužio."),
    (OBRAZAC1, "Obrazac 1, evidencija lekarskih pregleda", COMPANY,
     "Lekarski pregledi",
     "Evidencija o radnim mestima sa povećanim rizikom, zaposlenima na njima "
     "i njihovim lekarskim pregledima."),
    (REGISTAR_RM, "Evidencija radnih mesta sa povećanim rizikom", COMPANY,
     "Lekarski pregledi",
     "Spisak radnih mesta koja je Akt o proceni rizika utvrdio kao radna "
     "mesta sa povećanim rizikom."),
    (AKT_PROCENA_RIZIKA, "Akt o proceni rizika", COMPANY, "Procena rizika",
     "Akt o proceni rizika na radnom mestu i u radnoj sredini, po radnim "
     "mestima, sa zaključkom."),
    (PRAVILNIK_BZR, "Pravilnik o bezbednosti i zdravlju na radu", COMPANY,
     "Opšta akta i programi",
     "Opšti akt poslodavca o pravima, obavezama i odgovornostima u oblasti "
     "bezbednosti i zdravlja na radu."),
    (PROGRAM_ZAPOSLENI, "Program obuke zaposlenih", COMPANY,
     "Opšta akta i programi",
     "Program obuke zaposlenih za bezbedan i zdrav rad, opšti i posebni deo."),
    (PROGRAM_RUKOVODIOCI, "Program obuke rukovodilaca", COMPANY,
     "Opšta akta i programi", "Program obuke neposrednih rukovodilaca."),
    (PROGRAM_PREDSTAVNICI, "Program obuke predstavnika zaposlenih", COMPANY,
     "Opšta akta i programi", "Program obuke predstavnika zaposlenih za BZR."),
    (RAD_OD_KUCE_ANEKS, "Rad od kuće: aneks ugovora o radu", COMPANY,
     "Rad od kuće", "Aneks ugovora o radu za rad od kuće."),
    (RAD_OD_KUCE_KONTROLNA_LISTA, "Rad od kuće: kontrolna lista", COMPANY,
     "Rad od kuće", "Kontrolna lista uslova za rad od kuće."),
    (RAD_OD_KUCE_IZJAVA, "Rad od kuće: izjava zaposlenog", COMPANY,
     "Rad od kuće", "Izjava zaposlenog o uslovima rada od kuće."),
    (RAD_OD_KUCE_TEST, "Rad od kuće: test", COMPANY, "Rad od kuće",
     "Test provere znanja za rad od kuće."),
    (RAD_OD_KUCE_UPUTSTVO, "Rad od kuće: uputstvo za bezbedan rad", COMPANY,
     "Rad od kuće", "Uputstvo za bezbedan i zdrav rad od kuće."),
]

LEGACY_TEMPLATE_NAMES = {
    "Uput za prethodni lekarski pregled": UPUT_PRETHODNI,
    "Uput za lekarski pregled": UPUT_PERIODICNI,
    "Obrazac 6 — evidencija o osposobljenosti za bezbedan rad": OBRAZAC6,
    "Karton zaduženja LZO (revers)": LZO_REVERS,
    "Potvrda po članu 5": POTVRDA_CLAN5,
    "Obrazac 1 — evidencija lekarskih pregleda": OBRAZAC1,
    "Evidencija radnih mesta sa povećanim rizikom": REGISTAR_RM,
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
}
ROLE_ADMIN = "Admin"
ROLE_OPERATIVA = "Operativa"
ROLE_PREGLED = "Pregled"
ROLE_NAMES = [ROLE_ADMIN, ROLE_OPERATIVA, ROLE_PREGLED]

GENERATION_WIRING = [
    ("OSPOSOBLJAVANJE_BZR", OBRAZAC6),
    ("LZO_ZADUZENJE", LZO_REVERS),
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
            content_type__app_label="auth",
            content_type__model__in=("user", "group"),
        ).filter(
            Q(codename__startswith="view_")
            | Q(codename__startswith="add_")
            | Q(codename__startswith="change_")
        )
    return Permission.objects.none()


def _missing(existing_keys, wanted_keys):
    present = set(existing_keys)
    return [key for key in wanted_keys if key not in present]


class Command(BaseCommand):
    help = (
        "Inject everything we already know about the setup: risk levels, "
        "template field definitions, the obligation catalog (periodic "
        "obligations + expert-finding obligations), their reminder/email "
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
        parser.add_argument(
            "--replace-masters",
            action="store_true",
            help="Overwrite every template file with the master from the repo.",
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
            masters_attached = self._attach_master_templates(
                options["replace_masters"])
            previews_refreshed = self._refresh_template_previews()

        self.stdout.write(self.style.SUCCESS(
            f"Setup injected. {categories_created} document categories, "
            f"{shells_created} template shells, {roles_created} roles, "
            f"{wiring_created} generation wirings, "
            f"{kinds_created} company document kinds created, "
            f"{masters_attached} master template(s) attached, "
            f"{previews_refreshed} template preview cache(s) invalidated. "
            "Run with --dry-run to review, or see manual.md for the manual "
            "steps."
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
        for code, name, context_type, category_name, description in (
            DOCUMENT_TEMPLATE_SHELLS
        ):
            category = DocumentCategory.objects.filter(name=category_name).first()
            doc_tpl = DocumentTemplate.objects.filter(code=code).first()
            if doc_tpl is None:
                legacy = [n for n, c in LEGACY_TEMPLATE_NAMES.items() if c == code]
                doc_tpl = DocumentTemplate.objects.filter(
                    code__isnull=True, name__in=legacy + [name]).first()
            if doc_tpl is None:
                DocumentTemplate.objects.create(
                    code=code,
                    name=name,
                    context_type=context_type,
                    description=description,
                    category=category,
                    generation_config={},
                )
                created += 1
                continue
            doc_tpl.code = code
            doc_tpl.description = description
            doc_tpl.generation_config = {}
            if doc_tpl.category_id is None:
                doc_tpl.category = category
            doc_tpl.save(update_fields=[
                "code", "description", "generation_config", "category"])
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
            doc = DocumentTemplate.objects.filter(code=doc_name).first()
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

    def _attach_master_templates(self, replace):
        attached = 0
        for code in MASTER_FILES:
            doc_tpl = DocumentTemplate.objects.filter(code=code).first()
            path = master_path(code)
            if doc_tpl is None or not path.is_file():
                continue
            if doc_tpl.template_file and not replace:
                continue
            with open(path, "rb") as handle:
                doc_tpl.template_file.save(path.name, File(handle), save=True)
            attached += 1
        return attached

    def _dry_run(self):
        risk_codes = [item["code"] for item in RISK_LEVELS]
        field_keys = [key for key, _label, _cat in TEMPLATE_FIELDS]
        catalog_codes = [item["code"] for item in CATALOG]
        finding_pt_codes = [
            item["process_type"]["code"] for item in FINDING_TYPE_PROCESS_TYPES
        ]
        shell_codes = [code for code, *_ in DOCUMENT_TEMPLATE_SHELLS]
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
            ("Document categories", DOCUMENT_CATEGORIES, _missing(
                DocumentCategory.objects.values_list("name", flat=True),
                DOCUMENT_CATEGORIES)),
            ("Document template shells", shell_codes, _missing(
                DocumentTemplate.objects.filter(
                    code__in=shell_codes).values_list("code", flat=True),
                shell_codes)),
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
