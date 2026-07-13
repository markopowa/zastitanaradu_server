from django.contrib.auth.models import Group, Permission
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
from partners.management.commands.seed_compliance_finding_types import (
    FINDING_TYPE_PROCESS_TYPES,
)
from partners.management.commands.seed_obligation_catalog import CATALOG
from partners.models import ComplianceFindingType, RiskLevel
from processes.models import ProcessType, ProcessTemplate

UPUT_TEMPLATE_NAME = "Uput za lekarski pregled"
UPUT_CATEGORY_NAME = "Lekarski pregledi"

DOCUMENT_CATEGORIES = [
    "Lekarski pregledi",
    "Osposobljavanje i obuke",
    "Lična zaštitna oprema",
]

OBRAZAC6_CELL_MAP = {
    "mode": "DOCX_CELL_MAP",
    "cells": [
        {"table": 0, "row": 0, "col": 2, "fieldKey": "employee.full_name"},
        {"table": 0, "row": 6, "col": 0, "fieldKey": "performed_at"},
        {"table": 0, "row": 6, "col": 1, "fieldKey": "performed_at"},
        {"table": 0, "row": 6, "col": 2, "fieldKey": "performed_at"},
        {"table": 0, "row": 6, "col": 3, "fieldKey": "performed_at"},
    ],
}

DOCUMENT_TEMPLATE_SHELLS = [
    {
        "name": "Obrazac 6 — evidencija o osposobljenosti za bezbedan rad",
        "context_type": DocumentTemplate.CONTEXT_EMPLOYEE,
        "category": "Osposobljavanje i obuke",
        "description": (
            "Blanko obrazac 6 (osposobljavanje). Blanko po radnom mestu se "
            "kači na JobRole; popunjava se imenom i datumima u ćelije."
        ),
        "generation_config": OBRAZAC6_CELL_MAP,
    },
    {
        "name": "Karton zaduženja LZO (revers)",
        "context_type": DocumentTemplate.CONTEXT_EMPLOYEE,
        "category": "Lična zaštitna oprema",
        "description": (
            "Blanko revers za ličnu zaštitnu opremu. Dodati fajl i "
            "obeležiti polja."
        ),
    },
    {
        "name": "Potvrda po članu 5",
        "context_type": DocumentTemplate.CONTEXT_EMPLOYEE,
        "category": "Osposobljavanje i obuke",
        "description": "Blanko potvrda po članu 5. Dodati fajl i obeležiti polja.",
    },
]

RELEVANT_APPS = ("auth", "documents", "partners", "processes")
WORK_APPS = ("documents", "partners", "processes")
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
            categories_created = self._create_categories()
            shells_created = self._create_template_shells()
            self._link_uput_category()
            roles_created = self._create_roles()
            wiring_created = self._wire_generation()

        self.stdout.write(self.style.SUCCESS(
            f"Setup injected. {categories_created} document categories, "
            f"{shells_created} template shells, {roles_created} roles, "
            f"{wiring_created} generation wirings created "
            "(add template files and mark fields afterwards). Run with "
            "--dry-run to review, or see manual.md for the manual steps."
        ))

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
            _, was_created = DocumentTemplate.objects.get_or_create(
                name=tpl["name"],
                defaults={
                    "context_type": tpl["context_type"],
                    "description": tpl["description"],
                    "category": category,
                    "generation_config": tpl.get("generation_config") or {},
                },
            )
            created += int(was_created)
        return created

    def _link_uput_category(self):
        category = DocumentCategory.objects.filter(
            name=UPUT_CATEGORY_NAME).first()
        if category is None:
            return
        DocumentTemplate.objects.filter(
            name=UPUT_TEMPLATE_NAME, category__isnull=True
        ).update(category=category)

    def _create_roles(self):
        created = 0
        for name in ROLE_NAMES:
            group, was_created = Group.objects.get_or_create(name=name)
            if was_created:
                group.permissions.set(_role_permissions(name))
                created += 1
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

    def _dry_run(self):
        risk_codes = [item["code"] for item in RISK_LEVELS]
        field_keys = [key for key, _label, _cat in TEMPLATE_FIELDS]
        catalog_codes = [item["code"] for item in CATALOG]
        finding_pt_codes = [
            item["process_type"]["code"] for item in FINDING_TYPE_PROCESS_TYPES
        ]
        finding_codes = [item["code"] for item in FINDING_TYPE_PROCESS_TYPES]
        shell_names = [tpl["name"] for tpl in DOCUMENT_TEMPLATE_SHELLS]

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
        ]

        self.stdout.write("Dry run — would create the missing items below:")
        for label, wanted, missing in rows:
            self.stdout.write(
                f"  {label}: {len(missing)} missing of {len(wanted)}")
            for code in missing:
                self.stdout.write(f"      + {code}")

        uput_exists = DocumentTemplate.objects.filter(
            name=UPUT_TEMPLATE_NAME).exists()
        self.stdout.write(
            f"  Medical referral template ('{UPUT_TEMPLATE_NAME}'): "
            f"{'exists' if uput_exists else 'would be created'}"
        )
