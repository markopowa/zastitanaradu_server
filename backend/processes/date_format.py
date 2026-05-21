from datetime import date, datetime

SERBIAN_MONTH_NAMES = (
    "januar",
    "februar",
    "mart",
    "april",
    "maj",
    "jun",
    "jul",
    "avgust",
    "septembar",
    "oktobar",
    "novembar",
    "decembar",
)


def format_date_display(value: date | datetime | str | None) -> str:
    if not value:
        return ""
    if isinstance(value, str):
        trimmed = value.strip()
        if not trimmed:
            return ""
        try:
            parsed = date.fromisoformat(trimmed[:10])
        except ValueError:
            return trimmed
        value = parsed
    elif isinstance(value, datetime):
        value = value.date()
    day = value.day
    month = SERBIAN_MONTH_NAMES[value.month - 1]
    return f"{day}. {month} {value.year}."


def format_datetime_display(value: datetime | str | None) -> str:
    if not value:
        return ""
    if isinstance(value, str):
        trimmed = value.strip()
        if not trimmed:
            return ""
        try:
            parsed = datetime.fromisoformat(trimmed.replace("Z", "+00:00"))
        except ValueError:
            return trimmed
        value = parsed
    date_part = format_date_display(value.date())
    time_part = value.strftime("%H:%M")
    return f"{date_part} {time_part}"
