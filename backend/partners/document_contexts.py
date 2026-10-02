from django.conf import settings
from django.db import transaction
from django.utils import timezone

from processes.date_format import format_date_display
from processes.models import CodeSequence, ProcessRun

from .hazard_codes import TRAINING_REASONS, hazard_group

TRAINING_CODE = "OSPOSOBLJAVANJE_BZR"
LZO_CODE = "LZO_ZADUZENJE"
PRELIMINARY_EXAM_CODE = "PRETHODNI_LEKARSKI"
PERIODIC_EXAM_CODE = "LEKARSKI_PREGLED"
MEDICAL_CODES = (PRELIMINARY_EXAM_CODE, PERIODIC_EXAM_CODE)
OBRAZAC1_EMPTY_ROWS = 2


def fmt(value):
    if not value:
        return ""
    if isinstance(value, str):
        return format_date_display(value)
    return value.strftime("%d.%m.%Y.")


def _lines(text):
    return [line.strip() for line in (text or "").splitlines() if line.strip()]


def director_name(company):
    persons = list(company.contact_persons.all())
    directors = [p for p in persons if p.role == "DIRECTOR"]
    chosen = next((p for p in directors if p.is_primary), None)
    if chosen is None and directors:
        chosen = directors[0]
    return chosen.full_name if chosen else ""


def act_context(company):
    act = getattr(company, "risk_assessment_act", None) if company else None
    number = getattr(act, "act_number", "") if act else ""
    act_date = getattr(act, "act_date", None) if act else None
    if act_date is None and company is not None:
        act_date = company.risk_assessment_act_date
    date_text = fmt(act_date)
    label = company.name if company else ""
    if number:
        label += f", broj {number}"
    if date_text:
        label += f" od {date_text}"
    return {"number": number, "date": date_text, "label": label}


def client_context(company):
    if company is None:
        return {}
    return {
        "name": company.name,
        "address": company.address or "",
        "tax_id": company.tax_id or "",
        "registration_number": company.registration_number or "",
        "activity_code": company.activity_code or "",
        "email": company.email or "",
        "phone": company.phone or "",
        "director": director_name(company),
    }


def _hazard_row(index, jrh):
    hazard = jrh.hazard
    from .kinney import category_label

    return {
        "rbr": f"{index}.",
        "code": hazard.official_code or "",
        "label": hazard.label,
        "description": hazard.description or "",
        "kind": hazard.get_kind_display(),
        "verovatnoca": _number(jrh.verovatnoca),
        "izlozenost": _number(jrh.izlozenost),
        "posledica": _number(jrh.posledica),
        "rizik": _number(jrh.rizik),
        "category": category_label(jrh.risk_category),
        "mere": jrh.mere or "",
    }


def _number(value):
    if value is None:
        return ""
    if float(value).is_integer():
        return str(int(value))
    return f"{value:g}".replace(".", ",")


def _lzo_row(index, item, training_date=""):
    if item.interval_months:
        duration = f"{item.interval_months} meseci"
    else:
        duration = "Po potrebi"
    return {
        "rbr": f"{index}.",
        "name": item.name,
        "standard": item.standard or "",
        "duration": duration,
        "description": item.description or "",
        "quantity": str(item.quantity or 1),
        "training_date": training_date,
    }


def role_context(role, lzo_training_date=""):
    if role is None:
        return {
            "name": "", "description": "", "description_lines": [],
            "hazards": [], "hazard_groups": [], "hazards_text": "",
            "lzo": [], "has_lzo": False, "measures": "",
            "special_health_conditions": "", "supervised_roles": "/",
            "is_high_risk": False, "risk_level": "",
        }
    hazards = sorted(
        role.hazards.select_related("hazard").all(),
        key=lambda h: (h.hazard.official_code or "99", h.order, h.id),
    )
    rows = [_hazard_row(i, h) for i, h in enumerate(hazards, start=1)]
    groups = {}
    for jrh, row in zip(hazards, rows):
        number, title = hazard_group(jrh.hazard.official_code)
        group = groups.setdefault(
            number, {"number": number, "title": f"{number}. {title}", "hazards": []})
        group["hazards"].append(row)
    hazard_groups = [groups[k] for k in sorted(groups)]
    measures = role.safety_measures.strip() if role.safety_measures else ""
    if not measures:
        measures = "\n".join(
            row["mere"] for row in rows if row["mere"].strip())
    lzo_items = list(role.lzo_items.all().order_by("order", "id"))
    return {
        "name": role.name,
        "description": role.description or "",
        "description_lines": [{"text": line} for line in _lines(role.description)],
        "hazards": rows,
        "hazard_groups": hazard_groups,
        "hazards_text": "\n".join(
            f"{row['code']} {row['label']}".strip() for row in rows),
        "lzo": [
            _lzo_row(i, item, lzo_training_date)
            for i, item in enumerate(lzo_items, start=1)
        ],
        "has_lzo": bool(lzo_items),
        "measures": measures,
        "special_health_conditions": role.special_health_conditions or "",
        "supervised_roles": role.supervised_roles.strip() or "/",
        "is_high_risk": role.is_high_risk,
        "risk_level": role.risk_level.label if role.risk_level_id else "",
    }


