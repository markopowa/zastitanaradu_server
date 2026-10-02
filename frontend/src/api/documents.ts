import { api, apiBaseUrl, getAll } from "./client";
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

export async function getDocumentCategories(): Promise<DocumentCategory[]> {
    return getAll<DocumentCategory>("/api/documents/categories/");
}

export async function getDocumentTemplates(): Promise<DocumentTemplate[]> {
    return getAll<DocumentTemplate>("/api/documents/templates/");
}

export async function getDocumentFiles(): Promise<DocumentFile[]> {
    return getAll<DocumentFile>("/api/documents/");
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
    return getAll<TemplateFieldDefinition>("/api/documents/template-fields/");
}

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

export function documentTemplatePagesStreamUrl(id: number): string {
    return `${apiBaseUrl}/api/documents/templates/${id}/pages/stream/`;
}

export interface DocumentTemplatePlaceholderTag {
    key: string;
    label: string;
}

export async function getDocumentTemplatePlaceholderTags(
    id: number,
): Promise<DocumentTemplatePlaceholderTag[]> {
    const { data } = await api.get<DocumentTemplatePlaceholderTag[]>(
        `/api/documents/templates/${id}/placeholder-tags/`,
    );
    return Array.isArray(data) ? data : [];
}

export async function previewTemplate(id: number): Promise<Blob> {
    const { data } = await api.post<Blob>(
        `/api/documents/templates/${id}/preview/`,
        {},
        { responseType: "blob" },
    );
    return data;
}
