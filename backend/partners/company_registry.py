import json
from datetime import date
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import CompanyRegistryEntry, CompanyRegistrySnapshot

BATCH_SIZE = 5000


def registry_snapshot_dir() -> Path:
    configured = getattr(settings, "COMPANY_REGISTRY_SNAPSHOT_DIR", None)
    if configured:
        return Path(configured)
    return Path(settings.MEDIA_ROOT) / "company_registry_snapshots"


def registry_opendata_url() -> str:
    return settings.COMPANY_REGISTRY_OPENDATA_URL


def download_registry_payload(url: str | None = None) -> dict:
    target = url or registry_opendata_url()
    request = Request(target, headers={"Accept": "application/json"})
    try:
        with urlopen(request, timeout=300) as response:
            raw = response.read()
    except URLError as exc:
        raise RuntimeError(f"Registry download failed: {exc}") from exc
    return json.loads(raw.decode("utf-8"))


def _parse_cut_off_date(value: str) -> date:
    return date.fromisoformat(value)


def _parse_founded_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _entry_from_row(registration_number: str, row: dict) -> CompanyRegistryEntry:
    return CompanyRegistryEntry(
        registration_number=registration_number.strip(),
        name=(row.get("PoslovnoIme") or "").strip(),
        municipality_code=(row.get("SifraOpstine") or "").strip(),
        municipality_name=(row.get("NazivOpstine") or "").strip(),
        status_name=(row.get("NazivStatus") or "").strip(),
        founded_date=_parse_founded_date(row.get("DatumOsnivanja")),
        legal_form_name=(row.get("NazivPravneForme") or "").strip(),
        activity_code=(row.get("SifraDelatnosti") or "").strip(),
    )


@transaction.atomic
def import_registry_payload(
    payload: dict,
    *,
    source_url: str,
    file_path: str = "",
) -> CompanyRegistrySnapshot:
    cut_off_raw = payload.get("DatumPreseka")
    podaci = payload.get("Podaci")
    if not cut_off_raw or not isinstance(podaci, dict):
        raise ValueError(
            "Invalid registry payload: expected DatumPreseka and Podaci")

    cut_off_date = _parse_cut_off_date(cut_off_raw)
    CompanyRegistrySnapshot.objects.filter(
        is_current=True).update(is_current=False)

    snapshot = CompanyRegistrySnapshot.objects.create(
        cut_off_date=cut_off_date,
        source_url=source_url,
        file_path=file_path,
        is_current=True,
    )

    batch: list[CompanyRegistryEntry] = []
    total = 0
    for registration_number, row in podaci.items():
        if not isinstance(row, dict):
            continue
        entry = _entry_from_row(registration_number, row)
        entry.snapshot = snapshot
        batch.append(entry)
        if len(batch) >= BATCH_SIZE:
            CompanyRegistryEntry.objects.bulk_create(
                batch, batch_size=BATCH_SIZE)
            total += len(batch)
            batch = []

    if batch:
        CompanyRegistryEntry.objects.bulk_create(batch, batch_size=BATCH_SIZE)
        total += len(batch)

    snapshot.company_count = total
    snapshot.save(update_fields=["company_count"])

    old_snapshots = CompanyRegistrySnapshot.objects.exclude(pk=snapshot.pk)
    CompanyRegistryEntry.objects.filter(snapshot__in=old_snapshots).delete()
    old_snapshots.delete()

    return snapshot


def sync_company_registry(*, url: str | None = None) -> CompanyRegistrySnapshot:
    source_url = url or registry_opendata_url()
    payload = download_registry_payload(source_url)

    cut_off_raw = payload.get(
        "DatumPreseka", timezone.now().date().isoformat())
    snapshot_dir = registry_snapshot_dir()
    snapshot_dir.mkdir(parents=True, exist_ok=True)
    file_name = f"companies_{cut_off_raw}.json"
    file_path = snapshot_dir / file_name
    file_path.write_text(
        json.dumps(payload, ensure_ascii=False),
        encoding="utf-8",
    )

    return import_registry_payload(
        payload,
        source_url=source_url,
        file_path=str(file_path),
    )


def lookup_company_by_registration_number(registration_number: str) -> dict | None:
    normalized = registration_number.strip()
    if not normalized:
        return None

    snapshot = (
        CompanyRegistrySnapshot.objects.filter(is_current=True)
        .order_by("-cut_off_date", "-downloaded_at")
        .first()
    )
    if snapshot is None:
        return None

    entry = (
        CompanyRegistryEntry.objects.filter(
            snapshot=snapshot,
            registration_number=normalized,
        )
        .first()
    )
    if entry is None:
        return None

    address = entry.municipality_name.strip()
    return {
        "name": entry.name,
        "registration_number": entry.registration_number,
        "address": address,
        "activity_code": entry.activity_code,
        "status": entry.status_name,
        "legal_form": entry.legal_form_name,
        "data_cut_off_date": snapshot.cut_off_date.isoformat(),
    }
