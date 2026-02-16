from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    EmployeeViewSet,
    TrainingAttendanceViewSet,
    TrainingProgramViewSet,
    TrainingSessionViewSet,
    TrainingTypeViewSet,
)


app_name = "trainings"

router = DefaultRouter()
router.register("employees", EmployeeViewSet, basename="employees")
router.register("types", TrainingTypeViewSet, basename="training-types")
router.register("programs", TrainingProgramViewSet, basename="training-programs")
router.register("sessions", TrainingSessionViewSet, basename="training-sessions")
router.register("attendance", TrainingAttendanceViewSet, basename="training-attendance")


urlpatterns = [
    path("", include(router.urls)),
]


