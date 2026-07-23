import { api, filenameFromResponse, triggerBlobDownload } from "./client";

export type HazardKind = "OPASNOST" | "STETNOST";
export type KinneyFactor = "V" | "I" | "P";

export interface Hazard {
    id: number;
    code: string;
    label: string;
    kind: HazardKind;
    kind_display: string;
    description: string;
    order: number;
    is_active: boolean;
}

export interface KinneyScaleOption {
    id: number;
    factor: KinneyFactor;
    factor_display: string;
    value: number;
    label: string;
    order: number;
}

export interface JobRoleHazard {
    id: number;
    job_role: number;
    hazard: number;
    hazard_label: string;
    hazard_kind: HazardKind;
    verovatnoca: number;
    izlozenost: number;
    posledica: number;
    rizik: number;
    risk_category: string;
    risk_category_label: string;
    mere: string;
    order: number;
}

type ListResponse<T> = T[] | { results?: T[] };

function asList<T>(data: ListResponse<T> | undefined): T[] {
    if (Array.isArray(data)) return data;
    return data?.results ?? [];
}

export async function getHazards(activeOnly = false): Promise<Hazard[]> {
    const { data } = await api.get<ListResponse<Hazard>>(
        "/api/partners/hazards/",
        { params: activeOnly ? { is_active: true } : {} },
    );
    return asList(data);
}

export async function createHazard(
    payload: Partial<Hazard>,
): Promise<Hazard> {
    const { data } = await api.post<Hazard>(
        "/api/partners/hazards/",
        payload,
    );
    return data;
}

export async function updateHazard(
    id: number,
    payload: Partial<Hazard>,
): Promise<Hazard> {
    const { data } = await api.patch<Hazard>(
        `/api/partners/hazards/${id}/`,
        payload,
    );
    return data;
}

export async function deleteHazard(id: number): Promise<void> {
    await api.delete(`/api/partners/hazards/${id}/`);
}

export async function getKinneyScaleOptions(): Promise<KinneyScaleOption[]> {
    const { data } = await api.get<ListResponse<KinneyScaleOption>>(
        "/api/partners/kinney-scale-options/",
    );
    return asList(data);
}

export async function getJobRoleHazards(
    jobRoleId: number,
): Promise<JobRoleHazard[]> {
    const { data } = await api.get<ListResponse<JobRoleHazard>>(
        "/api/partners/job-role-hazards/",
        { params: { job_role_id: jobRoleId } },
    );
    return asList(data);
}

export async function createJobRoleHazard(
    payload: Partial<JobRoleHazard>,
): Promise<JobRoleHazard> {
    const { data } = await api.post<JobRoleHazard>(
        "/api/partners/job-role-hazards/",
        payload,
    );
    return data;
}

export async function updateJobRoleHazard(
    id: number,
    payload: Partial<JobRoleHazard>,
): Promise<JobRoleHazard> {
    const { data } = await api.patch<JobRoleHazard>(
        `/api/partners/job-role-hazards/${id}/`,
        payload,
    );
    return data;
}

export async function deleteJobRoleHazard(id: number): Promise<void> {
    await api.delete(`/api/partners/job-role-hazards/${id}/`);
}

export async function generateRiskAssessmentActDoc(
    clientId: number,
): Promise<void> {
    const response = await api.get(
        `/api/partners/client-companies/${clientId}/risk-assessment-act-generated/`,
        { responseType: "blob" },
    );
    triggerBlobDownload(
        response.data as BlobPart,
        filenameFromResponse(
            response.headers, `akt_o_proceni_rizika_${clientId}.docx`),
    );
}

export interface BzrDocumentKind {
    kind: string;
    label: string;
}

export async function getBzrDocumentCatalog(): Promise<BzrDocumentKind[]> {
    const { data } = await api.get<BzrDocumentKind[]>(
        "/api/partners/client-companies/bzr-documents-catalog/",
    );
    return data;
}

export async function downloadBzrDocument(
    clientId: number,
    kind: string,
    label: string,
): Promise<void> {
    const response = await api.get(
        `/api/partners/client-companies/${clientId}/bzr-document/`,
        { params: { kind }, responseType: "blob" },
    );
    const url = window.URL.createObjectURL(
        new Blob([response.data as BlobPart]),
    );
    const safe = label.replace(/[^\wČĆŠĐŽčćšđž]+/g, "_");
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${safe}.docx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}

export interface JobRoleLZO {
    id: number;
    job_role: number;
    name: string;
    standard: string;
    interval_months: number | null;
    order: number;
}

export async function getJobRoleLZO(jobRoleId: number): Promise<JobRoleLZO[]> {
    const { data } = await api.get<JobRoleLZO[] | { results?: JobRoleLZO[] }>(
        "/api/partners/job-role-lzo/",
        { params: { job_role_id: jobRoleId } },
    );
    return Array.isArray(data) ? data : (data.results ?? []);
}

export async function createJobRoleLZO(
    payload: Partial<JobRoleLZO>,
): Promise<JobRoleLZO> {
    const { data } = await api.post<JobRoleLZO>(
        "/api/partners/job-role-lzo/", payload);
    return data;
}

export async function updateJobRoleLZO(
    id: number, payload: Partial<JobRoleLZO>,
): Promise<JobRoleLZO> {
    const { data } = await api.patch<JobRoleLZO>(
        `/api/partners/job-role-lzo/${id}/`, payload);
    return data;
}

export async function deleteJobRoleLZO(id: number): Promise<void> {
    await api.delete(`/api/partners/job-role-lzo/${id}/`);
}

export interface RoleLzoTemplateItem {
    id: number;
    role_name: string;
    name: string;
    standard: string;
    interval_months: number | null;
    order: number;
}

export async function getRoleLzoTemplate(
    roleName: string,
): Promise<RoleLzoTemplateItem[]> {
    const { data } = await api.get<
        RoleLzoTemplateItem[] | { results?: RoleLzoTemplateItem[] }
    >("/api/partners/role-lzo-templates/", {
        params: { role_name: roleName },
    });
    return Array.isArray(data) ? data : (data.results ?? []);
}

export async function applyRoleLzoTemplate(
    jobRoleId: number,
): Promise<{ created: number; items: JobRoleLZO[] }> {
    const { data } = await api.post<{ created: number; items: JobRoleLZO[] }>(
        `/api/partners/job-roles/${jobRoleId}/apply-lzo-template/`,
    );
    return data;
}
