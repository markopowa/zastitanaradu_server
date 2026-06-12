import type {
    ProcessBindingsParams,
    ProcessRunsParams,
} from "../api/processes";

import type { AsyncThunkDispatchResult } from "../store";
import type { WithNavigationProps } from "../hocs/withNavigation";

import type {
    ClientCompany,
    Employee,
    EmployeeSummary,
    EquipmentItem,
    JobRole,
    ProcessBinding,
    ProcessRun,
    ProcessRunDocument,
    ProcessRunNote,
    ProcessType,
    RiskLevel,
} from "./processes";

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
    saveBinding: (args: {
        id: number;
        payload: Partial<ProcessBinding>;
    }) => AsyncThunkDispatchResult;
}

export type ProcessBindingsListPageProps = ProcessBindingsListPageStateProps &
    ProcessBindingsListPageDispatchProps &
    WithNavigationProps;

export interface ProcessBindingsListPageState {
    client_company_id: string;
    process_type_id: string;
    dialogOpen: boolean;
    sendingBindingId: number | null;
    savingStartDateBindingId: number | null;
    deactivatingBindingId: number | null;
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
}

export type ProcessRunsListPageProps = ProcessRunsListPageStateProps &
    ProcessRunsListPageDispatchProps &
    WithNavigationProps;

export interface ProcessRunsListPageState {
    client_company_id: string;
    process_type_id: string;
    status: string;
}

export interface ProcessRunDetailPageDispatchProps {
    setLastPath?: (path: string) => void;
    setBreadcrumbs?: (items: { label: string; path?: string }[]) => void;
}

export type ProcessRunDetailPageProps = ProcessRunDetailPageDispatchProps &
    WithNavigationProps & { id: string };

export interface ProcessRunDetailPageState {
    loading: boolean;
    error: string | null;
    run: ProcessRun | null;
    documents: ProcessRunDocument[];
    notes: ProcessRunNote[];
    notesNewBody: string;
    uploadTitle: string;
    uploadFile: File | null;
    uploading: boolean;
    showCompleteForm: boolean;
    complete_valid_until: string;
    complete_performed_at: string;
    complete_notes: string;
    complete_report_number: string;
    complete_fitness_assessment: string;
    complete_measures_taken: string;
    completing: boolean;
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
    bindings: ProcessBinding[];
    runs: ProcessRun[];
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
    setBreadcrumbs: (items: { label: string; path?: string }[]) => void;
    fetchClientCompanies: () => void;
}

export type ClientCompaniesListPageOwnProps = WithNavigationProps;

export type ClientCompaniesListPageProps = ClientCompaniesListPageStateProps &
    ClientCompaniesListPageDispatchProps &
    ClientCompaniesListPageOwnProps;

export type ClientCompaniesListPageState = Record<string, never>;

export interface ClientCompanyDetailPageDispatchProps {
    setLastPath: (path: string) => void;
    setBreadcrumbs: (items: { label: string; path?: string }[]) => void;
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
    editZop_category: string;
    editHigh_risk_activity: boolean;
    editInstallations: string[];
    registryImporting: boolean;
    riskLevels: RiskLevel[];
    jobRoles: JobRole[];
    roleDialogOpen: boolean;
    editingRoleId: number | null;
    role_name: string;
    role_risk_level: string;
    role_description: string;
    savingRole: boolean;
    roleError: string | null;
    roleDeleteTarget: JobRole | null;
    deletingRole: boolean;
    empDialogOpen: boolean;
    eqDialogOpen: boolean;
    eq_name: string;
    eq_category: string;
    eq_inventory_number: string;
    eq_location: string;
    eq_notes: string;
    savingEquipment: boolean;
    equipmentError: string | null;
    bindingDialogOpen: boolean;
    savingStartDateBindingId: number | null;
    deactivatingBindingId: number | null;
    companyDeleteOpen: boolean;
    deletingCompany: boolean;
}

