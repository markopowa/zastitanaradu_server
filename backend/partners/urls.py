from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ClientCompanyViewSet, EmployeeViewSet, EquipmentItemViewSet

app_name = "partners"

router = DefaultRouter()
router.register("client-companies", ClientCompanyViewSet,
                basename="client-companies")
router.register("employees", EmployeeViewSet, basename="employees")
router.register("equipment", EquipmentItemViewSet, basename="equipment")

urlpatterns = [
    path("", include(router.urls)),
]
