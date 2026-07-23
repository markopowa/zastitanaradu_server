from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BlankTemplateFieldsView,
    BlankTemplatePagesStreamView,
    BlankTemplateRegeneratePagesView,
    CompanyRegistryLookupView,
    ClientCompanyViewSet,
    ClientIntakeLinkViewSet,
    ClientIntakeSubmissionViewSet,
    CompanyDocumentKindViewSet,
    CompanyDocumentViewSet,
    ComplianceFindingTypeViewSet,
    ContactPersonViewSet,
    EmployeeTrainingViewSet,
    EmployeeViewSet,
    EquipmentItemViewSet,
    HazardViewSet,
    JobRoleHazardViewSet,
    JobRoleLZOViewSet,
    JobRoleViewSet,
    KinneyScaleOptionViewSet,
    RoleLzoTemplateViewSet,
    RiskAssessmentActViewSet,
    RiskLevelViewSet,
    TrainingTypeViewSet,
    WorkInjuryViewSet,
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
router.register("contact-persons", ContactPersonViewSet,
                basename="contact-persons")
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
router.register(
    "work-injuries",
    WorkInjuryViewSet,
    basename="work-injuries",
)
router.register(
    "training-types",
    TrainingTypeViewSet,
    basename="training-types",
)
router.register(
    "employee-trainings",
    EmployeeTrainingViewSet,
    basename="employee-trainings",
)
router.register(
    "company-document-kinds",
    CompanyDocumentKindViewSet,
    basename="company-document-kinds",
)
router.register("hazards", HazardViewSet, basename="hazards")
router.register(
    "kinney-scale-options",
    KinneyScaleOptionViewSet,
    basename="kinney-scale-options",
)
router.register(
    "job-role-hazards",
    JobRoleHazardViewSet,
    basename="job-role-hazards",
)
router.register(
    "job-role-lzo",
    JobRoleLZOViewSet,
    basename="job-role-lzo",
)
router.register(
    "role-lzo-templates",
    RoleLzoTemplateViewSet,
    basename="role-lzo-templates",
)
router.register(
    "intake-links",
    ClientIntakeLinkViewSet,
    basename="intake-links",
)
router.register(
    "intake-submissions",
    ClientIntakeSubmissionViewSet,
    basename="intake-submissions",
)

urlpatterns = [
    path(
        "registry-lookup/",
        CompanyRegistryLookupView.as_view(),
        name="registry-lookup",
    ),
    path(
        "blank-templates/<str:target>/<int:pk>/pages/stream/",
        BlankTemplatePagesStreamView.as_view(),
        name="blank-template-pages-stream",
    ),
    path(
        "blank-templates/<str:target>/<int:pk>/regenerate-pages/",
        BlankTemplateRegeneratePagesView.as_view(),
        name="blank-template-regenerate-pages",
    ),
    path(
        "blank-templates/<str:target>/<int:pk>/fields/",
        BlankTemplateFieldsView.as_view(),
        name="blank-template-fields",
    ),
    path("", include(router.urls)),
]
