from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DocumentAIFormatViewSet, DocumentCategoryViewSet, DocumentFileViewSet

app_name = "documents"

router = DefaultRouter()
router.register("categories", DocumentCategoryViewSet, basename="document-categories")
router.register("", DocumentFileViewSet, basename="documents")

urlpatterns = [
    path("formats/", DocumentAIFormatViewSet.as_view({"get": "list"}), name="document-ai-formats"),
    path("", include(router.urls)),
]
