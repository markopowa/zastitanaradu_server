from django.urls import path

from .views import DocumentAIStatusView, RunAIProcessingView


app_name = "ai_processing"

urlpatterns = [
    path(
        "documents/<int:document_id>/run/",
        RunAIProcessingView.as_view(),
        name="ai-document-run",
    ),
    path(
        "documents/<int:document_id>/status/",
        DocumentAIStatusView.as_view(),
        name="ai-document-status",
    ),
]



