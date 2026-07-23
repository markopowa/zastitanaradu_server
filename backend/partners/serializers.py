import os

from rest_framework import serializers

from .validators import (
    validate_birth_date,
    validate_jmbg,
    validate_maticni_broj,
    validate_not_future,
    validate_pib,
)
from .models import (
    ClientCompany,
    ClientIntakeLink,
    ClientIntakeSubmission,
    CompanyComplianceFinding,
    CompanyDocument,
    CompanyDocumentKind,
    CompanyObligationExclusion,
    ComplianceFindingType,
    ContactPerson,
    Employee,
    EmployeeTraining,
    EquipmentItem,
    Hazard,
    JobRole,
    JobRoleHazard,
    JobRoleLZO,
    RoleLzoTemplate,
    KinneyScaleOption,
    RiskAssessmentAct,
    RiskAssessmentActAmendment,
    RiskAssessmentSection,
    RiskAssessmentSectionRevision,
    RiskLevel,
    TrainingType,
    WorkInjury,
)


class RiskLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskLevel
        fields = (
            "id",
            "code",
            "label",
            "score",
            "is_acceptable",
            "is_high_risk",
            "order",
        )


class JobRoleSerializer(serializers.ModelSerializer):
    risk_level_detail = RiskLevelSerializer(
        source="risk_level", read_only=True)
    employee_count = serializers.IntegerField(
        source="employees.count", read_only=True)

    class Meta:
        model = JobRole
        fields = (
            "id",
            "client_company",
            "name",
            "description",
            "risk_level",
            "risk_level_detail",
            "employee_count",
            "obrazac6_template",
            "lzo_revers_template",
            "potvrda_clan5_template",
        )
        read_only_fields = (
            "obrazac6_template",
            "lzo_revers_template",
            "potvrda_clan5_template",
        )


class ClientCompanySerializer(serializers.ModelSerializer):
    risk_assessment_act_name = serializers.SerializerMethodField()

    class Meta:
        model = ClientCompany
        fields = (
            "id",
            "name",
            "tax_id",
            "registration_number",
            "address",
            "phone",
            "email",
            "website",
            "logo",
            "notes",
            "activity_code",
            "risk_assessment_act_file",
            "risk_assessment_act_name",
            "risk_assessment_act_date",
            "zop_category",
            "high_risk_activity",
            "installations",
        )
        read_only_fields = ("risk_assessment_act_file",)

    def validate_tax_id(self, value):
        return validate_pib(value)

    def validate_registration_number(self, value):
        return validate_maticni_broj(value)

    def get_risk_assessment_act_name(self, obj):
        f = obj.risk_assessment_act_file
        if not f:
            return ""
        base = os.path.basename(f.name)
        name, _ = os.path.splitext(base)
        return name


class EmployeeSerializer(serializers.ModelSerializer):
    client_company_name = serializers.CharField(
        source="client_company.name", read_only=True)
    job_role_name = serializers.CharField(
        source="job_role.name", read_only=True)
    job_role_risk_level = RiskLevelSerializer(
        source="job_role.risk_level", read_only=True)
    risk_level_override_detail = RiskLevelSerializer(
        source="risk_level_override", read_only=True)
    effective_risk_level = RiskLevelSerializer(read_only=True)

    class Meta:
        model = Employee
        fields = (
            "id",
            "client_company",
            "client_company_name",
            "first_name",
            "last_name",
            "father_name",
            "national_id",
            "date_of_birth",
            "place_of_birth",
            "email",
            "org_unit",
            "position",
            "occupation",
            "high_risk_position_name",
            "job_role",
            "job_role_name",
            "job_role_risk_level",
            "risk_level_override",
            "risk_level_override_detail",
            "effective_risk_level",
        )

    def validate_national_id(self, value):
        return validate_jmbg(value)

    def validate_date_of_birth(self, value):
        return validate_birth_date(value)


class ContactPersonSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(
        source="get_role_display",
        read_only=True,
    )

    class Meta:
        model = ContactPerson
        fields = (
            "id",
            "client_company",
            "full_name",
            "role",
            "role_display",
            "phone",
            "email",
            "is_primary",
        )


class CompanyDocumentSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(
        source="get_kind_display",
        read_only=True,
    )
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = CompanyDocument
        fields = (
            "id",
            "client_company",
            "kind",
            "kind_display",
            "file",
            "file_name",
            "uploaded_at",
        )
        read_only_fields = ("file", "uploaded_at")

    def get_file_name(self, obj):
        if not obj.file:
            return ""
        base = os.path.basename(obj.file.name)
        name, _ = os.path.splitext(base)
        return name


class CompanyDocumentKindSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyDocumentKind
        fields = (
            "id",
            "code",
            "name",
            "optional",
            "order",
            "is_active",
        )