def employee_context(employee):
    names = [employee.first_name, employee.father_name, employee.last_name]
    return {
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "father_name": employee.father_name or "",
        "full_name": f"{employee.first_name} {employee.last_name}".strip(),
        "full_name_with_father": " ".join(n for n in names if n),
        "national_id": employee.national_id or "",
        "date_of_birth": fmt(employee.date_of_birth),
        "year_of_birth": (
            str(employee.date_of_birth.year) if employee.date_of_birth else ""),
        "place_of_birth": employee.place_of_birth or "",
        "occupation": employee.occupation or "",
    }


def _completed_runs(employee, codes):
    return ProcessRun.objects.filter(
        process_binding__employee=employee,
        process_type__code__in=codes,
        status=ProcessRun.STATUS_COMPLETED,
    ).order_by("performed_at", "id")


def run_context(run):
    if run is None:
        return {"scheduled_for": "", "performed_at": "", "valid_until": ""}
    data = run.result_data or {}
    return {
        "scheduled_for": fmt(run.scheduled_for),
        "performed_at": fmt(run.performed_at),
        "valid_until": fmt(run.valid_until),
        "report_number": data.get("report_number", ""),
        "fitness": data.get("fitness_assessment", ""),
        "measures": data.get("measures_taken", ""),
        "institution": data.get("health_institution", ""),
        "notes": run.notes or "",
    }


def _instruction_number(run, company):
    data = dict(run.result_data or {})
    if data.get("instruction_number"):
        return data["instruction_number"], data.get("instruction_date", "")
    today = timezone.localdate()
    with transaction.atomic():
        sequence, _ = CodeSequence.objects.select_for_update().get_or_create(
            name=f"uput-{company.id if company else 0}-{today.year}")
        sequence.value += 1
        sequence.save(update_fields=["value"])
    number = f"{sequence.value}/{today.year}"
    data["instruction_number"] = number
    data["instruction_date"] = fmt(today)
    run.result_data = data
    run.save(update_fields=["result_data"])
    return number, data["instruction_date"]


def _uput_context(employee, run):
    company = employee.client_company
    if run is not None:
        number, issued = _instruction_number(run, company)
    else:
        number, issued = "", fmt(timezone.localdate())
    previous = _completed_runs(employee, MEDICAL_CODES)
    if run is not None:
        previous = previous.exclude(id=run.id)
    last = previous.last()
    last_data = (last.result_data or {}) if last else {}
    return {
        "uput": {
            "number": number,
            "date": issued,
            "exam_date": fmt(run.scheduled_for) if run else "",
        },
        "previous_exam": {
            "date": fmt(last.performed_at) if last else "",
            "institution": last_data.get("health_institution", ""),
            "fitness": last_data.get("fitness_assessment", ""),
        },
    }


def _training_context(employee, training_run, lzo_run, training_type=None):
    completed = list(_completed_runs(employee, [TRAINING_CODE]))
    run = training_run if training_run is not None else (
        completed[-1] if completed else None)
    data = (run.result_data or {}) if run else {}
    reason = data.get("training_reason")
    if not reason:
        earlier = [r for r in completed if run is None or r.id != run.id]
        reason = "09" if earlier and run is not None else "01"
    performed = fmt(run.performed_at) if run and run.performed_at else ""
    lzo_date = ""
    if lzo_run is not None and lzo_run.performed_at:
        lzo_date = fmt(lzo_run.performed_at)
    elif performed:
        lzo_date = performed
    return {
        "reason_code": reason,
        "reason": TRAINING_REASONS.get(reason, ""),
        "theory_date": data.get("theory_date") or performed,
        "practice_date": data.get("practice_date") or performed,
        "theory_check_date": data.get("theory_check_date") or performed,
        "practice_check_date": data.get("practice_check_date") or performed,
        "lzo_date": lzo_date,
        "type_name": training_type.name if training_type else "",
    }


