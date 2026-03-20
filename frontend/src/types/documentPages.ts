import type { DocumentTemplate } from "../api/documents";

import type { DocumentCategory, DocumentFile } from "./documents";

export type DocumentTemplatesListContextType =
    | DocumentTemplate["context_type"]
    | "";

export type DocumentTemplatesListPageStateProps = Record<string, never>;

export interface DocumentTemplatesListPageDispatchProps {
    setLastPath?: (path: string) => void;
}

export type DocumentTemplatesListPageProps =
    DocumentTemplatesListPageStateProps &
        DocumentTemplatesListPageDispatchProps;

export interface DocumentTemplatesListPageState {
    items: DocumentTemplate[];
    categories: DocumentCategory[];
    documents: DocumentFile[];
    loading: boolean;
    error: string | null;
    dialogOpen: boolean;
    deleteConfirmId: number | null;
    editingId: number | null;
    name: string;
    description: string;
    category_id: string;
    context_type: DocumentTemplatesListContextType;
    create_mode: "FROM_DOCUMENT" | "FROM_FILE";
    document_file_id: string;
    upload_file: File | null;
    filter_context_type: DocumentTemplatesListContextType;
}

export interface DocumentsListPageStateProps {
    documents: DocumentFile[];
    categories: DocumentCategory[];
    error?: string;
}

export interface DocumentsListPageDispatchProps {
    fetchDocuments: () => void;
    fetchDocumentCategories: () => void;
    createDocument: (p: {
        category_id: number;
        title: string;
        file: File;
        valid_from?: string;
        valid_until?: string;
        version?: string;
        language?: string;
    }) => void;
    updateDocument: (p: {
        id: number;
        category_id?: number;
        title?: string;
        file?: File;
        valid_from?: string;
        valid_until?: string;
        version?: string;
        language?: string;
    }) => void;
    setLastPath: (path: string) => void;
}

export type DocumentsListPageProps = DocumentsListPageStateProps &
    DocumentsListPageDispatchProps;

export interface DocumentsListPageState {
    dialogOpen: boolean;
    editingDoc: DocumentFile | null;
    category_id: number | "";
    title: string;
    file: File | null;
    valid_from: string;
    valid_until: string;
    version: string;
    language: string;
}

export interface DocumentCategoriesListPageStateProps {
    categories: DocumentCategory[];
    error?: string;
}

export interface DocumentCategoriesListPageDispatchProps {
    fetchDocumentCategories: () => void;
    createDocumentCategory: (p: { name: string; description?: string }) => void;
    updateDocumentCategory: (p: {
        id: number;
        name: string;
        description?: string;
    }) => void;
    deleteDocumentCategory: (id: number) => void;
    setLastPath: (path: string) => void;
}

export type DocumentCategoriesListPageProps =
    DocumentCategoriesListPageStateProps &
        DocumentCategoriesListPageDispatchProps;

export interface DocumentCategoriesListPageState {
    dialogOpen: boolean;
    editingId: number | null;
    name: string;
    description: string;
    deleteConfirmId: number | null;
}