class TrainingTypeSerializer(serializers.ModelSerializer):
    client_company_name = serializers.CharField(
        source="client_company.name", read_only=True)

    class Meta:
        model = TrainingType
        fields = (
            "id",
            "client_company",
            "client_company_name",
            "name",
            "description",
            "potvrda_template",
            "is_active",
        )


class EmployeeTrainingSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source="employee.__str__", read_only=True)
    training_type_name = serializers.CharField(
        source="training_type.name", read_only=True)

    class Meta:
        model = EmployeeTraining
        fields = (
            "id",
            "employee",
            "employee_name",
            "training_type",
            "training_type_name",
            "completed_at",
            "valid_until",
            "certificate_file",
            "created_at",
        )
        read_only_fields = ("created_at",)

    def validate_completed_at(self, value):
        return validate_not_future(value, "Datum završetka obuke")

    def validate(self, attrs):
        completed_at = attrs.get("completed_at")
        if completed_at is None and self.instance is not None:
            completed_at = self.instance.completed_at
        valid_until = attrs.get("valid_until")
        if valid_until is None and self.instance is not None:
            valid_until = self.instance.valid_until
        if completed_at and valid_until and valid_until < completed_at:
            raise serializers.ValidationError(
                {"valid_until": "Datum isteka ne može biti pre datuma "
                                "završetka obuke."})
        return attrs


class ComplianceFindingTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceFindingType
        fields = (
            "id",
            "code",
            "name",
            "description",
            "default_validity_months",
            "process_type",
            "is_active",
            "order",
        )


class CompanyComplianceFindingSerializer(serializers.ModelSerializer):
    finding_type_name = serializers.CharField(
        source="finding_type.name",
        read_only=True,
    )
    finding_type_code = serializers.CharField(
        source="finding_type.code",
        read_only=True,
    )
    file = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    status = serializers.CharField(read_only=True)

    class Meta:
        model = CompanyComplianceFinding
        fields = (
            "id",
            "client_company",
            "finding_type",
            "finding_type_name",
            "finding_type_code",
            "file",
            "file_name",
            "issued_date",
            "valid_until",
            "status",
            "process_binding",
            "uploaded_at",
            "updated_at",
        )
        read_only_fields = ("valid_until", "process_binding")

    def get_file(self, obj):
        f = obj.file
        if not f:
            return None
        return f.url

    def get_file_name(self, obj):
        f = obj.file
        if not f:
            return ""
        base = os.path.basename(f.name)
        name, _ = os.path.splitext(base)
        return name


class RiskAssessmentSectionRevisionSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
    )

    class Meta:
        model = RiskAssessmentSectionRevision
        fields = (
            "id",
            "version",
            "file",
            "reason",
            "created_at",
            "created_by",
            "created_by_username",
        )

    def get_file(self, obj):
        f = obj.file
        if not f:
            return None
        return f.url


class RiskAssessmentSectionSerializer(serializers.ModelSerializer):
    section_type_display = serializers.CharField(
        source="get_section_type_display",
        read_only=True,
    )
    current_file = serializers.SerializerMethodField()
    revisions = RiskAssessmentSectionRevisionSerializer(
        many=True, read_only=True)

    class Meta:
        model = RiskAssessmentSection
        fields = (
            "id",
            "section_type",
            "section_type_display",
            "order",
            "current_file",
            "current_version",
            "updated_at",
            "revisions",
        )

    def get_current_file(self, obj):
        f = obj.current_file
        if not f:
            return None
        return f.url


class RiskAssessmentActAmendmentSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()
    uploaded_by_username = serializers.CharField(
        source="uploaded_by.username",
        read_only=True,
    )

    class Meta:
        model = RiskAssessmentActAmendment
        fields = (
            "id",
            "act",
            "title",
            "note",
            "file",
            "uploaded_by",
            "uploaded_by_username",
            "uploaded_at",
        )
        read_only_fields = ("act", "uploaded_by", "uploaded_at")

    def get_file(self, obj):
        f = obj.file
        if not f:
            return None
        return f.url


class RiskAssessmentActSerializer(serializers.ModelSerializer):
    sections = RiskAssessmentSectionSerializer(many=True, read_only=True)
    amendments = RiskAssessmentActAmendmentSerializer(
        many=True, read_only=True)
    is_complete = serializers.SerializerMethodField()

    class Meta:
        model = RiskAssessmentAct
        fields = (
            "id",
            "client_company",
            "act_date",
            "created_at",
            "updated_at",
            "sections",
            "amendments",
            "is_complete",
        )

    def get_is_complete(self, obj):
        sections = obj.sections.all()
        if sections.count() < 3:
            return False
        return all(s.current_file for s in sections)


