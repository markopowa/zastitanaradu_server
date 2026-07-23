from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import RedirectView
from django.views.static import serve
from .views import operator_info_view, serve_media_attachment

admin.site.site_header = "Protivpozarna zastita i zastita na radu"
admin.site.site_title = "Protivpozarna zastita i zastita na radu"
admin.site.index_title = "Administracija"

urlpatterns = [
    path(
        "favicon.ico",
        RedirectView.as_view(url=settings.STATIC_URL +
                             "favicon.ico", permanent=True),
    ),
    path("admin/", admin.site.urls),
    path("api/operator-info/", operator_info_view, name="operator-info"),
    path("auth/", include(("authentication.urls", "authentication"), namespace="auth")),
    path(
        "api/documents/",
        include(("documents.urls", "documents"), namespace="documents"),
    ),
    path("api/ai/", include(("ai_processing.urls", "ai_processing"), namespace="ai")),
    path(
        "api/partners/",
        include(("partners.urls", "partners"), namespace="partners"),
    ),
    path(
        "api/processes/",
        include(("processes.urls", "processes"), namespace="processes"),
    ),
    path(
        "api/testing/",
        include(("testing.urls", "testing"), namespace="testing"),
    ),
    path(
        "intake/",
        include(("partners.urls_public", "partners_public"), namespace="partners_public"),
    ),
]

if settings.DEBUG:
    urlpatterns += [
        re_path(r"^media/(?P<path>.*)$", serve,
                {"document_root": settings.MEDIA_ROOT}),
    ]
else:
    urlpatterns += [
        re_path(r"^media/(?P<path>.*)$", serve_media_attachment),
    ]
