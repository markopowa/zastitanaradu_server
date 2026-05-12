import os

from django.conf import settings
from django.http import FileResponse, Http404


def serve_media_attachment(request, path: str):
    root = os.path.abspath(os.path.normpath(settings.MEDIA_ROOT))
    full_path = os.path.abspath(os.path.normpath(os.path.join(root, path)))
    if not full_path.startswith(root) or ".." in path:
        raise Http404("Invalid path")
    if not os.path.isfile(full_path):
        raise Http404("Not found")
    filename = os.path.basename(full_path)
    inline = request.GET.get("inline") == "1"
    return FileResponse(
        open(full_path, "rb"),
        as_attachment=not inline,
        filename=filename,
    )
