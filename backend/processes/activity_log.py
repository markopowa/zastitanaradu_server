from .models import ActivityLog


def log_activity(
    event_type: str,
    description: str,
    *,
    user=None,
    process_run=None,
    process_binding=None,
    extra_data: dict | None = None,
) -> None:
    try:
        ActivityLog.objects.create(
            event_type=event_type,
            description=description,
            user=user,
            process_run=process_run,
            process_binding=process_binding,
            extra_data=extra_data or {},
        )
    except Exception:
        pass