def common_context(company):
    return {
        "client": client_context(company),
        "act": act_context(company),
        "today": fmt(timezone.localdate()),
        "savetnik": {"organization": getattr(settings, "OPERATOR_NAME", "")},
    }


def employee_document_context(employee, run=None, training_type=None):
    company = employee.client_company
    lzo_runs = _completed_runs(employee, [LZO_CODE])
    lzo_run = lzo_runs.last()
    context = common_context(company)
    training_run = run if (
        run is not None and run.process_type.code == TRAINING_CODE) else None
    training = _training_context(employee, training_run, lzo_run, training_type)
    context.update({
        "employee": employee_context(employee),
        "role": role_context(employee.job_role, training["lzo_date"]),
        "run": run_context(run),
        "training": training,
    })
    if run is None or run.process_type.code in MEDICAL_CODES:
        context.update(_uput_context(employee, run))
    return context


def _exam_interval(employee, periodic_runs):
    from processes.models import ProcessType
    from processes.period_resolution import resolve_period_months

    if periodic_runs:
        binding = periodic_runs[-1].process_binding
        months = binding.custom_period_months or resolve_period_months(
            periodic_runs[-1].process_type, employee)
    else:
        process_type = ProcessType.objects.filter(code=PERIODIC_EXAM_CODE).first()
        months = resolve_period_months(process_type, employee) if process_type else None
    return str(months) if months else ""


def _exam_rows(company):
    from .models import Employee

    employees = Employee.objects.filter(client_company=company).select_related(
        "job_role__risk_level").order_by("job_role__name", "last_name", "first_name")
    rows = []
    number = 0
    for employee in employees:
        runs = list(_completed_runs(employee, MEDICAL_CODES).select_related(
            "process_type", "process_binding"))
        if not runs and not (employee.is_employed and employee.is_high_risk):
            continue
        number += 1
        preliminary = [r for r in runs if r.process_type.code == PRELIMINARY_EXAM_CODE]
        periodic = [r for r in runs if r.process_type.code == PERIODIC_EXAM_CODE]
        open_run = ProcessRun.objects.filter(
            process_binding__employee=employee,
            process_type__code__in=MEDICAL_CODES,
            status__in=(ProcessRun.STATUS_PENDING, ProcessRun.STATUS_SENT),
        ).order_by("scheduled_for").first()
        interval = _exam_interval(employee, periodic)
        entries = [("Prethodni", preliminary[-1] if preliminary else None)]
        entries += [("Periodični", r) for r in periodic]
        entries += [("Periodični", None)] * OBRAZAC1_EMPTY_ROWS
        last_completed = runs[-1] if runs else None
        for index, (kind, run) in enumerate(entries):
            data = (run.result_data or {}) if run else {}
            is_last = run is not None and run is last_completed
            next_date = ""
            if is_last:
                next_date = fmt(run.valid_until) or (
                    fmt(open_run.scheduled_for) if open_run else "")
            rows.append({
                "rbr": f"{number}." if index == 0 else "",
                "role_name": (employee.job_role.name if employee.job_role_id else "")
                if index == 0 else "",
                "employee_name": f"{employee.first_name} {employee.last_name}"
                if index == 0 else "",
                "interval": interval if index == 0 else "",
                "kind": kind,
                "date": fmt(run.performed_at) if run else "",
                "next_date": next_date,
                "report_number": data.get("report_number", ""),
                "fitness": data.get("fitness_assessment", ""),
                "measures": data.get("measures_taken", ""),
            })
    return rows


def company_document_context(company):
    from .models import JobRole

    context = common_context(company)
    roles = []
    for role in JobRole.objects.filter(client_company=company).select_related(
            "risk_level").order_by("name"):
        ctx = role_context(role)
        employees = [e for e in role.employees.all() if e.is_employed]
        ctx["employee_count"] = str(len(employees))
        ctx["employees"] = [
            {"full_name": f"{e.first_name} {e.last_name}"} for e in employees]
        ctx["hazard_codes"] = ", ".join(
            sorted({h["code"] for h in ctx["hazards"] if h["code"]}))
        roles.append(ctx)
    for index, role in enumerate(roles, start=1):
        role["rbr"] = f"{index}."
    high = [dict(r) for r in roles if r["is_high_risk"]]
    for index, role in enumerate(high, start=1):
        role["rbr"] = f"{index}."
    context.update({
        "roles": roles,
        "high_risk_roles": high,
        "has_high_risk_roles": bool(high),
        "exams": _exam_rows(company),
        "employee_total": str(sum(int(r["employee_count"]) for r in roles)),
    })
    return context


