import type { DocumentTemplate } from "../api/documents";
import type {
    CompleteProcessRunPayload,
    ProcessBindingsParams,
    ProcessRunsParams,
} from "../api/processes";

import type { AsyncThunkDispatchResult } from "../store";
import type { WithNavigationProps } from "../hocs/withNavigation";
import type { Role } from "./auth";

import type { DocumentFile } from "./documents";
import type {
    ClientCompany,
    Employee,
    EmployeeSummary,
    EquipmentItem,
    ProcessBinding,
    ProcessRun,
    ProcessRunDocument,
    ProcessRunNote,
    ProcessTemplate,
    ProcessType,
} from "./processes";

export type ProcessTemplatesListTriggerValue =
    | "ON_SCHEDULED"
    | "ON_COMPLETED"
    | "ON_EXPIRED"
    | "";

export type ProcessTemplatesListEmailToKindValue =
    | "CLIENT_MAIN_EMAIL"
    | "EMPLOYEE_EMAIL"
    | "INTERNAL_ROLE"
    | "CUSTOM"
    | "";

export interface ProcessTemplatesListPageStateProps {
    processTypes: ProcessType[];
    templatesItems: ProcessTemplate[];
    templatesLoading: boolean;
    templatesError: string | null;
    docTemplates: DocumentTemplate[];
    docTemplatesLoading: boolean;
    roles: Role[];
}

export interface ProcessTemplatesListPageDispatchProps {
    setLastPath: (path: string) => void;
    ensureProcessTypes: () => void;
    ensureProcessDocTemplates: () => void;
    loadRoles: () => void;
    loadTemplates: (processTypeId: number | undefined) => void;
    addTemplate: (
        payload: Partial<ProcessTemplate>,
    ) => AsyncThunkDispatchResult;
    saveTemplate: (args: {
        id: number;
        payload: Partial<ProcessTemplate>;
    }) => AsyncThunkDispatchResult;
    removeTemplate: (id: number) => AsyncThunkDispatchResult;
}

export type ProcessTemplatesListPageProps = ProcessTemplatesListPageStateProps &
    ProcessTemplatesListPageDispatchProps;

export interface ProcessTemplatesListPageState {
    process_type_id: string;
    dialogOpen: boolean;
    deleteConfirmId: number | null;
    editingId: number | null;
    form_process_type_id: string;
    form_trigger: ProcessTemplatesListTriggerValue;
    form_document_template_id: string;
    form_generate_document: boolean;
    form_send_email: boolean;
    form_email_to_kind: ProcessTemplatesListEmailToKindValue;
    form_email_subject_template: string;
    form_email_body_template: string;
    form_custom_email_recipient: string;
    form_followup_process_type_id: string;
    form_notification_role_group_id: string;
}

export interface ProcessTypesListPageStateProps {
    processTypes: ProcessType[];
    typesLoading: boolean;
    typesError: string | null;
}

export interface ProcessTypesListPageDispatchProps {
    setLastPath: (path: string) => void;
    ensureProcessTypes: () => void;
    addProcessType: (payload: Partial<ProcessType>) => AsyncThunkDispatchResult;
    saveProcessType: (args: {
        id: number;
        payload: Partial<ProcessType>;
    }) => AsyncThunkDispatchResult;
    removeProcessType: (id: number) => AsyncThunkDispatchResult;
}

export type ProcessTypesListPageProps = ProcessTypesListPageStateProps &
    ProcessTypesListPageDispatchProps;

export interface ProcessTypesListPageState {
    dialogOpen: boolean;
    editingId: number | null;
    deleteConfirmId: number | null;
    name: string;
    description: string;
    subject_kind: ProcessType["subject_kind"];
    default_period_months: string;
    lead_time_days: string;
    is_active: boolean;
    include_in_medical_exam_record: boolean;
}

export interface ProcessBindingFormEmployeeOption {
    id: number;
    first_name: string;
    last_name: string;
}

