from datetime import date

from django.utils import timezone
from rest_framework import serializers

JMBG_WEIGHTS = (7, 6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2)
MIN_BIRTH_YEAR = 1900


def _today():
    return timezone.localdate()


def validate_jmbg(value):
    v = (value or "").strip()
    if not v:
        return v
    if len(v) != 13 or not v.isdigit():
        raise serializers.ValidationError("JMBG mora imati tačno 13 cifara.")
    day = int(v[0:2])
    month = int(v[2:4])
    if not (1 <= day <= 31 and 1 <= month <= 12):
        raise serializers.ValidationError(
            "JMBG sadrži neispravan datum rođenja.")
    total = sum(int(v[i]) * JMBG_WEIGHTS[i] for i in range(12))
    remainder = 11 - (total % 11)
    control = 0 if remainder in (10, 11) else remainder
    if control != int(v[12]):
        raise serializers.ValidationError(
            "JMBG nije ispravan (kontrolna cifra se ne poklapa).")
    return v


def validate_pib(value):
    v = (value or "").strip()
    if len(v) != 9 or not v.isdigit():
        raise serializers.ValidationError("PIB mora imati tačno 9 cifara.")
    return v


def validate_maticni_broj(value):
    v = (value or "").strip()
    if not v:
        return v
    if len(v) != 8 or not v.isdigit():
        raise serializers.ValidationError(
            "Matični broj mora imati tačno 8 cifara.")
    return v


def validate_birth_date(value):
    if value is None:
        return value
    if value > _today():
        raise serializers.ValidationError(
            "Datum rođenja ne može biti u budućnosti.")
    if value.year < MIN_BIRTH_YEAR:
        raise serializers.ValidationError(
            f"Datum rođenja ne može biti pre {MIN_BIRTH_YEAR}. godine.")
    return value


def validate_not_future(value, label="Datum"):
    if value is None:
        return value
    if value > _today():
        raise serializers.ValidationError(
            f"{label} ne može biti u budućnosti.")
    return value
