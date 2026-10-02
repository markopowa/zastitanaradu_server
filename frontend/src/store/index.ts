import { configureStore } from "@reduxjs/toolkit";

import { api } from "../api/client";
import authReducer from "./authSlice";
import documentsReducer from "./documentsSlice";
import locationReducer from "./locationSlice";
import processesReducer, { invalidateAll } from "./processesSlice";

export const store = configureStore({
    reducer: {
        auth: authReducer,
        documents: documentsReducer,
        location: locationReducer,
        processes: processesReducer,
    },
});

const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

api.interceptors.response.use((response) => {
    const method = (response.config.method ?? "").toLowerCase();
    const url = response.config.url ?? "";
    if (MUTATING_METHODS.has(method) && !url.startsWith("/auth/")) {
        store.dispatch(invalidateAll());
    }
    return response;
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export type AsyncThunkDispatchResult = Promise<unknown> & {
    unwrap: () => Promise<unknown>;
};
