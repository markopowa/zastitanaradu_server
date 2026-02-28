import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import * as tokenManager from "../api/tokenManager";
import { api } from "../api/client";
import type { AuthState, AuthUser, Permission, Role } from "../types/auth";

const initialState: AuthState = {
  accessToken: undefined,
  refreshToken: undefined,
  user: undefined,
  isAuthenticated: false,
  initialized: false,
  loading: false,
  error: undefined,
  users: [],
  roles: [],
  permissions: [],
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
      const result = await tokenManager.login(
        payload.username,
        payload.password,
      );
      return { user: result.user };
    } catch (error: unknown) {
      return rejectWithValue("Neuspešna prijava");
    }
  },
);

export const loadMe = createAsyncThunk(
  "auth/loadMe",
  async (_, { rejectWithValue }) => {
    try {
      return await tokenManager.getSession();
    } catch (error: unknown) {
      return rejectWithValue("Neuspešno učitavanje profila");
    }
  },
);

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (
    payload: { username: string; first_name: string; last_name: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await api.patch<AuthUser>("/auth/me/", payload);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: Record<string, unknown> } };
      const detail = err?.response?.data?.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail
                .map((e: { msg?: string }) => e?.msg ?? JSON.stringify(e))
                .join(" ")
            : JSON.stringify(
                err?.response?.data ?? "Greška pri izmeni profila",
              );
      return rejectWithValue(msg);
    }
  },
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { dispatch }) => {
    try {
      await tokenManager.logout();
    } finally {
      dispatch(authSlice.actions.logoutCompleted());
    }
  },
);

export const loadUsers = createAsyncThunk(
  "auth/loadUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<AuthUser[] | { results: AuthUser[] }>(
        "/auth/users/",
      );
      const data = response.data;
      return Array.isArray(data) ? data : (data?.results ?? []);
    } catch (error: unknown) {
      return rejectWithValue("Neuspešno učitavanje korisnika");
    }
  },
);

export const loadRoles = createAsyncThunk(
  "auth/loadRoles",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<Role[] | { results: Role[] }>(
        "/auth/roles/",
      );
      const data = response.data;
      return Array.isArray(data) ? data : (data?.results ?? []);
    } catch (error: unknown) {
      return rejectWithValue("Neuspešno učitavanje rola");
    }
  },
);

export const loadPermissions = createAsyncThunk(
  "auth/loadPermissions",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<Permission[]>("/auth/permissions/");
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      return rejectWithValue("Neuspešno učitavanje permisija");
    }
  },
);

export const createRole = createAsyncThunk(
  "auth/createRole",
  async (
    payload: { name: string; permissions: number[] },
    { rejectWithValue, dispatch },
  ) => {
    try {
      await api.post("/auth/roles/", payload);
      dispatch(loadRoles());
    } catch (error: unknown) {
      return rejectWithValue(
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Greška pri kreiranju role",
      );
    }
  },
);

export const updateRole = createAsyncThunk(
  "auth/updateRole",
  async (
    {
      id,
      name,
      permissions,
    }: { id: number; name: string; permissions: number[] },
    { rejectWithValue, dispatch },
  ) => {
    try {
      await api.patch(`/auth/roles/${id}/`, { name, permissions });
      dispatch(loadRoles());
    } catch (error: unknown) {
      return rejectWithValue(
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Greška pri izmeni role",
      );
    }
  },
);

export const deleteRole = createAsyncThunk(
  "auth/deleteRole",
  async (id: number, { rejectWithValue, dispatch }) => {
    try {
      await api.delete(`/auth/roles/${id}/`);
      dispatch(loadRoles());
    } catch (error: unknown) {
      return rejectWithValue(
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Greška pri brisanju role",
      );
    }
  },
);

export const createUser = createAsyncThunk(
  "auth/createUser",
  async (
    payload: {
      username: string;
      first_name: string;
      last_name: string;
      email: string;
      password: string;
      is_active?: boolean;
      roles?: number[];
    },
    { rejectWithValue, dispatch },
  ) => {
    try {
      await api.post("/auth/users/", {
        ...payload,
        is_active: payload.is_active ?? true,
        roles: payload.roles ?? [],
      });
      dispatch(loadUsers());
    } catch (error: unknown) {
      const err = error as { response?: { data?: Record<string, unknown> } };
      const msg =
        typeof err?.response?.data?.detail === "string"
          ? err.response.data.detail
          : JSON.stringify(
              err?.response?.data ?? "Greška pri kreiranju korisnika",
            );
      return rejectWithValue(msg);
    }
  },
);

export const updateUser = createAsyncThunk(
  "auth/updateUser",
  async (
    {
      id,
      username,
      first_name,
      last_name,
      email,
      is_active,
      roles,
      password,
    }: {
      id: number;
      username: string;
      first_name: string;
      last_name: string;
      email: string;
      is_active: boolean;
      roles: number[];
      password?: string;
    },
    { rejectWithValue, dispatch },
  ) => {
    try {
      const body: Record<string, unknown> = {
        username,
        first_name,
        last_name,
        email,
        is_active,
        roles,
      };
      if (password != null && password !== "") body.password = password;
      await api.patch(`/auth/users/${id}/`, body);
      dispatch(loadUsers());
    } catch (error: unknown) {
      const err = error as { response?: { data?: Record<string, unknown> } };
      const msg =
        typeof err?.response?.data?.detail === "string"
          ? err.response.data.detail
          : JSON.stringify(
              err?.response?.data ?? "Greška pri izmeni korisnika",
            );
      return rejectWithValue(msg);
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
      state.initialized = true;
      state.error = undefined;
    },
    setAuthUser(state, action: PayloadAction<AuthUser | undefined>) {
      state.user = action.payload;
      state.isAuthenticated = Boolean(action.payload);
    },
    clearAdminError(state) {
      state.adminError = undefined;
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
        state.user = action.payload.user;
        state.isAuthenticated = true;
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
        state.initialized = true;
      })
      .addCase(loadMe.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = undefined;
        state.initialized = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.error = (action.payload as string) ?? "Greška pri izmeni profila";
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
      })
      .addCase(loadPermissions.fulfilled, (state, action) => {
        state.permissions = action.payload;
      })
      .addCase(createRole.rejected, (state, action) => {
        state.adminError = (action.payload as string) ?? "Greška";
      })
      .addCase(updateRole.rejected, (state, action) => {
        state.adminError = (action.payload as string) ?? "Greška";
      })
      .addCase(deleteRole.rejected, (state, action) => {
        state.adminError = (action.payload as string) ?? "Greška";
      })
      .addCase(createUser.rejected, (state, action) => {
        state.adminError = (action.payload as string) ?? "Greška";
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.adminError = (action.payload as string) ?? "Greška";
      });
  },
});

export const { logoutCompleted, setAuthUser, clearAdminError } =
  authSlice.actions;
export default authSlice.reducer;