def preview_context():
    hazard = {
        "rbr": "1.", "code": "03", "label": "Unutrašnji transport",
        "description": "", "kind": "Opasnost", "verovatnoca": "3",
        "izlozenost": "6", "posledica": "15", "rizik": "270",
        "category": "Visok rizik, hitne mere",
        "mere": "Ograničiti brzinu kretanja viljuškara.",
    }
    lzo = {
        "rbr": "1.", "name": "Zaštitne cipele", "standard": "SRPS EN ISO 20345",
        "duration": "12 meseci", "description": "S3", "quantity": "1",
        "training_date": "20.06.2025.",
    }
    role = {
        "rbr": "1.", "name": "Viljuškarista",
        "description": "Utovar i istovar robe\nUpravljanje viljuškarom",
        "description_lines": [
            {"text": "Utovar i istovar robe"}, {"text": "Upravljanje viljuškarom"}],
        "hazards": [hazard],
        "hazard_groups": [{
            "number": 1,
            "title": "1. MEHANIČKE OPASNOSTI KOJE SE POJAVLJUJU KORIŠĆENJEM "
                     "OPREME ZA RAD",
            "hazards": [hazard],
        }],
        "hazards_text": "03 Unutrašnji transport",
        "lzo": [lzo], "has_lzo": True,
        "measures": "Koristiti propisanu ličnu zaštitnu opremu.",
        "special_health_conditions": "Zdravstvena sposobnost za upravljanje "
                                     "viljuškarom.",
        "supervised_roles": "/", "is_high_risk": True, "risk_level": "Povećan",
        "employee_count": "1", "employees": [{"full_name": "Petar Petrović"}],
        "hazard_codes": "03",
    }
    return {
        "client": {
            "name": "Primer d.o.o.", "address": "Ulica 1, Beograd",
            "tax_id": "100000001", "registration_number": "20000001",
            "activity_code": "1071", "email": "office@primer.rs",
            "phone": "011 000 000", "director": "Direktor Direktorović",
        },
        "act": {"number": "12/2025", "date": "01.03.2025.",
                "label": "Primer d.o.o., broj 12/2025 od 01.03.2025."},
        "today": fmt(timezone.localdate()),
        "savetnik": {"organization": getattr(settings, "OPERATOR_NAME", "")},
        "employee": {
            "first_name": "Petar", "last_name": "Petrović", "father_name": "Marko",
            "full_name": "Petar Petrović",
            "full_name_with_father": "Petar Marko Petrović",
            "national_id": "0101985710123", "date_of_birth": "01.01.1985.",
            "year_of_birth": "1985", "place_of_birth": "Beograd",
            "occupation": "Vozač",
        },
        "role": role,
        "run": {"scheduled_for": "12.06.2026.", "performed_at": "20.06.2025.",
                "valid_until": "20.06.2026.", "report_number": "1250/25",
                "fitness": "sposoban", "measures": "", "institution":
                "Služba medicine rada", "notes": ""},
        "training": {
            "reason_code": "01", "reason": TRAINING_REASONS["01"],
            "theory_date": "20.06.2025.", "practice_date": "20.06.2025.",
            "theory_check_date": "20.06.2025.",
            "practice_check_date": "20.06.2025.", "lzo_date": "20.06.2025.",
            "type_name": "Rukovanje viljuškarom",
        },
        "uput": {"number": "1/2026", "date": "02.06.2026.",
                 "exam_date": "12.06.2026."},
        "previous_exam": {"date": "12.06.2025.",
                          "institution": "Služba medicine rada",
                          "fitness": "sposoban"},
        "roles": [role], "high_risk_roles": [role], "has_high_risk_roles": True,
        "exams": [{
            "rbr": "1.", "role_name": "Viljuškarista",
            "employee_name": "Petar Petrović", "interval": "12",
            "kind": "Prethodni", "date": "12.06.2025.",
            "next_date": "12.06.2026.", "report_number": "1250/25",
            "fitness": "sposoban", "measures": "",
        }],
        "employee_total": "1",
    }
