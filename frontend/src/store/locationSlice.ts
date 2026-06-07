import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface BreadcrumbItem {
    label: string;
    path?: string;
}

export interface LocationState {
    lastPath?: string;
    breadcrumbs: BreadcrumbItem[];
}

const initialState: LocationState = {
    lastPath: localStorage.getItem("lastPath") ?? undefined,
    breadcrumbs: [],
};

const locationSlice = createSlice({
    name: "location",
    initialState,
    reducers: {
        setLastPath(state, action: PayloadAction<string>) {
            state.lastPath = action.payload;
            localStorage.setItem("lastPath", action.payload);
        },
        setBreadcrumbs(state, action: PayloadAction<BreadcrumbItem[]>) {
            state.breadcrumbs = action.payload;
        },
    },
});

export const { setLastPath, setBreadcrumbs } = locationSlice.actions;
export default locationSlice.reducer;
