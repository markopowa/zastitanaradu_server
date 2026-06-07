import os
from datetime import timedelta

from processes.models import ProcessBinding

from .models import CompanyComplianceFinding


def compliance_finding_row(finding_type, finding=None):
    base = {
        "finding_type": finding_type.id,
        "finding_type_name": finding_type.name,
        "finding_type_code": finding_type.code,
        "default_validity_months": finding_type.default_validity_months,
    }
    if finding is None or not finding.file:
        return {
            **base,
            "id": None,
            "file": None,
            "file_name": "",
            "issued_date": None,
            "valid_until": None,
            "status": CompanyComplianceFinding.STATUS_MISSING,
        }
    file_url = finding.file.url if finding.file else None
    file_name = ""
    if finding.file:
        base_name = os.path.basename(finding.file.name)
        file_name, _ = os.path.splitext(base_name)
    return {
        **base,
        "id": finding.id,
        "file": file_url,
        "file_name": file_name,
        "issued_date": finding.issued_date,
        "valid_until": finding.valid_until,
        "status": finding.status,
    }


def compute_valid_until(issued_date, finding_type):
    if issued_date is None:
        return None
    months = finding_type.default_validity_months
    return issued_date + timedelta(days=months * 30)


def sync_compliance_finding_binding(finding):
    process_type = finding.finding_type.process_type
    if process_type is None:
        return None
    from processes.tasks import (
        ensure_process_run_for_binding,
        process_lead_for_run,
    )

    binding = finding.process_binding
    if binding is None:
        binding = ProcessBinding.objects.filter(
            process_type=process_type,
            subject_kind=ProcessBinding.SUBJECT_CLIENT_COMPANY,
            client_company=finding.client_company,
        ).first()
    if binding is None:
        binding = ProcessBinding.objects.create(
            process_type=process_type,
            subject_kind=ProcessBinding.SUBJECT_CLIENT_COMPANY,
            client_company=finding.client_company,
            next_run_at=finding.valid_until,
            lead_time_days=process_type.lead_time_days,
            is_active=True,
        )
    else:
        binding.next_run_at = finding.valid_until
        binding.is_active = True
        if binding.lead_time_days is None:
            binding.lead_time_days = process_type.lead_time_days
        binding.save(
            update_fields=["next_run_at", "is_active", "lead_time_days"],
        )
    finding.process_binding = binding
    finding.save(update_fields=["process_binding"])
    run = ensure_process_run_for_binding(binding)
    if run:
        process_lead_for_run(run, binding)
    return binding


def deactivate_compliance_finding_binding(finding):
    binding = finding.process_binding
    if binding is None:
        return
    from processes.tasks import cancel_open_runs_for_binding

    binding.is_active = False
    binding.save(update_fields=["is_active"])
    cancel_open_runs_for_binding(binding)
    finding.process_binding = None
    finding.save(update_fields=["process_binding"])
