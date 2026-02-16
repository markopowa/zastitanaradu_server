import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from '@reduxjs/toolkit';

import { api, setTokens } from "../api/client";
import type { AuthState, AuthUser, Role } from "../types/auth";

const initialState: AuthState = {
    accessToken: undefined,
    refreshToken: undefined,
    user: undefined,
    isAuthenticated: false,
    loading: false,
    error: undefined,
    users: [],
    roles: [],
    adminLoading: false,
    adminError: undefined,
};

interface LoginPayload {
    username: string;
    password: string;
}

export const login = createAsyncThunk(
    "auth/login",
    async (payload: LoginPayload, { rejectWithValue }) => {
        try {
            const response = await api.post("/auth/login/", payload);
            return response.data as {
                access: string;
                refresh: string;
                user: AuthUser;
            };
        } catch (error: unknown) {
            return rejectWithValue("Neuspešna prijava");
        }
    },
);

export const loadMe = createAsyncThunk(
    "auth/loadMe",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/auth/me/");
            return response.data as AuthUser;
        } catch (error: unknown) {
            return rejectWithValue("Neuspešno učitavanje profila");
        }
    },
);

export const loadUsers = createAsyncThunk(
    "auth/loadUsers",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get<AuthUser[]>("/auth/users/");
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue("Neuspešno učitavanje korisnika");
        }
    },
);

export const loadRoles = createAsyncThunk(
    "auth/loadRoles",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get<Role[]>("/auth/roles/");
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue("Neuspešno učitavanje rola");
        }
    },
);

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        logoutCompleted(state) {
            state.accessToken = undefined;
            state.refreshToken = undefined;
            state.user = undefined;
            state.isAuthenticated = false;
            state.error = undefined;
            setTokens(undefined, undefined);
        },
        setAuthUser(state, action: PayloadAction<AuthUser | undefined>) {
            state.user = action.payload;
            state.isAuthenticated = Boolean(action.payload);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => {
                state.loading = true;
                state.error = undefined;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.loading = false;
                state.accessToken = action.payload.access;
                state.refreshToken = action.payload.refresh;
                state.user = action.payload.user;
                state.isAuthenticated = true;
                setTokens(action.payload.access, action.payload.refresh);
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false;
                state.error = (action.payload as string) ?? "Greška pri prijavi";
            })
            .addCase(loadMe.pending, (state) => {
                state.loading = true;
            })
            .addCase(loadMe.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(loadMe.rejected, (state) => {
                state.loading = false;
                state.isAuthenticated = false;
                state.user = undefined;
            })
            .addCase(loadUsers.pending, (state) => {
                state.adminLoading = true;
                state.adminError = undefined;
            })
            .addCase(loadUsers.fulfilled, (state, action) => {
                state.adminLoading = false;
                state.users = action.payload;
            })
            .addCase(loadUsers.rejected, (state, action) => {
                state.adminLoading = false;
                state.adminError =
                    (action.payload as string) ?? "Greška pri učitavanju korisnika";
            })
            .addCase(loadRoles.pending, (state) => {
                state.adminLoading = true;
                state.adminError = undefined;
            })
            .addCase(loadRoles.fulfilled, (state, action) => {
                state.adminLoading = false;
                state.roles = action.payload;
            })
            .addCase(loadRoles.rejected, (state, action) => {
                state.adminLoading = false;
                state.adminError =
                    (action.payload as string) ?? "Greška pri učitavanju rola";
            });
    },
});

export const { logoutCompleted, setAuthUser } = authSlice.actions;
export default authSlice.reducer;


