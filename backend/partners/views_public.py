from django.http import Http404
from django.shortcuts import get_object_or_404, render

from .models import ClientIntakeSubmission, ClientIntakeLink

EMPLOYEE_FIELDS = (
    "first_name",
    "last_name",
    "position",
    "national_id",
    "date_of_birth",
    "email",
)
EMPLOYEE_REQUIRED = ("first_name", "last_name")

EQUIPMENT_FIELDS = (
    "name",
    "category",
    "inventory_number",
    "location",
)
EQUIPMENT_REQUIRED = ("name",)


def _get_valid_link(token: str) -> ClientIntakeLink:
    link = get_object_or_404(ClientIntakeLink, token=token)
    if not link.is_valid:
        raise Http404("Link nije aktivan.")
    return link


def intake_form_view(request, token: str):
    link = _get_valid_link(token)
    kind = ""
    values = {}
    error = None

    if request.method == "POST":
        kind = request.POST.get("kind", "")
        if kind == ClientIntakeSubmission.KIND_EMPLOYEE:
            fields, required = EMPLOYEE_FIELDS, EMPLOYEE_REQUIRED
        elif kind == ClientIntakeSubmission.KIND_EQUIPMENT:
            fields, required = EQUIPMENT_FIELDS, EQUIPMENT_REQUIRED
        else:
            fields, required = (), ()
            error = "Izaberite tip prijave."

        values = {field: (request.POST.get(field) or "").strip() for field in fields}

        if error is None:
            missing = [field for field in required if not values.get(field)]
            if missing:
                error = "Popunite obavezna polja označena zvezdicom."
            else:
                ClientIntakeSubmission.objects.create(
                    link=link,
                    kind=kind,
                    data=values,
                )
                return render(
                    request,
                    "intake/thank_you.html",
                    {"company": link.client_company},
                )

    return render(
        request,
        "intake/form.html",
        {
            "company": link.client_company,
            "token": token,
            "kind": kind,
            "values": values,
            "error": error,
        },
    )
