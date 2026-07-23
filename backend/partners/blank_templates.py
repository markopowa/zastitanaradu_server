from dataclasses import dataclass

from documents.models import DocumentTemplate
from documents.utils import invalidate_page_images

from .document_generation import (
    KIND_CONFIG,
    KIND_LZO_REVERS,
    KIND_OBRAZAC6,
    KIND_POTVRDA_CLAN5,
)
from .models import JobRole, TrainingType


@dataclass(frozen=True)
class BlankTarget:
    model: type
    file_field: str
    fields_field: str
    master_template_name: str


BLANK_TARGETS: dict[str, BlankTarget] = {
    "job-role-obrazac6": BlankTarget(
        model=JobRole,
        file_field="obrazac6_template",
        fields_field="obrazac6_fields",
        master_template_name=KIND_CONFIG[KIND_OBRAZAC6]["template_name"],
    ),
    "job-role-lzo": BlankTarget(
        model=JobRole,
        file_field="lzo_revers_template",
        fields_field="lzo_revers_fields",
        master_template_name=KIND_CONFIG[KIND_LZO_REVERS]["template_name"],
    ),
    "training-type-potvrda": BlankTarget(
        model=TrainingType,
        file_field="potvrda_template",
        fields_field="potvrda_fields",
        master_template_name=KIND_CONFIG[KIND_POTVRDA_CLAN5]["template_name"],
    ),
}

JOB_ROLE_TPL_KEY_TO_TARGET = {
    "obrazac6": "job-role-obrazac6",
    "lzo-revers": "job-role-lzo",
}


def blank_cache_key(target: str, instance_id: int) -> str:
    return f"blank_{target}_{instance_id}"


def master_placeholders_for_target(target: BlankTarget) -> list:
    doc_template = DocumentTemplate.objects.filter(
        name=target.master_template_name,
    ).first()
    if not doc_template:
        return []
    generation_config = doc_template.generation_config or {}
    return generation_config.get("placeholders") or []


def invalidate_blank_cache(target_key: str, instance_id: int) -> None:
    invalidate_page_images(blank_cache_key(target_key, instance_id))
