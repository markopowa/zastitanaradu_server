from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ActivityLogView,
    EmployeeSendNowView,
    NotificationOutboxViewSet,
    ProcessBindingViewSet,
    ProcessRunViewSet,
    ProcessTemplateViewSet,
    ProcessTypeViewSet,
    TaskAssignmentViewSet,
    UpcomingDeadlinesView,
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
router.register("outbox", NotificationOutboxViewSet, basename="outbox")

urlpatterns = [
    path("dashboard/activity-log", ActivityLogView.as_view(),
         name="dashboard-activity-log"),
    path("dashboard/upcoming-deadlines", UpcomingDeadlinesView.as_view(),
         name="dashboard-upcoming-deadlines"),
    path("employees/<int:pk>/send-now/", EmployeeSendNowView.as_view(),
         name="employee-send-now"),
    path("", include(router.urls)),
]
