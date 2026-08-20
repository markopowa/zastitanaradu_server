import {
    api,
    apiBaseUrl,
    filenameFromResponse,
    triggerBlobDownload,
} from "./client";
import type { VisualPlaceholder } from "./documents";
import type {
    ActivityLog,
    ActivityLogEventType,
    ClientCompany,
    ClientIntakeLink,
    ClientIntakeSubmission,
    ClientIntakeSubmissionStatus,
    CompanyDocument,
    CompanyDocumentKind,
    CompanyDocumentKindDef,
    CompanyGeneratedDocumentRow,
    CompanyObligationExclusion,
    ContactPerson,
    Employee,
    EmployeeDocumentRow,
    EmployeeSummary,
    EmployeeTraining,
    EquipmentItem,
    JobRole,
    JobRoleTemplateKey,
    NotificationOutbox,
    NotificationOutboxPreview,
    ObligationPlanRow,
    ProcessBinding,
    ProcessRun,
    ProcessRunNote,
    ProcessRunDocument,
    ProcessTemplate,
    ProcessType,
    TaskAssignment,
    CompanyComplianceFindingRow,
    ComplianceFindingType,
    RiskAssessmentAct,
    RiskAssessmentActAmendment,
    RiskAssessmentSectionType,
    RiskLevel,
    TestAttempt,
    TestAttemptPayload,
    TestQuestion,
    TrainingType,
    UpcomingDeadline,
    WorkInjury,
    WorkInjurySeverity,
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

export async function deleteClientCompany(id: number): Promise<void> {
    await api.delete(`/api/partners/client-companies/${id}/`);
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

export async function getRiskAssessmentAct(
    clientCompanyId: number,
): Promise<RiskAssessmentAct | null> {
    const { data } = await api.get<ListResponse<RiskAssessmentAct>>(
        "/api/partners/risk-assessment-acts/",
        { params: { client_company_id: clientCompanyId } },
    );
    const items = asList(data);
    return items[0] ?? null;
}

export async function createRiskAssessmentAct(
    clientCompanyId: number,
    actDate?: string | null,
): Promise<RiskAssessmentAct> {
    const { data } = await api.post<RiskAssessmentAct>(
        "/api/partners/risk-assessment-acts/",
        {
            client_company: clientCompanyId,
            act_date: actDate ?? null,
        },
    );
    return data;
}

export async function updateRiskAssessmentActDate(
    actId: number,
    actDate: string | null,
): Promise<RiskAssessmentAct> {
    const { data } = await api.patch<RiskAssessmentAct>(
        `/api/partners/risk-assessment-acts/${actId}/`,
        { act_date: actDate },
    );
    return data;
}

export async function uploadRiskAssessmentSectionRevision(
    actId: number,
    sectionType: RiskAssessmentSectionType,
    file: File,
    reason: string,
): Promise<RiskAssessmentAct> {
    const form = new FormData();
    form.append("file", file);
    form.append("reason", reason);
    const { data } = await api.post<RiskAssessmentAct>(
        `/api/partners/risk-assessment-acts/${actId}/sections/${sectionType}/revisions/`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
}

export function riskAssessmentActMergedPdfUrl(actId: number): string {
    return `/api/partners/risk-assessment-acts/${actId}/merged-pdf/`;
}

export async function downloadRiskAssessmentActMergedPdf(
    actId: number,
): Promise<Blob> {
    const { data } = await api.get<Blob>(riskAssessmentActMergedPdfUrl(actId), {
        responseType: "blob",
    });
    return data;
}

export async function getComplianceFindingTypes(): Promise<
    ComplianceFindingType[]
> {
    const { data } = await api.get<ListResponse<ComplianceFindingType>>(
        "/api/partners/compliance-finding-types/",
        { params: { is_active: true } },
    );
    return asList(data);
}

export async function getCompanyComplianceFindings(
    companyId: number,
): Promise<CompanyComplianceFindingRow[]> {
    const { data } = await api.get<CompanyComplianceFindingRow[]>(
        `/api/partners/client-companies/${companyId}/compliance-findings/`,
    );
    return data;
}

export async function uploadCompanyComplianceFinding(
    companyId: number,
    typeId: number,
    file: File,
    issuedDate: string,
): Promise<CompanyComplianceFindingRow> {
    const form = new FormData();
    form.append("file", file);
    form.append("issued_date", issuedDate);
    const { data } = await api.post<CompanyComplianceFindingRow>(
        `/api/partners/client-companies/${companyId}/compliance-findings/${typeId}/`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
}

export async function deleteCompanyComplianceFinding(
    companyId: number,
    typeId: number,
): Promise<void> {
    await api.delete(
        `/api/partners/client-companies/${companyId}/compliance-findings/${typeId}/`,
    );
}

export async function getRiskLevels(): Promise<RiskLevel[]> {
    const { data } = await api.get<ListResponse<RiskLevel>>(
        "/api/partners/risk-levels/",
    );
    return asList(data);
}

export async function createRiskLevel(
    payload: Partial<RiskLevel>,
): Promise<RiskLevel> {
    const { data } = await api.post<RiskLevel>(
        "/api/partners/risk-levels/",
        payload,
    );
    return data;
}

export async function updateRiskLevel(
    id: number,
    payload: Partial<RiskLevel>,
): Promise<RiskLevel> {
    const { data } = await api.patch<RiskLevel>(
        `/api/partners/risk-levels/${id}/`,
        payload,
    );
    return data;
}

export async function deleteRiskLevel(id: number): Promise<void> {
    await api.delete(`/api/partners/risk-levels/${id}/`);
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

export async function uploadJobRoleTemplate(
    roleId: number,
    templateKey: JobRoleTemplateKey,
    file: File,
): Promise<JobRole> {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<JobRole>(
        `/api/partners/job-roles/${roleId}/templates/${templateKey}/`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
}

export async function clearJobRoleTemplate(
    roleId: number,
    templateKey: JobRoleTemplateKey,
): Promise<JobRole> {
    const { data } = await api.delete<JobRole>(
        `/api/partners/job-roles/${roleId}/templates/${templateKey}/`,
    );
    return data;
}

export async function getEmployees(params?: {
    client_company_id?: number;
    search?: string;
    risk_level_id?: number;
}): Promise<EmployeeSummary[]> {
    const search = new URLSearchParams();
    if (params?.client_company_id != null)
        search.set("client_company_id", String(params.client_company_id));
    if (params?.search?.trim()) search.set("search", params.search.trim());
    if (params?.risk_level_id != null)
        search.set("risk_level_id", String(params.risk_level_id));
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

export async function updateEmployee(
    id: number,
    payload: Partial<Employee>,
): Promise<Employee> {
    const { data } = await api.patch<Employee>(
        `/api/partners/employees/${id}/`,
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

export async function updateEquipmentItem(
    id: number,
    payload: Partial<EquipmentItem>,
): Promise<EquipmentItem> {
    const { data } = await api.patch<EquipmentItem>(
        `/api/partners/equipment/${id}/`,
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

export async function generateRunDocument(
    runId: number,
): Promise<ProcessRunDocument> {
    const { data } = await api.post<ProcessRunDocument>(
        `/api/processes/runs/${runId}/generate-document/`,
    );
    return data;
}

export async function removeDocumentFromRun(
    runId: number,
    docId: number,
): Promise<void> {
    await api.delete(`/api/processes/runs/${runId}/documents/${docId}/`);
}

export async function getUpcomingDeadlines(params?: {
    client_company_id?: number;
    within_days?: number;
}): Promise<UpcomingDeadline[]> {
    const search = new URLSearchParams();
    if (params?.client_company_id != null) {
        search.set("client_company_id", String(params.client_company_id));
    }
    if (params?.within_days != null) {
        search.set("within_days", String(params.within_days));
    }
    const qs = search.toString();
    const url = qs
        ? `/api/processes/dashboard/upcoming-deadlines?${qs}`
        : "/api/processes/dashboard/upcoming-deadlines";
    const { data } = await api.get<ListResponse<UpcomingDeadline>>(url);
    return asList(data);
}

export async function generateHighRiskRegistry(
    clientId: number,
): Promise<void> {
    const response = await api.get(
        `/api/partners/client-companies/${clientId}/high-risk-registry/`,
        { responseType: "blob" },
    );
    triggerBlobDownload(
        response.data as BlobPart,
        filenameFromResponse(
            response.headers, `high_risk_registry_${clientId}.docx`),
    );
}

export async function generateMedicalExamRecord(
    clientId: number,
): Promise<void> {
    const response = await api.get(
        `/api/partners/client-companies/${clientId}/medical-exam-record/`,
        { responseType: "blob" },
    );
    triggerBlobDownload(
        response.data as BlobPart,
        filenameFromResponse(
            response.headers, `medical_exam_record_${clientId}.docx`),
    );
}

export async function generateInspectionBundle(
    clientId: number,
): Promise<void> {
    try {
        const response = await api.get(
            `/api/partners/client-companies/${clientId}/inspection-bundle/`,
            { responseType: "blob" },
        );
        triggerBlobDownload(
            response.data as BlobPart,
            filenameFromResponse(
                response.headers, `inspekcija_${clientId}.pdf`),
        );
    } catch (err) {
        throw new Error(await extractBlobErrorDetail(err));
    }
}

async function extractBlobErrorDetail(err: unknown): Promise<string> {
    const axiosErr = err as {
        response?: { data?: unknown };
        message?: string;
    };
    const data = axiosErr.response?.data;
    if (data instanceof Blob) {
        try {
            const text = await data.text();
            const parsed = JSON.parse(text) as { detail?: string };
            if (typeof parsed.detail === "string") {
                return parsed.detail;
            }
        } catch {
            return axiosErr.message ?? "Greška prilikom generisanja dokumenta.";
        }
    }
    return axiosErr.message ?? "Greška prilikom generisanja dokumenta.";
}

export async function generateEmployeeDocument(
    employeeId: number,
    kind: "OBRAZAC6" | "LZO_REVERS" | "POTVRDA_CLAN5",
    options?: { training_type_id?: number },
): Promise<void> {
    try {
        const response = await api.post(
            `/api/partners/employees/${employeeId}/generate-document/`,
            {
                kind,
                ...(options?.training_type_id != null
                    ? { training_type_id: options.training_type_id }
                    : {}),
            },
            { responseType: "blob" },
        );
        const url = window.URL.createObjectURL(
            new Blob([response.data as BlobPart]),
        );
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
            "download",
            `${kind.toLowerCase()}_${employeeId}.docx`,
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        throw new Error(await extractBlobErrorDetail(err));
    }
}

export async function generateCompanyObrazac6All(
    companyId: number,
): Promise<void> {
    try {
        const response = await api.post(
            `/api/partners/client-companies/${companyId}/generate-obrazac6-all/`,
            {},
            { responseType: "blob" },
        );
        const url = window.URL.createObjectURL(
            new Blob([response.data as BlobPart]),
        );
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `obrazac6_svi_zaposleni_${companyId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        throw new Error(await extractBlobErrorDetail(err));
    }
}

export async function getContactPersons(params: {
    client_company_id: number;
}): Promise<ContactPerson[]> {
    const search = new URLSearchParams();
    search.set("client_company_id", String(params.client_company_id));
    const { data } = await api.get<ListResponse<ContactPerson>>(
        `/api/partners/contact-persons/?${search.toString()}`,
    );
    return asList(data);
}

export async function createContactPerson(
    payload: Partial<ContactPerson>,
): Promise<ContactPerson> {
    const { data } = await api.post<ContactPerson>(
        "/api/partners/contact-persons/",
        payload,
    );
    return data;
}

export async function updateContactPerson(
    id: number,
    payload: Partial<ContactPerson>,
): Promise<ContactPerson> {
    const { data } = await api.patch<ContactPerson>(
        `/api/partners/contact-persons/${id}/`,
        payload,
    );
    return data;
}

export async function deleteContactPerson(id: number): Promise<void> {
    await api.delete(`/api/partners/contact-persons/${id}/`);
}

export async function getCompanyDocuments(params: {
    client_company_id: number;
}): Promise<CompanyDocument[]> {
    const search = new URLSearchParams();
    search.set("client_company_id", String(params.client_company_id));
    const { data } = await api.get<ListResponse<CompanyDocument>>(
        `/api/partners/company-documents/?${search.toString()}`,
    );
    return asList(data);
}

export async function uploadCompanyDocument(
    clientCompanyId: number,
    kind: CompanyDocumentKind,
    file: File,
): Promise<CompanyDocument> {
    const form = new FormData();
    form.append("client_company", String(clientCompanyId));
    form.append("kind", kind);
    form.append("file", file);
    const { data } = await api.post<CompanyDocument>(
        "/api/partners/company-documents/",
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
}

export async function deleteCompanyDocument(id: number): Promise<void> {
    await api.delete(`/api/partners/company-documents/${id}/`);
}

export async function getWorkInjuries(params: {
    client_company_id: number;
}): Promise<WorkInjury[]> {
    const search = new URLSearchParams();
    search.set("client_company_id", String(params.client_company_id));
    const { data } = await api.get<ListResponse<WorkInjury>>(
        `/api/partners/work-injuries/?${search.toString()}`,
    );
    return asList(data);
}

export async function createWorkInjury(payload: {
    client_company: number;
    employee: number;
    date: string;
    severity: WorkInjurySeverity;
    description?: string;
    report_file?: File | null;
}): Promise<WorkInjury> {
    const form = new FormData();
    form.append("client_company", String(payload.client_company));
    form.append("employee", String(payload.employee));
    form.append("date", payload.date);
    form.append("severity", payload.severity);
    if (payload.description) form.append("description", payload.description);
    if (payload.report_file) form.append("report_file", payload.report_file);
    const { data } = await api.post<WorkInjury>(
        "/api/partners/work-injuries/",
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
}

export async function deleteWorkInjury(id: number): Promise<void> {
    await api.delete(`/api/partners/work-injuries/${id}/`);
}

export async function getIntakeLinks(params: {
    client_company_id: number;
}): Promise<ClientIntakeLink[]> {
    const search = new URLSearchParams();
    search.set("client_company_id", String(params.client_company_id));
    const { data } = await api.get<ListResponse<ClientIntakeLink>>(
        `/api/partners/intake-links/?${search.toString()}`,
    );
    return asList(data);
}

export async function createIntakeLink(
    clientCompanyId: number,
): Promise<ClientIntakeLink> {
    const { data } = await api.post<ClientIntakeLink>(
        "/api/partners/intake-links/",
        { client_company: clientCompanyId },
    );
    return data;
}

export async function sendIntakeLink(
    id: number,
    to?: string,
): Promise<{ detail: string; to: string }> {
    const { data } = await api.post<{ detail: string; to: string }>(
        `/api/partners/intake-links/${id}/send/`,
        to ? { to } : {},
    );
    return data;
}

export async function getIntakeSubmissions(params: {
    client_company_id: number;
    status?: ClientIntakeSubmissionStatus;
}): Promise<ClientIntakeSubmission[]> {
    const search = new URLSearchParams();
    search.set("client_company_id", String(params.client_company_id));
    if (params.status) search.set("status", params.status);
    const { data } = await api.get<ListResponse<ClientIntakeSubmission>>(
        `/api/partners/intake-submissions/?${search.toString()}`,
    );
    return asList(data);
}

export async function approveIntakeSubmission(
    id: number,
): Promise<ClientIntakeSubmission> {
    const { data } = await api.post<ClientIntakeSubmission>(
        `/api/partners/intake-submissions/${id}/approve/`,
    );
    return data;
}

export async function rejectIntakeSubmission(
    id: number,
): Promise<ClientIntakeSubmission> {
    const { data } = await api.post<ClientIntakeSubmission>(
        `/api/partners/intake-submissions/${id}/reject/`,
    );
    return data;
}

export interface RegistryLookupResult {
    name?: string;
    registration_number?: string;
    address?: string;
    activity_code?: string;
    status?: string;
    legal_form?: string;
    data_cut_off_date?: string;
}

export async function registryLookup(
    registrationNumber: string,
): Promise<RegistryLookupResult> {
    const { data } = await api.post<RegistryLookupResult>(
        "/api/partners/registry-lookup/",
        { registration_number: registrationNumber },
    );
    return data;
}

export interface OutboxParams {
    status?: string;
    client_company_id?: number;
    date_from?: string;
    date_to?: string;
}

export async function getOutbox(
    params: OutboxParams = {},
): Promise<NotificationOutbox[]> {
    const search = new URLSearchParams();
    if (params.status) search.set("status", params.status);
    if (params.client_company_id != null)
        search.set("client_company_id", String(params.client_company_id));
    if (params.date_from) search.set("date_from", params.date_from);
    if (params.date_to) search.set("date_to", params.date_to);
    const qs = search.toString();
    const url = qs ? `/api/processes/outbox/?${qs}` : "/api/processes/outbox/";
    const { data } = await api.get<ListResponse<NotificationOutbox>>(url);
    return asList(data);
}

export async function retryOutboxRow(id: number): Promise<NotificationOutbox> {
    const { data } = await api.post<NotificationOutbox>(
        `/api/processes/outbox/${id}/retry/`,
        {},
    );
    return data;
}

export async function previewOutboxRow(
    id: number,
): Promise<NotificationOutboxPreview> {
    const { data } = await api.get<NotificationOutboxPreview>(
        `/api/processes/outbox/${id}/preview/`,
    );
    return data;
}

export async function getTaskAssignments(
    processRunId: number,
): Promise<TaskAssignment[]> {
    const { data } = await api.get<ListResponse<TaskAssignment>>(
        `/api/processes/task-assignments/?process_run_id=${processRunId}`,
    );
    return asList(data);
}

export async function createTaskAssignment(payload: {
    process_run: number;
    assigned_to: number;
    title: string;
    description?: string;
    due_date?: string | null;
}): Promise<TaskAssignment> {
    const { data } = await api.post<TaskAssignment>(
        "/api/processes/task-assignments/",
        payload,
    );
    return data;
}

export async function updateTaskAssignment(
    id: number,
    payload: Partial<
        Pick<TaskAssignment, "title" | "description" | "due_date" | "status">
    >,
): Promise<TaskAssignment> {
    const { data } = await api.patch<TaskAssignment>(
        `/api/processes/task-assignments/${id}/`,
        payload,
    );
    return data;
}

export async function deleteTaskAssignment(id: number): Promise<void> {
    await api.delete(`/api/processes/task-assignments/${id}/`);
}

export async function createRiskAssessmentActAmendment(
    actId: number,
    title: string,
    file: File,
    note?: string,
): Promise<RiskAssessmentActAmendment> {
    const form = new FormData();
    form.append("title", title);
    form.append("file", file);
    if (note?.trim()) form.append("note", note.trim());
    const { data } = await api.post<RiskAssessmentActAmendment>(
        `/api/partners/risk-assessment-acts/${actId}/amendments/`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
}

export async function deleteRiskAssessmentActAmendment(
    actId: number,
    amendmentId: number,
): Promise<void> {
    await api.delete(
        `/api/partners/risk-assessment-acts/${actId}/amendments/${amendmentId}/`,
    );
}

export async function getObligationPlan(
    companyId: number,
): Promise<ObligationPlanRow[]> {
    const { data } = await api.get<ObligationPlanRow[]>(
        `/api/partners/client-companies/${companyId}/obligation-plan/`,
    );
    return Array.isArray(data) ? data : [];
}

export async function createObligationExclusion(
    companyId: number,
    processTypeId: number,
    reason: string,
): Promise<CompanyObligationExclusion> {
    const { data } = await api.post<CompanyObligationExclusion>(
        `/api/partners/client-companies/${companyId}/obligation-plan/${processTypeId}/exclusion/`,
        { reason },
    );
    return data;
}

export async function getEmployeeDocuments(
    employeeId: number,
): Promise<EmployeeDocumentRow[]> {
    const { data } = await api.get<ListResponse<EmployeeDocumentRow>>(
        `/api/partners/employees/${employeeId}/documents/`,
    );
    return asList(data);
}

export async function getCompanyGeneratedDocuments(
    companyId: number,
): Promise<CompanyGeneratedDocumentRow[]> {
    const { data } = await api.get<ListResponse<CompanyGeneratedDocumentRow>>(
        `/api/partners/client-companies/${companyId}/generated-documents/`,
    );
    return asList(data);
}

export async function deleteObligationExclusion(
    companyId: number,
    processTypeId: number,
): Promise<void> {
    await api.delete(
        `/api/partners/client-companies/${companyId}/obligation-plan/${processTypeId}/exclusion/`,
    );
}

export async function getTrainingTypes(params?: {
    client_company_id?: number;
}): Promise<TrainingType[]> {
    const search = new URLSearchParams();
    if (params?.client_company_id != null)
        search.set("client_company_id", String(params.client_company_id));
    const qs = search.toString();
    const url = qs
        ? `/api/partners/training-types/?${qs}`
        : "/api/partners/training-types/";
    const { data } = await api.get<ListResponse<TrainingType>>(url);
    return asList(data);
}

export async function createTrainingType(
    payload: Partial<TrainingType>,
): Promise<TrainingType> {
    const { data } = await api.post<TrainingType>(
        "/api/partners/training-types/",
        payload,
    );
    return data;
}

export async function updateTrainingType(
    id: number,
    payload: Partial<TrainingType>,
): Promise<TrainingType> {
    const { data } = await api.patch<TrainingType>(
        `/api/partners/training-types/${id}/`,
        payload,
    );
    return data;
}

export async function deleteTrainingType(id: number): Promise<void> {
    await api.delete(`/api/partners/training-types/${id}/`);
}

export async function uploadTrainingTypeTemplate(
    id: number,
    file: File,
): Promise<TrainingType> {
    const form = new FormData();
    form.append("potvrda_template", file);
    const { data } = await api.patch<TrainingType>(
        `/api/partners/training-types/${id}/`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
}

export async function clearTrainingTypeTemplate(
    id: number,
): Promise<TrainingType> {
    const { data } = await api.patch<TrainingType>(
        `/api/partners/training-types/${id}/`,
        { potvrda_template: null },
    );
    return data;
}

export type BlankTemplateTarget =
    | "job-role-obrazac6"
    | "job-role-lzo"
    | "training-type-potvrda";

export function blankTemplatePagesStreamUrl(
    target: BlankTemplateTarget,
    id: number,
): string {
    return `${apiBaseUrl}/api/partners/blank-templates/${target}/${id}/pages/stream/`;
}

export async function regenerateBlankTemplatePages(
    target: BlankTemplateTarget,
    id: number,
): Promise<void> {
    await api.post(
        `/api/partners/blank-templates/${target}/${id}/regenerate-pages/`,
    );
}

export async function getBlankTemplateFields(
    target: BlankTemplateTarget,
    id: number,
): Promise<{
    placeholders: VisualPlaceholder[];
    master_placeholders: VisualPlaceholder[];
}> {
    const { data } = await api.get<{
        placeholders: VisualPlaceholder[];
        master_placeholders: VisualPlaceholder[];
    }>(`/api/partners/blank-templates/${target}/${id}/fields/`);
    return data;
}

export async function saveBlankTemplateFields(
    target: BlankTemplateTarget,
    id: number,
    placeholders: VisualPlaceholder[],
): Promise<VisualPlaceholder[]> {
    const { data } = await api.post<{ placeholders: VisualPlaceholder[] }>(
        `/api/partners/blank-templates/${target}/${id}/fields/`,
        { placeholders },
    );
    return data.placeholders;
}

export async function getEmployeeTrainings(params: {
    employee_id?: number;
    client_company_id?: number;
}): Promise<EmployeeTraining[]> {
    const search = new URLSearchParams();
    if (params.employee_id != null)
        search.set("employee_id", String(params.employee_id));
    if (params.client_company_id != null)
        search.set("client_company_id", String(params.client_company_id));
    const qs = search.toString();
    const url = qs
        ? `/api/partners/employee-trainings/?${qs}`
        : "/api/partners/employee-trainings/";
    const { data } = await api.get<ListResponse<EmployeeTraining>>(url);
    return asList(data);
}

export async function createEmployeeTraining(
    payload: Partial<EmployeeTraining>,
): Promise<EmployeeTraining> {
    const { data } = await api.post<EmployeeTraining>(
        "/api/partners/employee-trainings/",
        payload,
    );
    return data;
}

export async function deleteEmployeeTraining(id: number): Promise<void> {
    await api.delete(`/api/partners/employee-trainings/${id}/`);
}

export async function getCompanyDocumentKinds(): Promise<
    CompanyDocumentKindDef[]
> {
    const { data } = await api.get<ListResponse<CompanyDocumentKindDef>>(
        "/api/partners/company-document-kinds/",
    );
    return asList(data);
}

export async function getTestQuestions(
    clientCompanyId?: number | null,
): Promise<TestQuestion[]> {
    const search = new URLSearchParams();
    if (clientCompanyId != null) {
        search.set("client_company_id", String(clientCompanyId));
    }
    const qs = search.toString();
    const url = qs
        ? `/api/testing/questions/?${qs}`
        : "/api/testing/questions/";
    const { data } = await api.get<ListResponse<TestQuestion>>(url);
    return asList(data);
}

export async function submitTestAttempt(
    payload: TestAttemptPayload,
): Promise<TestAttempt> {
    const { data } = await api.post<TestAttempt>(
        "/api/testing/attempts/",
        payload,
    );
    return data;
}
