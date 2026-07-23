from django.db.models import Q
from rest_framework import mixins, permissions, viewsets
from rest_framework.response import Response

from .grading import create_attempt
from .models import TestAttempt, TestQuestion
from .serializers import (
    TestAttemptCreateSerializer,
    TestAttemptResultSerializer,
    TestQuestionSerializer,
)


class TestQuestionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TestQuestionSerializer
    permission_classes = [permissions.DjangoModelPermissions]
    queryset = TestQuestion.objects.all()

    def get_queryset(self):
        client_company_id = self.request.query_params.get(
            "client_company_id")
        qs = TestQuestion.objects.filter(is_active=True)
        if client_company_id:
            qs = qs.filter(
                Q(client_company_id=client_company_id)
                | Q(client_company__isnull=True)
            )
        else:
            qs = qs.filter(client_company__isnull=True)
        return qs.order_by("order", "id")


class TestAttemptViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [permissions.DjangoModelPermissions]
    queryset = TestAttempt.objects.all()
    serializer_class = TestAttemptResultSerializer

    def create(self, request, *args, **kwargs):
        input_serializer = TestAttemptCreateSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        attempt = create_attempt(
            input_serializer.validated_data["employee"],
            input_serializer.validated_data["answers"],
        )
        output_serializer = TestAttemptResultSerializer(attempt)
        return Response(output_serializer.data, status=201)
