import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./authSlice";
import documentsReducer from "./documentsSlice";
import locationReducer from "./locationSlice";
import processesReducer from "./processesSlice";

export const store = configureStore({
    reducer: {
        auth: authReducer,
        documents: documentsReducer,
        location: locationReducer,
        processes: processesReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export type AsyncThunkDispatchResult = Promise<unknown> & {
    unwrap: () => Promise<unknown>;
};
