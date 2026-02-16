import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api } from "../api/client";
import type { DocumentCategory, DocumentFile, DocumentsState } from "../types/documents";

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
            const response = await api.get<DocumentCategory[]>("/api/documents/categories/");
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue("Neuspešno učitavanje kategorija");
        }
    },
);

export const fetchDocuments = createAsyncThunk(
    "documents/fetchDocuments",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get<DocumentFile[]>("/api/documents/");
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue("Neuspešno učitavanje dokumenata");
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
                    (action.payload as string) ?? "Greška pri učitavanju kategorija";
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
                    (action.payload as string) ?? "Greška pri učitavanju dokumenata";
            });
    },
});

export default documentsSlice.reducer;


