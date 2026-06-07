export interface SubjectSnapshot {
    kind: "EMPLOYEE" | "EQUIPMENT" | "CLIENT_COMPANY";
    id?: number;
    name?: string;
    email?: string;
    inventory_number?: string;
}

export interface ClientCompany {
    id: number;
    name: string;
    tax_id: string;
    registration_number?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo?: string | null;
    notes?: string;
    activity_code?: string;
    risk_assessment_act_file?: string | null;
    risk_assessment_act_name?: string;
    risk_assessment_act_date?: string | null;
}

export type RiskAssessmentSectionType = "INTRO" | "ASSESSMENTS" | "CONCLUSION";

export interface RiskAssessmentSectionRevision {
    id: number;
    version: number;
    file: string | null;
    reason: string;
    created_at: string;
    created_by: number | null;
    created_by_username?: string;
}

export interface RiskAssessmentSection {
    id: number;
    section_type: RiskAssessmentSectionType;
    section_type_display: string;
    order: number;
    current_file: string | null;
    current_version: number;
    updated_at: string;
    revisions: RiskAssessmentSectionRevision[];
}

export interface RiskAssessmentAct {
    id: number;
    client_company: number;
    act_date: string | null;
    created_at: string;
    updated_at: string;
    sections: RiskAssessmentSection[];
    is_complete: boolean;
}

export interface ComplianceFindingType {
    id: number;
    code: string;
    name: string;
    description?: string;
    default_validity_months: number;
    process_type: number | null;
    is_active: boolean;
    order: number;
}

export type ComplianceFindingStatus =
    | "VALID"
    | "EXPIRING"
    | "EXPIRED"
    | "MISSING";

export interface CompanyComplianceFindingRow {
    finding_type: number;
    finding_type_name: string;
    finding_type_code: string;
    default_validity_months: number;
    id?: number | null;
    file?: string | null;
    file_name?: string;
    issued_date?: string | null;
    valid_until?: string | null;
    status: ComplianceFindingStatus;
}

export type ContactPersonRole =
    | "DIRECTOR"
    | "SAFETY_OFFICER"
    | "CONTACT"
    | "OTHER";

export interface ContactPerson {
    id: number;
    client_company: number;
    full_name: string;
    role: ContactPersonRole;
    role_display?: string;
    phone?: string;
    email?: string;
    is_primary: boolean;
}

export type CompanyDocumentKind =
    | "CONTRACT"
    | "DECISION"
    | "RULEBOOK_OSH"
    | "RULEBOOK_PPE"
    | "TRAINING_EMPLOYEES"
    | "TRAINING_MANAGERS"
    | "TRAINING_PPE";

export interface CompanyDocument {
    id: number;
    client_company: number;
    kind: CompanyDocumentKind;
    kind_display?: string;
    file?: string | null;
    file_name?: string;
    uploaded_at?: string;
}

export interface RiskLevel {
    id: number;
    code: string;
    label: string;
    score: number;
    is_acceptable: boolean;
    is_high_risk: boolean;
    order: number;
}

export interface JobRole {
    id: number;
    client_company: number;
    name: string;
    description?: string;
    risk_level: number | null;
    risk_level_detail?: RiskLevel | null;
    employee_count?: number;
}

export interface Employee {
    id: number;
    client_company: number | null;
    client_company_name: string | null;
    first_name: string;
    last_name: string;
    father_name?: string;
    national_id?: string;
    date_of_birth?: string | null;
    place_of_birth?: string;
    email?: string;
    org_unit?: string;
    position?: string;
    occupation?: string;
    high_risk_position_name?: string;
    job_role?: number | null;
    job_role_name?: string | null;
    job_role_risk_level?: RiskLevel | null;
    risk_level_override?: number | null;
    risk_level_override_detail?: RiskLevel | null;
    effective_risk_level?: RiskLevel | null;
}

export interface EmployeeSummary {
    id: number;
    client_company: number | null;
    client_company_name?: string | null;
    first_name: string;
    last_name: string;
    email?: string;
    org_unit?: string;
    position?: string;
    job_role_risk_level?: RiskLevel | null;
    risk_level_override?: number | null;
    risk_level_override_detail?: RiskLevel | null;
    effective_risk_level?: RiskLevel | null;
}

