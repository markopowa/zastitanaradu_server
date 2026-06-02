from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ClientCompanyViewSet,
    EmployeeViewSet,
    EquipmentItemViewSet,
    JobRoleViewSet,
    RiskLevelViewSet,
)

app_name = "partners"

router = DefaultRouter()
router.register("client-companies", ClientCompanyViewSet,
                basename="client-companies")
router.register("employees", EmployeeViewSet, basename="employees")
router.register("equipment", EquipmentItemViewSet, basename="equipment")
router.register("risk-levels", RiskLevelViewSet, basename="risk-levels")
router.register("job-roles", JobRoleViewSet, basename="job-roles")

urlpatterns = [
    path("", include(router.urls)),
]
