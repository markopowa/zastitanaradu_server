import { api, apiBaseUrl } from "./client";
import type { DocumentCategory, DocumentFile } from "../types/documents";

export interface DocumentTemplate {
    id: number;
    name: string;
    description?: string;
    category: DocumentCategory | null;
    template_body?: string;
    template_file?: string | null;
    source_document_file_id?: number | null;
    context_type: "EMPLOYEE" | "EQUIPMENT" | "CLIENT_COMPANY" | "MIXED";
    generation_config?: Record<string, unknown> | null;
}

type ListResponse<T> = T[] | { results?: T[] };

function asList<T>(data: ListResponse<T>): T[] {
    if (Array.isArray(data)) return data;
    return data.results ?? [];
}

export async function getDocumentCategories(): Promise<DocumentCategory[]> {
    const { data } = await api.get<ListResponse<DocumentCategory>>(
        "/api/documents/categories/",
    );
    return asList(data);
}

export async function getDocumentTemplates(): Promise<DocumentTemplate[]> {
    const { data } = await api.get<ListResponse<DocumentTemplate>>(
        "/api/documents/templates/",
    );
    return asList(data);
}

export async function getDocumentFiles(): Promise<DocumentFile[]> {
    const { data } =
        await api.get<ListResponse<DocumentFile>>("/api/documents/");
    return asList(data);
}

export async function createDocumentTemplateFromDocument(payload: {
    document_file_id: number;
    context_type: DocumentTemplate["context_type"];
    name?: string;
    description?: string;
    category_id?: number | null;
}): Promise<DocumentTemplate> {
    const { data } = await api.post<DocumentTemplate>(
        "/api/documents/templates/from-document/",
        payload,
    );
    return data;
}

export async function createDocumentTemplateFromUpload(payload: {
    file: File;
    context_type: DocumentTemplate["context_type"];
    name?: string;
    description?: string;
    category_id?: number | null;
}): Promise<DocumentTemplate> {
    const formData = new FormData();
    formData.append("file", payload.file);
    formData.append("context_type", payload.context_type);
    if (payload.name) formData.append("name", payload.name);
    if (payload.description)
        formData.append("description", payload.description);
    if (payload.category_id != null) {
        formData.append("category_id", String(payload.category_id));
    }

    const { data } = await api.post<DocumentTemplate>(
        "/api/documents/templates/from-file/",
        formData,
        {
            headers: { "Content-Type": "multipart/form-data" },
        },
    );
    return data;
}

export async function createDocumentTemplate(
    payload: Partial<Omit<DocumentTemplate, "id" | "category">> & {
        name: string;
        context_type: DocumentTemplate["context_type"];
        category_id?: number | null;
    },
): Promise<DocumentTemplate> {
    const { data } = await api.post<DocumentTemplate>(
        "/api/documents/templates/",
        payload,
    );
    return data;
}

export async function updateDocumentTemplate(
    id: number,
    payload: Partial<Omit<DocumentTemplate, "id" | "category">> & {
        name?: string;
        context_type?: DocumentTemplate["context_type"];
        category_id?: number | null;
    },
): Promise<DocumentTemplate> {
    const { data } = await api.patch<DocumentTemplate>(
        `/api/documents/templates/${id}/`,
        payload,
    );
    return data;
}

export async function setDocumentTemplateFile(
    id: number,
    payload: { file?: File; document_file_id?: number },
): Promise<DocumentTemplate> {
    const formData = new FormData();
    if (payload.file) formData.append("file", payload.file);
    if (payload.document_file_id != null) {
        formData.append("document_file_id", String(payload.document_file_id));
    }
    const { data } = await api.post<DocumentTemplate>(
        `/api/documents/templates/${id}/set-file/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
}

export async function deleteDocumentTemplate(id: number): Promise<void> {
    await api.delete(`/api/documents/templates/${id}/`);
}

export interface VisualPlaceholder {
    id: string;
    fieldKey: string;
    page: number;
    xPct: number;
    yPct: number;
    widthPct: number;
    heightPct: number;
    fixedText?: string;
    fontSize?: number;
}

export interface TemplateFieldDefinition {
    id: number;
    key: string;
    label: string;
    category: "EMPLOYEE" | "EQUIPMENT" | "CLIENT_COMPANY" | "PROCESS";
    order: number;
    is_active: boolean;
}

export async function getTemplateFieldDefinitions(): Promise<
    TemplateFieldDefinition[]
> {
    const { data } = await api.get<ListResponse<TemplateFieldDefinition>>(
        "/api/documents/template-fields/",
    );
    return asList(data);
}

// Page images are rendered asynchronously on the backend (can take minutes for
// large documents). Clients subscribe to the SSE stream below and are pushed a
// `done` event with the ready image URLs — no polling. The plain endpoint below
// stays available for non-streaming callers (200 = ready, 202 = generating).
export type TemplatePagesResult =
    | { status: "ready"; pages: string[] }
    | { status: "generating" };

export async function getDocumentTemplatePages(
    id: number,
): Promise<TemplatePagesResult> {
    const res = await api.get<string[] | { status: string }>(
        `/api/documents/templates/${id}/pages/`,
        { validateStatus: (s) => s === 200 || s === 202 },
    );
    if (res.status === 202) {
        return { status: "generating" };
    }
    return { status: "ready", pages: res.data as string[] };
}

// URL for the Server-Sent Events stream that pushes page-image progress. The
// backend starts generation on connect and emits a `done` (or `failed`) event
// when finished; the browser's EventSource reconnects on its own if the
// connection drops mid-generation.
export function documentTemplatePagesStreamUrl(id: number): string {
    return `${apiBaseUrl}/api/documents/templates/${id}/pages/stream/`;
}

export async function saveVisualPlaceholders(
    id: number,
    placeholders: VisualPlaceholder[],
): Promise<DocumentTemplate> {
    const { data } = await api.patch<DocumentTemplate>(
        `/api/documents/templates/${id}/`,
        {
            generation_config: {
                mode: "VISUAL",
                placeholders,
            },
        },
    );
    return data;
}

export async function previewTemplate(
    id: number,
    placeholders: VisualPlaceholder[],
): Promise<Blob> {
    const { data } = await api.post<Blob>(
        `/api/documents/templates/${id}/preview/`,
        { placeholders },
        { responseType: "blob" },
    );
    return data;
}