export interface ProcessBindingsListPageStateProps {
    clientCompanies: ClientCompany[];
    processTypes: ProcessType[];
    bindingsItems: ProcessBinding[];
    bindingsLoading: boolean;
    bindingsError: string | null;
}

export interface ProcessBindingsListPageDispatchProps {
    setLastPath: (path: string) => void;
    ensureClientCompanies: () => void;
    ensureProcessTypes: () => void;
    loadBindings: (params: ProcessBindingsParams) => void;
    addBinding: (payload: Partial<ProcessBinding>) => AsyncThunkDispatchResult;
}

export type ProcessBindingsListPageProps = ProcessBindingsListPageStateProps &
    ProcessBindingsListPageDispatchProps &
    WithNavigationProps;

export interface ProcessBindingsListPageState {
    employees: ProcessBindingFormEmployeeOption[];
    equipment: EquipmentItem[];
    client_company_id: string;
    process_type_id: string;
    dialogOpen: boolean;
    new_subject_kind: string;
    new_employee: string;
    new_equipment: string;
    new_client_company: string;
    new_process_type: string;
    new_period: string;
    new_next_run_at: string;
    sendingBindingId: number | null;
}

export interface ProcessRunsListPageStateProps {
    clientCompanies: ClientCompany[];
    processTypes: ProcessType[];
    runsItems: ProcessRun[];
    runsLoading: boolean;
    runsError: string | null;
}

export interface ProcessRunsListPageDispatchProps {
    setLastPath: (path: string) => void;
    ensureClientCompanies: () => void;
    ensureProcessTypes: () => void;
    loadRuns: (params: ProcessRunsParams) => void;
    completeRun: (args: {
        id: number;
        payload: CompleteProcessRunPayload;
    }) => AsyncThunkDispatchResult;
}

export type ProcessRunsListPageProps = ProcessRunsListPageStateProps &
    ProcessRunsListPageDispatchProps &
    WithNavigationProps;

export interface ProcessRunsListPageState {
    client_company_id: string;
    process_type_id: string;
    status: string;
    completeDialogRunId: number | null;
    complete_valid_until: string;
    complete_performed_at: string;
    complete_notes: string;
    complete_report_number: string;
    complete_fitness_assessment: string;
    complete_measures_taken: string;
    documentsDialogRunId: number | null;
    runDocuments: ProcessRunDocument[];
    allDocuments: DocumentFile[];
    addDocSelectedId: number | "";
    notesDialogRunId: number | null;
    notesItems: ProcessRunNote[];
    notesNewBody: string;
    emailIssueDialogRun: ProcessRun | null;
    emailIssueDocs: ProcessRunDocument[];
    emailIssueLoading: boolean;
}

export interface EquipmentListPageStateProps {
    clientCompanies: ClientCompany[];
    equipmentItems: EquipmentItem[];
    equipmentLoading: boolean;
    equipmentError: string | null;
}

export interface EquipmentListPageDispatchProps {
    setLastPath: (path: string) => void;
    ensureClientCompanies: () => void;
    loadEquipment: (clientCompanyId: string) => void;
    addEquipment: (payload: Partial<EquipmentItem>) => AsyncThunkDispatchResult;
}

export type EquipmentListPageProps = EquipmentListPageStateProps &
    EquipmentListPageDispatchProps &
    WithNavigationProps;

export interface EquipmentListPageState {
    client_company_id: string;
    dialogOpen: boolean;
    name: string;
    category: string;
    inventory_number: string;
    location: string;
    notes: string;
    new_client_company_id: string;
}

export interface EquipmentDetailPageDispatchProps {
    setLastPath: (path: string) => void;
}

export type EquipmentDetailPageProps = EquipmentDetailPageDispatchProps &
    WithNavigationProps & { id: string };

export interface EquipmentDetailPageState {
    item: EquipmentItem | null;
    loading: boolean;
    error: string | null;
}

export interface ClientCompaniesListPageStateProps {
    clientCompanies: ClientCompany[];
    listLoading: boolean;
    listError: string | null;
}

