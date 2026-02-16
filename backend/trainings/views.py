from datetime import date, timedelta

from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Employee, TrainingAttendance, TrainingProgram, TrainingSession, TrainingType
from .serializers import (
    EmployeeSerializer,
    TrainingAttendanceSerializer,
    TrainingProgramSerializer,
    TrainingSessionSerializer,
    TrainingTypeSerializer,
)


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all().order_by("id")
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.DjangoModelPermissions]


class TrainingTypeViewSet(viewsets.ModelViewSet):
    queryset = TrainingType.objects.all().order_by("id")
    serializer_class = TrainingTypeSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(Q(code__icontains=search) | Q(name__icontains=search))
        return queryset


class TrainingProgramViewSet(viewsets.ModelViewSet):
    queryset = TrainingProgram.objects.all().order_by("id")
    serializer_class = TrainingProgramSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        training_type_id = self.request.query_params.get("training_type_id")
        if training_type_id:
            queryset = queryset.filter(training_type_id=training_type_id)
        return queryset


class TrainingSessionViewSet(viewsets.ModelViewSet):
    queryset = TrainingSession.objects.all().order_by("-session_date")
    serializer_class = TrainingSessionSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        training_type_id = self.request.query_params.get("training_type_id")
        from_date = self.request.query_params.get("from_date")
        to_date = self.request.query_params.get("to_date")
        if training_type_id:
            queryset = queryset.filter(training_type_id=training_type_id)
        if from_date:
            queryset = queryset.filter(session_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(session_date__lte=to_date)
        return queryset


class TrainingAttendanceViewSet(viewsets.ModelViewSet):
    queryset = TrainingAttendance.objects.select_related(
        "employee",
        "training_session",
        "training_session__training_type",
    ).all()
    serializer_class = TrainingAttendanceSerializer
    permission_classes = [permissions.DjangoModelPermissions]

    def get_queryset(self):
        queryset = super().get_queryset()
        employee_id = self.request.query_params.get("employee_id")
        training_type_id = self.request.query_params.get("training_type_id")
        from_valid_until = self.request.query_params.get("from_valid_until")
        to_valid_until = self.request.query_params.get("to_valid_until")
        status_param = self.request.query_params.get("status")
        today = date.today()
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if training_type_id:
            queryset = queryset.filter(training_session__training_type_id=training_type_id)
        if from_valid_until:
            queryset = queryset.filter(valid_until__gte=from_valid_until)
        if to_valid_until:
            queryset = queryset.filter(valid_until__lte=to_valid_until)
        if status_param:
            days_threshold = int(self.request.query_params.get("days", 30))
            soon_date = today + timedelta(days=days_threshold)
            if status_param == TrainingAttendance.STATUS_ACTIVE:
                queryset = queryset.filter(valid_until__gt=soon_date)
            if status_param == TrainingAttendance.STATUS_EXPIRES_SOON:
                queryset = queryset.filter(valid_until__gt=today, valid_until__lte=soon_date)
            if status_param == TrainingAttendance.STATUS_EXPIRED:
                queryset = queryset.filter(valid_until__lte=today)
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="dashboard/expiring")
    def dashboard_expiring(self, request, *args, **kwargs):
        days = int(request.query_params.get("days", 30))
        training_type_id = request.query_params.get("training_type_id")
        org_unit = request.query_params.get("org_unit")
        today = date.today()
        soon_date = today + timedelta(days=days)
        queryset = self.get_queryset().filter(valid_until__lte=soon_date)
        if training_type_id:
            queryset = queryset.filter(training_session__training_type_id=training_type_id)
        if org_unit:
            queryset = queryset.filter(employee__org_unit__icontains=org_unit)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


