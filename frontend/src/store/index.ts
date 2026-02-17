import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./authSlice";
import documentsReducer from "./documentsSlice";
import trainingsReducer from "./trainingsSlice";
import locationReducer from "./locationSlice";

export const store = configureStore({
    reducer: {
        auth: authReducer,
        documents: documentsReducer,
        trainings: trainingsReducer,
        location: locationReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

