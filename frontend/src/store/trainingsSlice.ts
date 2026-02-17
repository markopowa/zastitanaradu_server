import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api } from "../api/client";
import type {
    Employee,
    TrainingAttendance,
    TrainingProgram,
    TrainingSession,
    TrainingType,
    TrainingsState,
} from "../types/trainings";

const initialState: TrainingsState = {
    employees: [],
    types: [],
    programs: [],
    sessions: [],
    attendance: [],
    dashboardItems: [],
    loading: false,
    error: undefined,
};

function asList<T>(data: T[] | { results: T[] } | undefined): T[] {
    if (Array.isArray(data)) return data;
    return (data as { results?: T[] })?.results ?? [];
}

export const fetchEmployees = createAsyncThunk(
    "trainings/fetchEmployees",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get<Employee[] | { results: Employee[] }>(
                "/api/trainings/employees/",
            );
            return asList(response.data);
        } catch (error: unknown) {
            return rejectWithValue("Neuspešno učitavanje zaposlenih");
        }
    },
);

export const createEmployee = createAsyncThunk(
    "trainings/createEmployee",
    async (
        payload: Partial<Employee>,
        { rejectWithValue, dispatch },
    ) => {
        try {
            await api.post("/api/trainings/employees/", payload);
            dispatch(fetchEmployees());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ??
                    "Greška",
            );
        }
    },
);

export const updateEmployee = createAsyncThunk(
    "trainings/updateEmployee",
    async (
        { id, ...payload }: Partial<Employee> & { id: number },
        { rejectWithValue, dispatch },
    ) => {
        try {
            await api.patch(`/api/trainings/employees/${id}/`, payload);
            dispatch(fetchEmployees());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ??
                    "Greška",
            );
        }
    },
);

export const deleteEmployee = createAsyncThunk(
    "trainings/deleteEmployee",
    async (id: number, { rejectWithValue, dispatch }) => {
        try {
            await api.delete(`/api/trainings/employees/${id}/`);
            dispatch(fetchEmployees());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ??
                    "Greška",
            );
        }
    },
);

export const fetchTrainingTypes = createAsyncThunk(
    "trainings/fetchTypes",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get<TrainingType[] | { results: TrainingType[] }>(
                "/api/trainings/types/",
            );
            return asList(response.data);
        } catch (error: unknown) {
            return rejectWithValue("Neuspešno učitavanje tipova obuka");
        }
    },
);

export const fetchTrainingPrograms = createAsyncThunk(
    "trainings/fetchPrograms",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get<TrainingProgram[] | { results: TrainingProgram[] }>("/api/trainings/programs/");
            return asList(response.data);
        } catch (error: unknown) {
            return rejectWithValue("Neuspešno učitavanje programa obuka");
        }
    },
);

export const fetchTrainingSessions = createAsyncThunk(
    "trainings/fetchSessions",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get<TrainingSession[] | { results: TrainingSession[] }>("/api/trainings/sessions/");
            return asList(response.data);
        } catch (error: unknown) {
            return rejectWithValue("Neuspešno učitavanje termina obuka");
        }
    },
);

export const fetchTrainingAttendance = createAsyncThunk(
    "trainings/fetchAttendance",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get<TrainingAttendance[] | { results: TrainingAttendance[] }>("/api/trainings/attendance/");
            return asList(response.data);
        } catch (error: unknown) {
            return rejectWithValue("Neuspešno učitavanje prisustava");
        }
    },
);

export const createTrainingType = createAsyncThunk(
    "trainings/createType",
    async (payload: Partial<TrainingType>, { rejectWithValue, dispatch }) => {
        try {
            await api.post("/api/trainings/types/", payload);
            dispatch(fetchTrainingTypes());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ?? "Greška",
            );
        }
    },
);

export const updateTrainingType = createAsyncThunk(
    "trainings/updateType",
    async (
        { id, ...payload }: Partial<TrainingType> & { id: number },
        { rejectWithValue, dispatch },
    ) => {
        try {
            await api.patch(`/api/trainings/types/${id}/`, payload);
            dispatch(fetchTrainingTypes());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ?? "Greška",
            );
        }
    },
);

export const deleteTrainingType = createAsyncThunk(
    "trainings/deleteType",
    async (id: number, { rejectWithValue, dispatch }) => {
        try {
            await api.delete(`/api/trainings/types/${id}/`);
            dispatch(fetchTrainingTypes());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ?? "Greška",
            );
        }
    },
);

