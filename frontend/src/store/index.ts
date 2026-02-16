import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./authSlice";
import documentsReducer from "./documentsSlice";
import trainingsReducer from "./trainingsSlice";

export const store = configureStore({
    reducer: {
        auth: authReducer,
        documents: documentsReducer,
        trainings: trainingsReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

