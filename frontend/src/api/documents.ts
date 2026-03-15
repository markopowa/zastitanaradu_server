import { api } from "./client";
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
}

export async function getDocumentTemplatePages(
    id: number,
): Promise<string[]> {
    const { data } = await api.get<string[]>(
        `/api/documents/templates/${id}/pages/`,
    );
    return data;
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
