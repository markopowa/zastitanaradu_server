import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface LocationState {
    lastPath?: string;
}

const initialState: LocationState = {
    lastPath: localStorage.getItem("lastPath") ?? undefined,
};

const locationSlice = createSlice({
    name: "location",
    initialState,
    reducers: {
        setLastPath(state, action: PayloadAction<string>) {
            state.lastPath = action.payload;
            localStorage.setItem("lastPath", action.payload);
        },
    },
});

export const { setLastPath } = locationSlice.actions;
export default locationSlice.reducer;
