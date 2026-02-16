import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api } from "../api/client";
import type {
    TrainingAttendance,
    TrainingProgram,
    TrainingSession,
    TrainingType,
    TrainingsState,
} from "../types/trainings";

const initialState: TrainingsState = {
    types: [],
    programs: [],
    sessions: [],
    attendance: [],
    dashboardItems: [],
    loading: false,
    error: undefined,
};

export const fetchTrainingTypes = createAsyncThunk(
    "trainings/fetchTypes",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get<TrainingType[]>("/api/trainings/types/");
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue("Neuspešno učitavanje tipova obuka");
        }
    },
);

export const fetchTrainingPrograms = createAsyncThunk(
    "trainings/fetchPrograms",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get<TrainingProgram[]>("/api/trainings/programs/");
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue("Neuspešno učitavanje programa obuka");
        }
    },
);

export const fetchTrainingSessions = createAsyncThunk(
    "trainings/fetchSessions",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get<TrainingSession[]>("/api/trainings/sessions/");
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue("Neuspešno učitavanje termina obuka");
        }
    },
);

export const fetchTrainingAttendance = createAsyncThunk(
    "trainings/fetchAttendance",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get<TrainingAttendance[]>("/api/trainings/attendance/");
            return response.data;
        } catch (error: unknown) {
            return rejectWithValue("Neuspešno učitavanje prisustava");
        }
    },
);

export const fetchTrainingsDashboard = createAsyncThunk(
    "trainings/fetchDashboard",
    async (_, { rejectWithValue }) => {
        try {
            const response =
                await api.get<TrainingAttendance[]>("/api/trainings/dashboard/expiring/");
            return response.data;
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


