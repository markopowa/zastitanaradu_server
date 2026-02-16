export interface DocumentCategory {
    id: string;
    code: string;
    name: string;
    description?: string;
}

export interface DocumentFile {
    id: string;
    category: DocumentCategory;
    title: string;
    file: string;
    uploadedAt: string;
    uploadedBy: string;
    validFrom?: string;
    validUntil?: string;
    version?: string;
    language?: string;
}

export interface DocumentsState {
    categories: DocumentCategory[];
    documents: DocumentFile[];
    loading: boolean;
    error?: string;
}


