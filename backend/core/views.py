import os

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse
from django.views.decorators.clickjacking import xframe_options_sameorigin
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication


@api_view(["GET"])
@permission_classes([AllowAny])
def operator_info_view(request):
    return Response({"name": settings.OPERATOR_NAME})


def _authenticated_user(request):
    try:
        result = JWTAuthentication().authenticate(request)
    except AuthenticationFailed:
        return None
    if not result:
        return None
    user = result[0]
    return user if user.is_active else None


@xframe_options_sameorigin
def serve_media_attachment(request, path: str):
    if _authenticated_user(request) is None:
        return HttpResponse(status=401)
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
