from django.utils import timezone

from processes.models import ProcessBinding
from processes.tasks import ensure_process_run_for_binding


def _has_active_binding(process_type, equipment) -> bool:
    return ProcessBinding.objects.filter(
        process_type=process_type,
        subject_kind=ProcessBinding.SUBJECT_EQUIPMENT,
        equipment_item=equipment,
        is_active=True,
    ).exists()


def ensure_default_bindings_for_equipment(equipment) -> None:
    from .obligation_rules import is_required

    process_type = equipment.service_process_type
    if process_type is None or not equipment.is_active:
        return
    if not is_required(process_type, equipment.client_company):
        return
    if _has_active_binding(process_type, equipment):
        return

    binding = (
        ProcessBinding.objects.filter(
            process_type=process_type,
            subject_kind=ProcessBinding.SUBJECT_EQUIPMENT,
            equipment_item=equipment,
            is_active=False,
        )
        .order_by("-id")
        .first()
    )
    if binding is not None:
        binding.is_active = True
        if binding.next_run_at is None:
            binding.next_run_at = timezone.localdate()
        binding.save(update_fields=["is_active", "next_run_at"])
    else:
        binding = ProcessBinding.objects.create(
            process_type=process_type,
            subject_kind=ProcessBinding.SUBJECT_EQUIPMENT,
            equipment_item=equipment,
            is_active=True,
            next_run_at=timezone.localdate(),
        )
    ensure_process_run_for_binding(binding)