export interface RiskLevelsListPageState {
    items: RiskLevel[];
    loading: boolean;
    error: string | null;
    dialogOpen: boolean;
    editingId: number | null;
    f_code: string;
    f_label: string;
    f_score: string;
    f_is_acceptable: boolean;
    f_is_high_risk: boolean;
    f_order: string;
    saving: boolean;
    formError: string | null;
    deleteTarget: RiskLevel | null;
    deleting: boolean;
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
    loadEmployees: (params: {
        clientCompanyId: string;
        search?: string;
        risk_level_id?: string;
    }) => void;
}

export type ClientCompaniesEmployeesListPageProps =
    ClientCompaniesEmployeesListPageStateProps &
        ClientCompaniesEmployeesListPageDispatchProps &
        WithNavigationProps;

export interface ClientCompaniesEmployeesListPageState {
    client_company_id: string;
    search: string;
    risk_level_id: string;
    riskLevels: RiskLevel[];
    dialogOpen: boolean;
    editDialogOpen: boolean;
    editEmployee: Employee | null;
    historyDialogOpen: boolean;
    historyEmployeeId: number | null;
    historyEmployeeName: string;
    sendDialogOpen: boolean;
    sendEmployeeId: number | null;
    sendEmployeeName: string;
    sendProcessTypeId: string;
    sending: boolean;
}

export interface ClientCompanyEmployeesDetailPageStateProps {
    clientCompanies: ClientCompany[];
    processTypes: ProcessType[];
}

export interface ClientCompanyEmployeesDetailPageDispatchProps {
    setLastPath: (path: string) => void;
    setBreadcrumbs: (items: { label: string; path?: string }[]) => void;
    ensureClientCompanies: () => void;
    ensureProcessTypes: () => void;
}

export type ClientCompanyEmployeesDetailPageProps =
    ClientCompanyEmployeesDetailPageStateProps &
        ClientCompanyEmployeesDetailPageDispatchProps &
        WithNavigationProps & { id: string };

export interface ClientCompanyEmployeesDetailPageState {
    item: Employee | null;
    bindings: ProcessBinding[];
    runs: ProcessRun[];
    loading: boolean;
    error: string | null;
    editDialogOpen: boolean;
    sendDialogOpen: boolean;
    sendProcessTypeId: string;
    sending: boolean;
}

export interface EmployeeFormDialogProps {
    open: boolean;
    mode: "create" | "edit";
    initial?: Employee;
    clientCompanies: ClientCompany[];
    lockedClientCompanyId?: number;
    initialClientCompanyId?: string;
    onClose: () => void;
    onSaved: (employee: Employee) => void;
}

export interface EmployeeFormDialogState {
    client_company_id: string;
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
    job_role: string;
    risk_level_override: string;
    jobRoles: JobRole[];
    riskLevels: RiskLevel[];
    saving: boolean;
    error: string | null;
}

export interface EmployeeExamHistoryDialogProps {
    open: boolean;
    employeeId: number | null;
    employeeName: string;
    onClose: () => void;
}

export interface EmployeeExamHistoryDialogState {
    runs: ProcessRun[];
    loading: boolean;
    error: string | null;
}

export interface AddProcessBindingDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    subjectKind?: ProcessType["subject_kind"];
    subjectLabel?: string;
    clientCompanyId?: number;
    employeeId?: number;
    equipmentItemId?: number;
    unlocked?: boolean;
}

export interface AddProcessBindingDialogState {
    processTypes: ProcessType[];
    processTypeId: string;
    nextRunAt: string;
    saving: boolean;
    unlockedSubjectKind: ProcessType["subject_kind"];
    unlockedEmployeeId: string;
    unlockedEquipmentId: string;
    unlockedClientCompanyId: string;
    employees: import("./processes").EmployeeSummary[];
    equipment: import("./processes").EquipmentItem[];
    clientCompanies: import("./processes").ClientCompany[];
}

export interface EntityProcessBindingsPanelProps {
    subjectKind: ProcessType["subject_kind"];
    subjectLabel: string;
    clientCompanyId?: number;
    employeeId?: number;
    equipmentItemId?: number;
    bindings: ProcessBinding[];
    runs: ProcessRun[];
    onRefresh: () => void;
}

export interface EntityProcessBindingsPanelState {
    dialogOpen: boolean;
    savingStartDateBindingId: number | null;
    deactivatingBindingId: number | null;
}