export interface ClientCompaniesListPageDispatchProps {
    setLastPath: (path: string) => void;
    ensureClientCompanies: () => void;
    addClientCompany: (
        payload: Partial<ClientCompany>,
    ) => AsyncThunkDispatchResult;
}

export type ClientCompaniesListPageOwnProps = WithNavigationProps;

export type ClientCompaniesListPageProps = ClientCompaniesListPageStateProps &
    ClientCompaniesListPageDispatchProps &
    ClientCompaniesListPageOwnProps;

export interface ClientCompaniesListPageState {
    dialogOpen: boolean;
    name: string;
    tax_id: string;
    registration_number: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    notes: string;
    activity_code: string;
}

export interface ClientCompanyDetailPageDispatchProps {
    setLastPath: (path: string) => void;
}

export type ClientCompanyDetailPageProps =
    ClientCompanyDetailPageDispatchProps & WithNavigationProps & { id: string };

export interface ClientCompanyDetailPageState {
    item: ClientCompany | null;
    employees: EmployeeSummary[];
    equipment: EquipmentItem[];
    bindings: ProcessBinding[];
    runs: ProcessRun[];
    loading: boolean;
    error: string | null;
    generatingDoc: boolean;
    docError: string | null;
    editing: boolean;
    saving: boolean;
    saveError: string | null;
    editName: string;
    editTaxId: string;
    editRegistration_number: string;
    editAddress: string;
    editPhone: string;
    editEmail: string;
    editWebsite: string;
    editNotes: string;
    editActivity_code: string;
    riskActDateValue: string;
    savingRiskActDate: boolean;
    riskActUploading: boolean;
    riskActPreviewOpen: boolean;
    empDialogOpen: boolean;
    emp_first_name: string;
    emp_last_name: string;
    emp_father_name: string;
    emp_national_id: string;
    emp_date_of_birth: string;
    emp_place_of_birth: string;
    emp_email: string;
    emp_org_unit: string;
    emp_position: string;
    emp_occupation: string;
    emp_high_risk_position_name: string;
    savingEmployee: boolean;
    employeeError: string | null;
    eqDialogOpen: boolean;
    eq_name: string;
    eq_category: string;
    eq_inventory_number: string;
    eq_location: string;
    eq_notes: string;
    savingEquipment: boolean;
    equipmentError: string | null;
}

export interface ClientCompaniesEmployeesListPageStateProps {
    clientCompanies: ClientCompany[];
    processTypes: ProcessType[];
    employeesItems: EmployeeSummary[];
    employeesLoading: boolean;
    employeesError: string | null;
}

export interface ClientCompaniesEmployeesListPageDispatchProps {
    setLastPath: (path: string) => void;
    ensureClientCompanies: () => void;
    ensureProcessTypes: () => void;
    loadEmployees: (clientCompanyId: string) => void;
    addEmployee: (payload: Partial<Employee>) => AsyncThunkDispatchResult;
}

export type ClientCompaniesEmployeesListPageProps =
    ClientCompaniesEmployeesListPageStateProps &
        ClientCompaniesEmployeesListPageDispatchProps &
        WithNavigationProps;

export interface ClientCompaniesEmployeesListPageState {
    client_company_id: string;
    dialogOpen: boolean;
    first_name: string;
    last_name: string;
    father_name: string;
    national_id: string;
    date_of_birth: string;
    place_of_birth: string;
    email: string;
    org_unit: string;
    position: string;
    occupation: string;
    high_risk_position_name: string;
    new_client_company_id: string;
    sendDialogOpen: boolean;
    sendEmployeeId: number | null;
    sendEmployeeName: string;
    sendProcessTypeId: string;
    sending: boolean;
}

export interface ClientCompanyEmployeesDetailPageDispatchProps {
    setLastPath: (path: string) => void;
}

export type ClientCompanyEmployeesDetailPageProps =
    ClientCompanyEmployeesDetailPageDispatchProps &
        WithNavigationProps & { id: string };

export interface ClientCompanyEmployeesDetailPageState {
    item: Employee | null;
    loading: boolean;
    error: string | null;
}

