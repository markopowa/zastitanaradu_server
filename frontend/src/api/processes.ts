import { api } from "./client";
import type {
    ActivityLog,
    ActivityLogEventType,
    ClientCompany,
    Employee,
    EmployeeSummary,
    EquipmentItem,
    JobRole,
    ProcessBinding,
    ProcessRun,
    ProcessRunNote,
    ProcessRunDocument,
    ProcessTemplate,
    ProcessType,
    RiskLevel,
} from "../types/processes";

type ListResponse<T> = T[] | { results?: T[] };

export interface ActivityLogParams {
    event_type?: ActivityLogEventType;
    date_from?: string;
    date_to?: string;
    user_id?: number | "system";
    username?: string;
    process_run_id?: number;
    process_type_id?: number;
    client_company_id?: number;
    q?: string;
}

export async function getActivityLog(
    params: ActivityLogParams = {},
): Promise<ActivityLog[]> {
    const search = new URLSearchParams();
    if (params.event_type) search.set("event_type", params.event_type);
    if (params.date_from) search.set("date_from", params.date_from);
    if (params.date_to) search.set("date_to", params.date_to);
    if (params.user_id != null) {
        search.set(
            "user_id",
            params.user_id === "system" ? "system" : String(params.user_id),
        );
    }
    if (params.username) search.set("username", params.username);
    if (params.process_run_id != null) {
        search.set("process_run_id", String(params.process_run_id));
    }
    if (params.process_type_id != null) {
        search.set("process_type_id", String(params.process_type_id));
    }
    if (params.client_company_id != null) {
        search.set("client_company_id", String(params.client_company_id));
    }
    if (params.q) search.set("q", params.q);
    const qs = search.toString();
    const url = qs
        ? `/api/processes/dashboard/activity-log?${qs}`
        : "/api/processes/dashboard/activity-log";
    const { data } = await api.get<ListResponse<ActivityLog>>(url);
    return asList(data);
}

export async function getClientCompanies(params?: {
    client_company_id?: number;
}): Promise<ClientCompany[]> {
    const search = new URLSearchParams();
    if (params?.client_company_id != null)
        search.set("client_company_id", String(params.client_company_id));
    const qs = search.toString();
    const url = qs
        ? `/api/partners/client-companies/?${qs}`
        : "/api/partners/client-companies/";
    const { data } = await api.get<ListResponse<ClientCompany>>(url);
    return asList(data);
}

export async function getClientCompany(id: number): Promise<ClientCompany> {
    const { data } = await api.get<ClientCompany>(
        `/api/partners/client-companies/${id}/`,
    );
    return data;
}

export async function createClientCompany(
    payload: Partial<ClientCompany>,
): Promise<ClientCompany> {
    const { data } = await api.post<ClientCompany>(
        "/api/partners/client-companies/",
        payload,
    );
    return data;
}

export async function updateClientCompany(
    id: number,
    payload: Partial<ClientCompany>,
): Promise<ClientCompany> {
    const { data } = await api.patch<ClientCompany>(
        `/api/partners/client-companies/${id}/`,
        payload,
    );
    return data;
}

export interface SendNowResponse {
    process_run: ProcessRun;
    document_url: string;
    email_sent: boolean;
}

export async function sendNowForBinding(
    bindingId: number,
): Promise<SendNowResponse> {
    const { data } = await api.post<SendNowResponse>(
        `/api/processes/bindings/${bindingId}/send-now/`,
        {},
    );
    return data;
}

export async function sendNowForEmployee(
    employeeId: number,
    processTypeId: number,
): Promise<SendNowResponse> {
    const { data } = await api.post<SendNowResponse>(
        `/api/processes/employees/${employeeId}/send-now/`,
        { process_type_id: processTypeId },
    );
    return data;
}

