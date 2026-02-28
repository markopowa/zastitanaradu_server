from .models import ProcessBinding


def binding_subject_snapshot(binding: ProcessBinding) -> dict:
    if binding.employee_id:
        e = binding.employee
        return {
            "kind": "EMPLOYEE",
            "id": e.id,
            "name": f"{e.first_name} {e.last_name}".strip(),
            "email": e.email or "",
        }
    if binding.equipment_item_id:
        eq = binding.equipment_item
        return {
            "kind": "EQUIPMENT",
            "id": eq.id,
            "name": eq.name,
            "inventory_number": eq.inventory_number or "",
        }
    if binding.client_company_id:
        c = binding.client_company
        return {"kind": "CLIENT_COMPANY", "id": c.id, "name": c.name, "email": c.email or ""}
    return {"kind": binding.subject_kind}