export interface EquipmentItem {
    id: number;
    client_company: number;
    name: string;
    category?: string;
    inventory_number?: string;
    location?: string;
    notes?: string;
    is_active: boolean;
}

export interface ProcessType {
    id: number;
    code: string;
    name: string;
    description?: string;
    subject_kind: "EMPLOYEE" | "EQUIPMENT" | "CLIENT_COMPANY";
    default_period_months?: number | null;
    lead_time_days: number;
    is_active: boolean;
    include_in_medical_exam_record?: boolean;
    templates: ProcessTemplate[];
}

export interface ProcessTriggerRun {
    id: number;
    process_template: number | null;
    trigger: "ON_LEAD" | "ON_SCHEDULED" | "ON_COMPLETED" | "ON_OVERDUE";
    executed_at: string;
    executed_by_display?: string | null;
    email_sent: boolean;
    email_error: string;
    template_send_email?: boolean;
    document_file: number | null;
    document_file_url?: string | null;
}

export interface ProcessRun {
    id: number;
    process_binding: number;
    process_binding_id: number;
    process_type: number;
    process_type_name: string;
    subject_snapshot: SubjectSnapshot;
    scheduled_for?: string | null;
    performed_at?: string | null;
    valid_until?: string | null;
    status: "PENDING" | "SENT" | "COMPLETED" | "CANCELLED" | "FAILED";
    notes?: string;
    result_data?: Record<string, unknown>;
    trigger_runs: ProcessTriggerRun[];
}

export interface ProcessRunNote {
    id: number;
    process_run: number;
    author: number | null;
    author_username?: string;
    body: string;
    created_at: string;
    updated_at: string;
}

export interface ProcessBinding {
    id: number;
    process_type: number;
    process_type_name: string;
    subject_kind: "EMPLOYEE" | "EQUIPMENT" | "CLIENT_COMPANY";
    employee: number | null;
    employee_first_name?: string;
    employee_last_name?: string;
    equipment_item: number | null;
    equipment_item_name?: string;
    client_company: number | null;
    client_company_name?: string;
    custom_period_months?: number | null;
    lead_time_days?: number | null;
    next_run_at?: string | null;
    last_run_at?: string | null;
    is_active: boolean;
    has_open_run?: boolean;
}

export interface ProcessTemplate {
    id: number;
    process_type: number;
    document_template: number | null;
    trigger: string;
    generate_document: boolean;
    send_email: boolean;
    attach_generated_document?: boolean;
    attach_uploaded_documents?: boolean;
    email_to_kind?: string;
    email_subject_template?: string;
    email_body_template?: string;
    custom_email_recipient?: string;
    notification_role_group?: number | null;
    followup_process_type?: number | null;
}

export interface ProcessRunDocument {
    id: number;
    process_run: number;
    document_file: number;
    document_file_title?: string;
    document_file_url?: string | null;
    usage_kind: string;
}

export type ActivityLogEventType =
    | "run_created"
    | "run_sent"
    | "email_error"
    | "run_completed"
    | "doc_attached"
    | "template_exec"
    | "lead_notified"
    | "overdue_reminder"
    | "scheduled";

export interface ActivityLog {
    id: number;
    event_type: ActivityLogEventType;
    event_type_display: string;
    timestamp: string;
    username: string;
    process_run_id: number | null;
    description: string;
    extra_data: Record<string, unknown>;
}

export interface TaskAssignment {
    id: number;
    process_run: number;
    process_run_id: number;
    assigned_to: number;
    title: string;
    description?: string;
    due_date?: string | null;
    status: "TODO" | "IN_PROGRESS" | "DONE";
}

export interface UpcomingDeadline {
    run_id: number;
    process_type_id: number;
    process_type_name: string;
    subject_kind: "EMPLOYEE" | "EQUIPMENT" | "CLIENT_COMPANY";
    subject_name: string;
    client_company_id: number | null;
    client_company_name: string;
    scheduled_for: string | null;
    valid_until: string | null;
    status: "PENDING" | "SENT";
    is_overdue: boolean;
    days_until_deadline: number | null;
}