class EquipmentItemSerializer(serializers.ModelSerializer):
    client_company_name = serializers.CharField(
        source="client_company.name", read_only=True)
    service_process_type_name = serializers.CharField(
        source="service_process_type.name", read_only=True, allow_null=True)

    class Meta:
        model = EquipmentItem
        fields = (
            "id",
            "client_company",
            "client_company_name",
            "name",
            "category",
            "inventory_number",
            "location",
            "notes",
            "is_active",
            "service_process_type",
            "service_process_type_name",
        )
        extra_kwargs = {
            "service_process_type": {"allow_null": True, "required": False},
        }


class WorkInjurySerializer(serializers.ModelSerializer):
    client_company_name = serializers.CharField(
        source="client_company.name", read_only=True)
    employee_name = serializers.CharField(
        source="employee.__str__", read_only=True)

    class Meta:
        model = WorkInjury
        fields = (
            "id",
            "client_company",
            "client_company_name",
            "employee",
            "employee_name",
            "date",
            "severity",
            "description",
            "report_file",
            "created_at",
            "created_by",
        )
        read_only_fields = ("created_at", "created_by")

    def validate_date(self, value):
        return validate_not_future(value, "Datum povrede")


class CompanyObligationExclusionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyObligationExclusion
        fields = (
            "id",
            "client_company",
            "process_type",
            "reason",
            "created_by",
            "created_at",
        )
        read_only_fields = ("client_company", "created_by", "created_at")


class ClientIntakeLinkSerializer(serializers.ModelSerializer):
    client_company_name = serializers.CharField(
        source="client_company.name", read_only=True)
    public_url = serializers.SerializerMethodField()

    class Meta:
        model = ClientIntakeLink
        fields = (
            "id",
            "client_company",
            "client_company_name",
            "token",
            "public_url",
            "created_at",
            "expires_at",
            "is_active",
        )
        read_only_fields = ("token", "created_at")

    def get_public_url(self, obj):
        request = self.context.get("request")
        path = f"/intake/{obj.token}/"
        if request is not None:
            return request.build_absolute_uri(path)
        return path


class ClientIntakeSubmissionSerializer(serializers.ModelSerializer):
    client_company = serializers.IntegerField(
        source="link.client_company_id", read_only=True)
    client_company_name = serializers.CharField(
        source="link.client_company.name", read_only=True)
    kind_display = serializers.CharField(
        source="get_kind_display", read_only=True)
    status_display = serializers.CharField(
        source="get_status_display", read_only=True)
    reviewed_by_username = serializers.CharField(
        source="reviewed_by.username", read_only=True)

    class Meta:
        model = ClientIntakeSubmission
        fields = (
            "id",
            "link",
            "client_company",
            "client_company_name",
            "kind",
            "kind_display",
            "data",
            "status",
            "status_display",
            "created_at",
            "reviewed_by",
            "reviewed_by_username",
            "reviewed_at",
        )
        read_only_fields = (
            "link",
            "kind",
            "data",
            "status",
            "created_at",
            "reviewed_by",
            "reviewed_at",
        )


class ObligationPlanRowSerializer(serializers.Serializer):
    process_type = serializers.DictField()
    applicable = serializers.BooleanField()
    excluded = serializers.BooleanField()
    exclusion_reason = serializers.CharField(allow_blank=True)
    status = serializers.CharField()


class HazardSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(
        source="get_kind_display", read_only=True)

    class Meta:
        model = Hazard
        fields = (
            "id",
            "code",
            "label",
            "kind",
            "kind_display",
            "description",
            "order",
            "is_active",
        )


class KinneyScaleOptionSerializer(serializers.ModelSerializer):
    factor_display = serializers.CharField(
        source="get_factor_display", read_only=True)

    class Meta:
        model = KinneyScaleOption
        fields = (
            "id",
            "factor",
            "factor_display",
            "value",
            "label",
            "order",
        )


class JobRoleHazardSerializer(serializers.ModelSerializer):
    hazard_label = serializers.CharField(
        source="hazard.label", read_only=True)
    hazard_kind = serializers.CharField(
        source="hazard.kind", read_only=True)
    risk_category_label = serializers.SerializerMethodField()

    class Meta:
        model = JobRoleHazard
        fields = (
            "id",
            "job_role",
            "hazard",
            "hazard_label",
            "hazard_kind",
            "verovatnoca",
            "izlozenost",
            "posledica",
            "rizik",
            "risk_category",
            "risk_category_label",
            "mere",
            "order",
        )
        read_only_fields = ("rizik", "risk_category")

    def get_risk_category_label(self, obj):
        from .kinney import category_label
        return category_label(obj.risk_category)


class JobRoleLZOSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobRoleLZO
        fields = (
            "id",
            "job_role",
            "name",
            "standard",
            "interval_months",
            "order",
        )


class RoleLzoTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoleLzoTemplate
        fields = (
            "id",
            "role_name",
            "name",
            "standard",
            "interval_months",
            "order",
        )
