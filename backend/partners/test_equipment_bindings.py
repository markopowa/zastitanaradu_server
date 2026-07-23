import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APITestCase

from partners.equipment_bindings import ensure_default_bindings_for_equipment
from partners.models import ClientCompany, EquipmentItem
from processes.models import ProcessBinding, ProcessRun, ProcessType

User = get_user_model()


def make_company(**kwargs):
    defaults = {"name": "Test firma oprema", "tax_id": uuid.uuid4().hex[:9]}
    defaults.update(kwargs)
    return ClientCompany.objects.create(**defaults)


def make_equipment_process_type(code="PP_APARATI_SERVIS", **kwargs):
    defaults = {
        "name": "Servis PP aparata",
        "subject_kind": ProcessType.SUBJECT_EQUIPMENT,
        "domain": ProcessType.DOMAIN_ZOP,
        "shape": ProcessType.SHAPE_PERIODIC,
        "proof_kind": ProcessType.PROOF_UPLOAD,
        "applicability_rule": {"always": True},
        "is_active": True,
        "default_period_months": 12,
    }
    defaults.update(kwargs)
    return ProcessType.objects.create(code=code, **defaults)


class AutoSpawnEquipmentBindingsTest(TestCase):
    def setUp(self):
        self.company = make_company()
        self.process_type = make_equipment_process_type()

    def _make_equipment(self, service_process_type=None):
        return EquipmentItem.objects.create(
            client_company=self.company,
            name="PP aparat S6",
            category="PP oprema",
            service_process_type=service_process_type,
        )

    def test_equipment_with_process_type_gets_binding_and_open_run(self):
        equipment = self._make_equipment(service_process_type=self.process_type)

        ensure_default_bindings_for_equipment(equipment)

        bindings = ProcessBinding.objects.filter(
            subject_kind=ProcessBinding.SUBJECT_EQUIPMENT,
            equipment_item=equipment,
        )
        self.assertEqual(bindings.count(), 1)
        binding = bindings.first()
        self.assertEqual(binding.process_type, self.process_type)
        self.assertTrue(binding.is_active)

        open_runs = ProcessRun.objects.filter(
            process_binding=binding,
        ).exclude(status=ProcessRun.STATUS_COMPLETED)
        self.assertEqual(open_runs.count(), 1)

    def test_calling_twice_does_not_duplicate(self):
        equipment = self._make_equipment(service_process_type=self.process_type)

        ensure_default_bindings_for_equipment(equipment)
        ensure_default_bindings_for_equipment(equipment)

        bindings = ProcessBinding.objects.filter(
            subject_kind=ProcessBinding.SUBJECT_EQUIPMENT,
            equipment_item=equipment,
        )
        self.assertEqual(bindings.count(), 1)

    def test_equipment_without_process_type_gets_no_binding(self):
        equipment = self._make_equipment(service_process_type=None)

        ensure_default_bindings_for_equipment(equipment)

        bindings = ProcessBinding.objects.filter(
            subject_kind=ProcessBinding.SUBJECT_EQUIPMENT,
            equipment_item=equipment,
        )
        self.assertEqual(bindings.count(), 0)


class EquipmentApiTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            "eqapi", "eqapi@example.com", "pass12345")
        self.client.force_authenticate(user=self.user)
        self.company = make_company()

    def test_list_with_existing_row_returns_200(self):
        EquipmentItem.objects.create(
            client_company=self.company, name="Viljuškar", category="transport")
        r = self.client.get("/api/partners/equipment/")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertGreaterEqual(len(r.data["results"]), 1)
        self.assertIn("client_company_name", r.data["results"][0])

    def test_create_and_detail_return_expected(self):
        r = self.client.post(
            "/api/partners/equipment/",
            {"client_company": self.company.id, "name": "Kran",
             "category": "dizalica"},
            format="json")
        self.assertEqual(r.status_code, 201, r.content)
        item_id = r.data["id"]
        self.assertEqual(r.data["client_company_name"], self.company.name)
        d = self.client.get(f"/api/partners/equipment/{item_id}/")
        self.assertEqual(d.status_code, 200, d.content)
        self.assertEqual(d.data["name"], "Kran")