export const createTrainingProgram = createAsyncThunk(
    "trainings/createProgram",
    async (payload: Partial<TrainingProgram>, { rejectWithValue, dispatch }) => {
        try {
            await api.post("/api/trainings/programs/", payload);
            dispatch(fetchTrainingPrograms());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ?? "Greška",
            );
        }
    },
);

export const updateTrainingProgram = createAsyncThunk(
    "trainings/updateProgram",
    async (
        { id, ...payload }: Partial<TrainingProgram> & { id: number },
        { rejectWithValue, dispatch },
    ) => {
        try {
            await api.patch(`/api/trainings/programs/${id}/`, payload);
            dispatch(fetchTrainingPrograms());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ?? "Greška",
            );
        }
    },
);

export const deleteTrainingProgram = createAsyncThunk(
    "trainings/deleteProgram",
    async (id: number, { rejectWithValue, dispatch }) => {
        try {
            await api.delete(`/api/trainings/programs/${id}/`);
            dispatch(fetchTrainingPrograms());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ?? "Greška",
            );
        }
    },
);

export const createTrainingSession = createAsyncThunk(
    "trainings/createSession",
    async (payload: Partial<TrainingSession>, { rejectWithValue, dispatch }) => {
        try {
            await api.post("/api/trainings/sessions/", payload);
            dispatch(fetchTrainingSessions());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ?? "Greška",
            );
        }
    },
);

export const updateTrainingSession = createAsyncThunk(
    "trainings/updateSession",
    async (
        { id, ...payload }: Partial<TrainingSession> & { id: number },
        { rejectWithValue, dispatch },
    ) => {
        try {
            await api.patch(`/api/trainings/sessions/${id}/`, payload);
            dispatch(fetchTrainingSessions());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ?? "Greška",
            );
        }
    },
);

export const deleteTrainingSession = createAsyncThunk(
    "trainings/deleteSession",
    async (id: number, { rejectWithValue, dispatch }) => {
        try {
            await api.delete(`/api/trainings/sessions/${id}/`);
            dispatch(fetchTrainingSessions());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ?? "Greška",
            );
        }
    },
);

export const createTrainingAttendance = createAsyncThunk(
    "trainings/createAttendance",
    async (payload: Partial<TrainingAttendance>, { rejectWithValue, dispatch }) => {
        try {
            await api.post("/api/trainings/attendance/", payload);
            dispatch(fetchTrainingAttendance());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ?? "Greška",
            );
        }
    },
);

export const updateTrainingAttendance = createAsyncThunk(
    "trainings/updateAttendance",
    async (
        { id, ...payload }: Partial<TrainingAttendance> & { id: number },
        { rejectWithValue, dispatch },
    ) => {
        try {
            await api.patch(`/api/trainings/attendance/${id}/`, payload);
            dispatch(fetchTrainingAttendance());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ?? "Greška",
            );
        }
    },
);

export const deleteTrainingAttendance = createAsyncThunk(
    "trainings/deleteAttendance",
    async (id: number, { rejectWithValue, dispatch }) => {
        try {
            await api.delete(`/api/trainings/attendance/${id}/`);
            dispatch(fetchTrainingAttendance());
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: unknown } })?.response?.data ?? "Greška",
            );
        }
    },
);

export const fetchTrainingsDashboard = createAsyncThunk(
    "trainings/fetchDashboard",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get<TrainingAttendance[] | { results: TrainingAttendance[] }>(
                "/api/trainings/attendance/dashboard/expiring/",
            );
            return asList(response.data);
        } catch (error: unknown) {
            return rejectWithValue("Neuspešno učitavanje rokova obuka");
        }
    },
);

const trainingsSlice = createSlice({
    name: "trainings",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchEmployees.fulfilled, (state, action) => {
                state.employees = action.payload;
            })
            .addCase(fetchTrainingTypes.fulfilled, (state, action) => {
                state.types = action.payload;
            })
            .addCase(fetchTrainingPrograms.fulfilled, (state, action) => {
                state.programs = action.payload;
            })
            .addCase(fetchTrainingSessions.fulfilled, (state, action) => {
                state.sessions = action.payload;
            })
            .addCase(fetchTrainingAttendance.fulfilled, (state, action) => {
                state.attendance = action.payload;
            })
            .addCase(fetchTrainingsDashboard.pending, (state) => {
                state.loading = true;
                state.error = undefined;
            })
            .addCase(fetchTrainingsDashboard.fulfilled, (state, action) => {
                state.loading = false;
                state.dashboardItems = action.payload;
            })
            .addCase(fetchTrainingsDashboard.rejected, (state, action) => {
                state.loading = false;
                state.error =
                    (action.payload as string) ?? "Greška pri učitavanju rokova obuka";
            });
    },
});

export default trainingsSlice.reducer;


