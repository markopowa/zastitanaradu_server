from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import TestAttemptViewSet, TestQuestionViewSet

app_name = "testing"

router = DefaultRouter()
router.register("questions", TestQuestionViewSet, basename="test-questions")
router.register("attempts", TestAttemptViewSet, basename="test-attempts")

urlpatterns = [
    path("", include(router.urls)),
]
