from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

urlpatterns = [
    path("admin/", admin.site.urls),
    path("auth/", include(("authentication.urls", "authentication"), namespace="auth")),
    path(
        "api/documents/",
        include(("documents.urls", "documents"), namespace="documents"),
    ),
    path("api/ai/", include(("ai_processing.urls", "ai_processing"), namespace="ai")),
    path(
        "api/trainings/",
        include(("trainings.urls", "trainings"), namespace="trainings"),
    ),
]

if not settings.DEBUG:
    urlpatterns += [
        re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
    ]
