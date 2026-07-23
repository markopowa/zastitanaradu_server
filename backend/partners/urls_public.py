from django.urls import path

from .views_public import intake_form_view

app_name = "partners_public"

urlpatterns = [
    path("<str:token>/", intake_form_view, name="intake-form"),
]
