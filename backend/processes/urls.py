from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DashboardExpiringView,
    EmployeeSendNowView,
    ProcessBindingViewSet,
    ProcessRunViewSet,
    ProcessTemplateViewSet,
    ProcessTypeViewSet,
    TaskAssignmentViewSet,
)

app_name = "processes"

router = DefaultRouter()
router.register("types", ProcessTypeViewSet, basename="process-types")
router.register("templates", ProcessTemplateViewSet,
                basename="process-templates")
router.register("bindings", ProcessBindingViewSet, basename="process-bindings")
router.register("runs", ProcessRunViewSet, basename="process-runs")
router.register("task-assignments", TaskAssignmentViewSet,
                basename="task-assignments")

urlpatterns = [
    path("dashboard/expiring", DashboardExpiringView.as_view(),
         name="dashboard-expiring"),
    path("employees/<int:pk>/send-now/", EmployeeSendNowView.as_view(),
         name="employee-send-now"),
    path("", include(router.urls)),
]
