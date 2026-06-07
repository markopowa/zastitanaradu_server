from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    APRLookupView,
    ClientCompanyViewSet,
    CompanyDocumentViewSet,
    ComplianceFindingTypeViewSet,
    ContactPersonViewSet,
    EmployeeViewSet,
    EquipmentItemViewSet,
    JobRoleViewSet,
    RiskAssessmentActViewSet,
    RiskLevelViewSet,
)

app_name = "partners"

router = DefaultRouter()
router.register("client-companies", ClientCompanyViewSet,
                basename="client-companies")
router.register("employees", EmployeeViewSet, basename="employees")
router.register("equipment", EquipmentItemViewSet, basename="equipment")
router.register("risk-levels", RiskLevelViewSet, basename="risk-levels")
router.register(
    "compliance-finding-types",
    ComplianceFindingTypeViewSet,
    basename="compliance-finding-types",
)
router.register("job-roles", JobRoleViewSet, basename="job-roles")
router.register("contact-persons", ContactPersonViewSet, basename="contact-persons")
router.register(
    "company-documents",
    CompanyDocumentViewSet,
    basename="company-documents",
)
router.register(
    "risk-assessment-acts",
    RiskAssessmentActViewSet,
    basename="risk-assessment-acts",
)

urlpatterns = [
    path("apr-lookup/", APRLookupView.as_view(), name="apr-lookup"),
    path("", include(router.urls)),
]