export async function uploadClientCompanyRiskAssessmentAct(
    id: number,
    file: File,
): Promise<ClientCompany> {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<ClientCompany>(
        `/api/partners/client-companies/${id}/risk-assessment-act/`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
}

export async function clearClientCompanyRiskAssessmentAct(
    id: number,
): Promise<ClientCompany> {
    const { data } = await api.delete<ClientCompany>(
        `/api/partners/client-companies/${id}/risk-assessment-act/`,
    );
    return data;
}

function asList<T>(data: ListResponse<T> | undefined): T[] {
    if (Array.isArray(data)) return data;
    return (data as { results?: T[] })?.results ?? [];
}

export async function getRiskLevels(): Promise<RiskLevel[]> {
    const { data } = await api.get<ListResponse<RiskLevel>>(
        "/api/partners/risk-levels/",
    );
    return asList(data);
}

export async function getJobRoles(params?: {
    client_company_id?: number;
}): Promise<JobRole[]> {
    const search = new URLSearchParams();
    if (params?.client_company_id != null)
        search.set("client_company_id", String(params.client_company_id));
    const qs = search.toString();
    const url = qs
        ? `/api/partners/job-roles/?${qs}`
        : "/api/partners/job-roles/";
    const { data } = await api.get<ListResponse<JobRole>>(url);
    return asList(data);
}

export async function createJobRole(
    payload: Partial<JobRole>,
): Promise<JobRole> {
    const { data } = await api.post<JobRole>(
        "/api/partners/job-roles/",
        payload,
    );
    return data;
}

export async function updateJobRole(
    id: number,
    payload: Partial<JobRole>,
): Promise<JobRole> {
    const { data } = await api.patch<JobRole>(
        `/api/partners/job-roles/${id}/`,
        payload,
    );
    return data;
}

export async function deleteJobRole(id: number): Promise<void> {
    await api.delete(`/api/partners/job-roles/${id}/`);
}

export async function getEmployees(params?: {
    client_company_id?: number;
}): Promise<EmployeeSummary[]> {
    const search = new URLSearchParams();
    if (params?.client_company_id != null)
        search.set("client_company_id", String(params.client_company_id));
    const qs = search.toString();
    const url = qs
        ? `/api/partners/employees/?${qs}`
        : "/api/partners/employees/";
    const { data } = await api.get<ListResponse<EmployeeSummary>>(url);
    return asList(data);
}

export async function getEmployee(id: number): Promise<Employee> {
    const { data } = await api.get<Employee>(`/api/partners/employees/${id}/`);
    return data;
}

export async function createEmployee(
    payload: Partial<Employee>,
): Promise<Employee> {
    const { data } = await api.post<Employee>(
        "/api/partners/employees/",
        payload,
    );
    return data;
}

export async function getEquipment(params?: {
    client_company_id?: number;
}): Promise<EquipmentItem[]> {
    const search = new URLSearchParams();
    if (params?.client_company_id != null)
        search.set("client_company_id", String(params.client_company_id));
    const qs = search.toString();
    const url = qs
        ? `/api/partners/equipment/?${qs}`
        : "/api/partners/equipment/";
    const { data } = await api.get<ListResponse<EquipmentItem>>(url);
    return asList(data);
}

export async function getEquipmentItem(id: number): Promise<EquipmentItem> {
    const { data } = await api.get<EquipmentItem>(
        `/api/partners/equipment/${id}/`,
    );
    return data;
}

export async function createEquipmentItem(
    payload: Partial<EquipmentItem>,
): Promise<EquipmentItem> {
    const { data } = await api.post<EquipmentItem>(
        "/api/partners/equipment/",
        payload,
    );
    return data;
}

export async function getProcessTypes(): Promise<ProcessType[]> {
    const { data } = await api.get<ListResponse<ProcessType>>(
        "/api/processes/types/",
    );
    return asList(data);
}

export async function getProcessType(id: number): Promise<ProcessType> {
    const { data } = await api.get<ProcessType>(`/api/processes/types/${id}/`);
    return data;
}

export async function createProcessType(
    payload: Partial<ProcessType>,
): Promise<ProcessType> {
    const { data } = await api.post<ProcessType>(
        "/api/processes/types/",
        payload,
    );
    return data;
}

export async function updateProcessType(
    id: number,
    payload: Partial<ProcessType>,
): Promise<ProcessType> {
    const { data } = await api.patch<ProcessType>(
        `/api/processes/types/${id}/`,
        payload,
    );
    return data;
}

export async function deleteProcessType(id: number): Promise<void> {
    await api.delete(`/api/processes/types/${id}/`);
}

export async function createProcessTemplate(
    payload: Partial<ProcessTemplate>,
): Promise<ProcessTemplate> {
    const { data } = await api.post<ProcessTemplate>(
        "/api/processes/templates/",
        payload,
    );
    return data;
}

export async function updateProcessTemplate(
    id: number,
    payload: Partial<ProcessTemplate>,
): Promise<ProcessTemplate> {
    const { data } = await api.patch<ProcessTemplate>(
        `/api/processes/templates/${id}/`,
        payload,
    );
    return data;
}

export async function deleteProcessTemplate(id: number): Promise<void> {
    await api.delete(`/api/processes/templates/${id}/`);
}

export interface ProcessBindingsParams {
    client_company_id?: number;
    employee_id?: number;
    equipment_item_id?: number;
    process_type_id?: number;
    is_active?: boolean;
}

export async function getProcessBindings(
    params?: ProcessBindingsParams,
): Promise<ProcessBinding[]> {
    const search = new URLSearchParams();
    if (params?.client_company_id != null)
        search.set("client_company_id", String(params.client_company_id));
    if (params?.employee_id != null)
        search.set("employee_id", String(params.employee_id));
    if (params?.equipment_item_id != null)
        search.set("equipment_item_id", String(params.equipment_item_id));
    if (params?.process_type_id != null)
        search.set("process_type_id", String(params.process_type_id));
    if (params?.is_active != null)
        search.set("is_active", String(params.is_active));
    const qs = search.toString();
    const url = qs
        ? `/api/processes/bindings/?${qs}`
        : "/api/processes/bindings/";
    const { data } = await api.get<ListResponse<ProcessBinding>>(url);
    return asList(data);
}

export async function createProcessBinding(
    payload: Partial<ProcessBinding>,
): Promise<ProcessBinding> {
    const { data } = await api.post<ProcessBinding>(
        "/api/processes/bindings/",
        payload,
    );
    return data;
}

export async function updateProcessBinding(
    id: number,
    payload: Partial<ProcessBinding>,
): Promise<ProcessBinding> {
    const { data } = await api.patch<ProcessBinding>(
        `/api/processes/bindings/${id}/`,
        payload,
    );
    return data;
}

export async function deleteProcessBinding(id: number): Promise<void> {
    await api.delete(`/api/processes/bindings/${id}/`);
}

export interface ProcessRunsParams {
    client_company_id?: number;
    employee_id?: number;
    equipment_item_id?: number;
    process_type_id?: number;
    status?: string;
    from_valid_until?: string;
    to_valid_until?: string;
}

export async function getProcessRuns(
    params?: ProcessRunsParams,
): Promise<ProcessRun[]> {
    const search = new URLSearchParams();
    if (params?.client_company_id != null)
        search.set("client_company_id", String(params.client_company_id));
    if (params?.employee_id != null)
        search.set("employee_id", String(params.employee_id));
    if (params?.equipment_item_id != null)
        search.set("equipment_item_id", String(params.equipment_item_id));
    if (params?.process_type_id != null)
        search.set("process_type_id", String(params.process_type_id));
    if (params?.status != null) search.set("status", params.status);
    if (params?.from_valid_until != null)
        search.set("from_valid_until", params.from_valid_until);
    if (params?.to_valid_until != null)
        search.set("to_valid_until", params.to_valid_until);
    const qs = search.toString();
    const url = qs ? `/api/processes/runs/?${qs}` : "/api/processes/runs/";
    const { data } = await api.get<ListResponse<ProcessRun>>(url);
    return asList(data);
}

export interface CompleteProcessRunPayload {
    valid_until: string;
    performed_at?: string;
    notes?: string;
    result_data?: {
        report_number?: string;
        fitness_assessment?: string;
        measures_taken?: string;
    };
}

export async function completeProcessRun(
    id: number,
    payload: CompleteProcessRunPayload,
): Promise<ProcessRun> {
    const { data } = await api.post<ProcessRun>(
        `/api/processes/runs/${id}/complete/`,
        payload,
    );
    return data;
}

export async function getProcessRun(id: number): Promise<ProcessRun> {
    const { data } = await api.get<ProcessRun>(`/api/processes/runs/${id}/`);
    return data;
}

export async function uploadDocumentToRun(
    runId: number,
    file: File,
    title?: string,
): Promise<ProcessRunDocument> {
    const form = new FormData();
    form.append("file", file);
    if (title?.trim()) form.append("title", title.trim());
    const { data } = await api.post<ProcessRunDocument>(
        `/api/processes/runs/${runId}/documents/`,
        form,
        {
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        },
    );
    return data;
}

export async function getProcessRunNotes(
    runId: number,
): Promise<ProcessRunNote[]> {
    const { data } = await api.get<ProcessRunNote[]>(
        `/api/processes/runs/${runId}/notes/`,
    );
    return Array.isArray(data) ? data : [];
}

export async function postProcessRunNote(
    runId: number,
    payload: { body: string },
): Promise<ProcessRunNote> {
    const { data } = await api.post<ProcessRunNote>(
        `/api/processes/runs/${runId}/notes/`,
        payload,
    );
    return data;
}

export async function getProcessRunDocuments(
    runId: number,
): Promise<ProcessRunDocument[]> {
    const { data } = await api.get<ProcessRunDocument[]>(
        `/api/processes/runs/${runId}/documents/`,
    );
    return Array.isArray(data) ? data : [];
}

export async function attachDocumentToRun(
    runId: number,
    documentFileId: number,
    usageKind?: string,
): Promise<ProcessRunDocument> {
    const { data } = await api.post<ProcessRunDocument>(
        `/api/processes/runs/${runId}/documents/`,
        { document_file_id: documentFileId, usage_kind: usageKind ?? "REPORT" },
    );
    return data;
}

export async function removeDocumentFromRun(
    runId: number,
    docId: number,
): Promise<void> {
    await api.delete(`/api/processes/runs/${runId}/documents/${docId}/`);
}

export async function generateMedicalExamRecord(
    clientId: number,
): Promise<void> {
    const response = await api.get(
        `/api/partners/client-companies/${clientId}/medical-exam-record/`,
        { responseType: "blob" },
    );
    const url = window.URL.createObjectURL(
        new Blob([response.data as BlobPart]),
    );
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `medical_exam_record_${clientId}.docx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}
