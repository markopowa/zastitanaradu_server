export interface DocumentCategory {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export interface DocumentFile {
  id: number;
  category: DocumentCategory;
  title: string;
  file: string;
  uploaded_at: string;
  uploaded_by: number | string;
  valid_from?: string;
  valid_until?: string;
  version?: string;
  language?: string;
}

export interface DocumentsState {
  categories: DocumentCategory[];
  documents: DocumentFile[];
  loading: boolean;
  error?: string;
}
