import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api } from "../api/client";
import type {
    DocumentCategory,
    DocumentFile,
    DocumentsState,
} from "../types/documents";

const initialState: DocumentsState = {
    categories: [],
    documents: [],
    loading: false,
    error: undefined,
};

export const fetchDocumentCategories = createAsyncThunk(
    "documents/fetchCategories",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get<
                DocumentCategory[] | { results: DocumentCategory[] }
            >("/api/documents/categories/");
            const data = response.data;
            return Array.isArray(data) ? data : (data?.results ?? []);
        } catch (error: unknown) {
            return rejectWithValue("Neuspešno učitavanje kategorija");
        }
    },
);

export const fetchDocuments = createAsyncThunk(
    "documents/fetchDocuments",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get<
                DocumentFile[] | { results: DocumentFile[] }
            >("/api/documents/");
            const data = response.data;
            return Array.isArray(data) ? data : (data?.results ?? []);
        } catch (error: unknown) {
            return rejectWithValue("Neuspešno učitavanje dokumenata");
        }
    },
);

export const createDocumentCategory = createAsyncThunk(
    "documents/createCategory",
    async (
        payload: { name: string; description?: string },
        { rejectWithValue, dispatch },
    ) => {
        try {
            await api.post("/api/documents/categories/", payload);
            dispatch(fetchDocumentCategories());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ??
                    "Greška pri kreiranju kategorije",
            );
        }
    },
);

export const updateDocumentCategory = createAsyncThunk(
    "documents/updateCategory",
    async (
        {
            id,
            ...payload
        }: { id: number; name: string; description?: string },
        { rejectWithValue, dispatch },
    ) => {
        try {
            await api.patch(`/api/documents/categories/${id}/`, payload);
            dispatch(fetchDocumentCategories());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ??
                    "Greška pri izmeni kategorije",
            );
        }
    },
);

export const deleteDocumentCategory = createAsyncThunk(
    "documents/deleteCategory",
    async (id: number, { rejectWithValue, dispatch }) => {
        try {
            await api.delete(`/api/documents/categories/${id}/`);
            dispatch(fetchDocumentCategories());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ??
                    "Greška pri brisanju kategorije",
            );
        }
    },
);

export const createDocument = createAsyncThunk(
    "documents/createDocument",
    async (
        payload: {
            category_id: number;
            title: string;
            file: File;
            valid_from?: string;
            valid_until?: string;
            version?: string;
            language?: string;
        },
        { rejectWithValue, dispatch },
    ) => {
        try {
            const form = new FormData();
            form.append("category_id", String(payload.category_id));
            form.append("title", payload.title);
            form.append("file", payload.file);
            if (payload.valid_from != null)
                form.append("valid_from", payload.valid_from);
            if (payload.valid_until != null)
                form.append("valid_until", payload.valid_until);
            if (payload.version != null)
                form.append("version", payload.version);
            if (payload.language != null)
                form.append("language", payload.language);
            await api.post("/api/documents/", form, {
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            });
            dispatch(fetchDocuments());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ??
                    "Greška pri otpremanju dokumenta",
            );
        }
    },
);

export const updateDocument = createAsyncThunk(
    "documents/updateDocument",
    async (
        payload: {
            id: number;
            category_id?: number;
            title?: string;
            file?: File;
            valid_from?: string;
            valid_until?: string;
            version?: string;
            language?: string;
        },
        { rejectWithValue, dispatch },
    ) => {
        try {
            const form = new FormData();
            if (payload.category_id != null)
                form.append("category_id", String(payload.category_id));
            if (payload.title != null) form.append("title", payload.title);
            if (payload.file != null) form.append("file", payload.file);
            if (payload.valid_from != null)
                form.append("valid_from", payload.valid_from);
            if (payload.valid_until != null)
                form.append("valid_until", payload.valid_until);
            if (payload.version != null)
                form.append("version", payload.version);
            if (payload.language != null)
                form.append("language", payload.language);
            await api.patch(`/api/documents/${payload.id}/`, form, {
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            });
            dispatch(fetchDocuments());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ??
                    "Greška pri izmeni dokumenta",
            );
        }
    },
);

const documentsSlice = createSlice({
    name: "documents",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchDocumentCategories.pending, (state) => {
                state.loading = true;
                state.error = undefined;
            })
            .addCase(fetchDocumentCategories.fulfilled, (state, action) => {
                state.loading = false;
                state.categories = action.payload;
            })
            .addCase(fetchDocumentCategories.rejected, (state, action) => {
                state.loading = false;
                state.error =
                    (action.payload as string) ??
                    "Greška pri učitavanju kategorija";
            })
            .addCase(fetchDocuments.pending, (state) => {
                state.loading = true;
                state.error = undefined;
            })
            .addCase(fetchDocuments.fulfilled, (state, action) => {
                state.loading = false;
                state.documents = action.payload;
            })
            .addCase(fetchDocuments.rejected, (state, action) => {
                state.loading = false;
                state.error =
                    (action.payload as string) ??
                    "Greška pri učitavanju dokumenata";
            });
    },
});

export default documentsSlice.reducer;
