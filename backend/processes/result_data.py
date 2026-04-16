_LEGACY_RUN_RESULT_KEYS = (
    ("broj_izvestaja", "report_number"),
    ("ocena_sposobnosti", "fitness_assessment"),
    ("preduzete_mere", "measures_taken"),
)

_LEGACY_SNAPSHOT_EMPLOYEE_NATIONAL_ID_KEYS = ("national_id", "jmbg")
_LEGACY_SNAPSHOT_CLIENT_TAX_ID_KEYS = ("tax_id", "pib")


def _first_non_empty_string(mapping, keys):
    for key in keys:
        val = mapping.get(key)
        if val:
            return str(val)
    return ""


def normalize_employee_snapshot_national_id(employee):
    if not isinstance(employee, dict):
        return employee
    merged = dict(employee)
    merged["national_id"] = _first_non_empty_string(
        employee,
        _LEGACY_SNAPSHOT_EMPLOYEE_NATIONAL_ID_KEYS,
    )
    return merged


def normalize_client_snapshot_tax_id(block):
    if not isinstance(block, dict):
        return block
    merged = dict(block)
    merged["tax_id"] = _first_non_empty_string(
        block,
        _LEGACY_SNAPSHOT_CLIENT_TAX_ID_KEYS,
    )
    return merged


def normalize_process_run_result_data(data):
    if data is None:
        return None
    if not isinstance(data, dict):
        return data
    out = dict(data)
    for old_key, new_key in _LEGACY_RUN_RESULT_KEYS:
        if old_key in out:
            prev_new = out.get(new_key)
            if prev_new in (None, "") and out[old_key] not in (None, ""):
                out[new_key] = out[old_key]
            del out[old_key]
    return out
