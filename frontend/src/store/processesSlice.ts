import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import type { DocumentTemplate } from "../api/documents";
import { getDocumentTemplates } from "../api/documents";
import {
    getClientCompanies,
    createClientCompany,
    getProcessTypes,
    createProcessType,
    updateProcessType,
    deleteProcessType,
    getProcessBindings,
    createProcessBinding,
    updateProcessBinding,
    type ProcessBindingsParams,
    getProcessRuns,
    type ProcessRunsParams,
    completeProcessRun,
    type CompleteProcessRunPayload,
    createProcessTemplate,
    updateProcessTemplate,
    deleteProcessTemplate,
    getEquipment,
    createEquipmentItem,
    getEmployees,
    createEmployee,
    getActivityLog,
    type ActivityLogParams,
} from "../api/processes";
import type {
    ActivityLog,
    ClientCompany,
    EmployeeSummary,
    EquipmentItem,
    ProcessBinding,
    ProcessRun,
    ProcessTemplate,
    ProcessType,
} from "../types/processes";

export type LoadStatus = "idle" | "loading" | "succeeded" | "failed";

export interface ProcessesState {
    clientCompanies: ClientCompany[];
    clientCompaniesStatus: LoadStatus;
    clientCompaniesError?: string;

    processTypes: ProcessType[];
    processTypesStatus: LoadStatus;
    processTypesError?: string;

    bindingsItems: ProcessBinding[];
    bindingsParamsKey: string;
    bindingsStatus: LoadStatus;
    bindingsError?: string;

    runsItems: ProcessRun[];
    runsParamsKey: string;
    runsStatus: LoadStatus;
    runsError?: string;

    processDocTemplates: DocumentTemplate[];
    processDocTemplatesStatus: LoadStatus;

    equipmentItems: EquipmentItem[];
    equipmentParamsKey: string;
    equipmentStatus: LoadStatus;
    equipmentError?: string;

    employeesItems: EmployeeSummary[];
    employeesParamsKey: string;
    employeesStatus: LoadStatus;
    employeesError?: string;

    activityLogItems: ActivityLog[];
    activityLogStatus: LoadStatus;
    activityLogError?: string;
}

type ProcessesRoot = { processes: ProcessesState };

function selectP(getState: () => unknown): ProcessesState {
    return (getState() as ProcessesRoot).processes;
}

function bindingsParamsKey(p: ProcessBindingsParams): string {
    return JSON.stringify({
        c: p.client_company_id ?? null,
        e: p.employee_id ?? null,
        q: p.equipment_item_id ?? null,
        t: p.process_type_id ?? null,
        a: p.is_active ?? null,
    });
}

function runsParamsKey(p: ProcessRunsParams): string {
    return JSON.stringify({
        c: p.client_company_id ?? null,
        e: p.employee_id ?? null,
        q: p.equipment_item_id ?? null,
        t: p.process_type_id ?? null,
        s: p.status ?? null,
        fv: p.from_valid_until ?? null,
        tv: p.to_valid_until ?? null,
    });
}

function equipmentParamsKey(clientCompanyId: string): string {
    return clientCompanyId || "_all";
}

export interface FetchEmployeesListParams {
    clientCompanyId: string;
    search?: string;
    risk_level_id?: string;
}

function employeesParamsKey(params: FetchEmployeesListParams): string {
    return JSON.stringify({
        c: params.clientCompanyId || "_all",
        s: params.search?.trim() || "",
        r: params.risk_level_id || "",
    });
}


const initialState: ProcessesState = {
    clientCompanies: [],
    clientCompaniesStatus: "idle",
    processTypes: [],
    processTypesStatus: "idle",
    bindingsItems: [],
    bindingsParamsKey: "",
    bindingsStatus: "idle",
    runsItems: [],
    runsParamsKey: "",
    runsStatus: "idle",
    processDocTemplates: [],
    processDocTemplatesStatus: "idle",
    equipmentItems: [],
    equipmentParamsKey: "",
    equipmentStatus: "idle",
    employeesItems: [],
    employeesParamsKey: "",
    employeesStatus: "idle",
    activityLogItems: [],
    activityLogStatus: "idle",
};

export const fetchClientCompanies = createAsyncThunk(
    "processes/fetchClientCompanies",
    async () => getClientCompanies(),
);

export const ensureClientCompanies = createAsyncThunk(
    "processes/ensureClientCompanies",
    async () => getClientCompanies(),
    {
        condition(_, { getState }) {
            const p = selectP(getState);
            return (
                p.clientCompaniesStatus !== "succeeded" &&
                p.clientCompaniesStatus !== "loading"
            );
        },
    },
);

export const addClientCompany = createAsyncThunk(
    "processes/addClientCompany",
    async (payload: Partial<ClientCompany>) => createClientCompany(payload),
);

export const fetchProcessTypes = createAsyncThunk(
    "processes/fetchProcessTypes",
    async () => getProcessTypes(),
);

export const ensureProcessTypes = createAsyncThunk(
    "processes/ensureProcessTypes",
    async () => getProcessTypes(),
    {
        condition(_, { getState }) {
            const p = selectP(getState);
            return (
                p.processTypesStatus !== "succeeded" &&
                p.processTypesStatus !== "loading"
            );
        },
    },
);

export const addProcessType = createAsyncThunk(
    "processes/addProcessType",
    async (payload: Partial<ProcessType>) => createProcessType(payload),
);

export const saveProcessType = createAsyncThunk(
    "processes/saveProcessType",
    async ({ id, payload }: { id: number; payload: Partial<ProcessType> }) =>
        updateProcessType(id, payload),
);

export const removeProcessType = createAsyncThunk(
    "processes/removeProcessType",
    async (id: number) => {
        await deleteProcessType(id);
        return id;
    },
);

export const fetchBindings = createAsyncThunk(
    "processes/fetchBindings",
    async (params: ProcessBindingsParams) => {
        const items = await getProcessBindings(params);
        return {
            paramsKey: bindingsParamsKey(params),
            items: Array.isArray(items) ? items : [],
        };
    },
    {
        condition(arg, { getState }) {
            const p = selectP(getState);
            const key = bindingsParamsKey(arg);
            return !(
                p.bindingsParamsKey === key && p.bindingsStatus === "succeeded"
            );
        },
    },
);

export const addProcessBinding = createAsyncThunk(
    "processes/addProcessBinding",
    async (payload: Partial<ProcessBinding>) => createProcessBinding(payload),
);

export const saveProcessBinding = createAsyncThunk(
    "processes/saveProcessBinding",
    async ({
        id,
        payload,
    }: {
        id: number;
        payload: Partial<ProcessBinding>;
    }) => updateProcessBinding(id, payload),
);

export const fetchRuns = createAsyncThunk(
    "processes/fetchRuns",
    async (params: ProcessRunsParams) => {
        const items = await getProcessRuns(params);
        return {
            paramsKey: runsParamsKey(params),
            items: Array.isArray(items) ? items : [],
        };
    },
    {
        condition(arg, { getState }) {
            const p = selectP(getState);
            const key = runsParamsKey(arg);
            return !(p.runsParamsKey === key && p.runsStatus === "succeeded");
        },
    },
);

export const completeRun = createAsyncThunk(
    "processes/completeRun",
    async ({
        id,
        payload,
    }: {
        id: number;
        payload: CompleteProcessRunPayload;
    }) => completeProcessRun(id, payload),
);

export const ensureProcessDocTemplates = createAsyncThunk(
    "processes/ensureProcessDocTemplates",
    async () => getDocumentTemplates(),
    {
        condition(_, { getState }) {
            const p = selectP(getState);
            return (
                p.processDocTemplatesStatus !== "succeeded" &&
                p.processDocTemplatesStatus !== "loading"
            );
        },
    },
);

export const addProcessTemplate = createAsyncThunk(
    "processes/addProcessTemplate",
    async (payload: Partial<ProcessTemplate>) => createProcessTemplate(payload),
);

export const saveProcessTemplate = createAsyncThunk(
    "processes/saveProcessTemplate",
    async ({
        id,
        payload,
    }: {
        id: number;
        payload: Partial<ProcessTemplate>;
    }) => updateProcessTemplate(id, payload),
);

export const removeProcessTemplate = createAsyncThunk(
    "processes/removeProcessTemplate",
    async (id: number) => {
        await deleteProcessTemplate(id);
        return id;
    },
);

export const fetchEquipmentList = createAsyncThunk(
    "processes/fetchEquipmentList",
    async (clientCompanyId: string) => {
        const params =
            clientCompanyId !== ""
                ? { client_company_id: Number(clientCompanyId) }
                : undefined;
        const items = await getEquipment(params);
        return {
            paramsKey: equipmentParamsKey(clientCompanyId),
            items: Array.isArray(items) ? items : [],
        };
    },
    {
        condition(arg, { getState }) {
            const p = selectP(getState);
            const key = equipmentParamsKey(arg);
            return !(
                p.equipmentParamsKey === key &&
                p.equipmentStatus === "succeeded"
            );
        },
    },
);

export const addEquipmentItem = createAsyncThunk(
    "processes/addEquipmentItem",
    async (payload: Partial<EquipmentItem>) => createEquipmentItem(payload),
);

export const fetchEmployeesList = createAsyncThunk(
    "processes/fetchEmployeesList",
    async (args: FetchEmployeesListParams) => {
        const apiParams: Parameters<typeof getEmployees>[0] = {};
        if (args.clientCompanyId !== "") {
            apiParams.client_company_id = Number(args.clientCompanyId);
        }
        if (args.search?.trim()) {
            apiParams.search = args.search.trim();
        }
        if (args.risk_level_id) {
            apiParams.risk_level_id = Number(args.risk_level_id);
        }
        const items = await getEmployees(apiParams);
        return {
            paramsKey: employeesParamsKey(args),
            items: Array.isArray(items) ? items : [],
        };
    },
    {
        condition(arg, { getState }) {
            const p = selectP(getState);
            const key = employeesParamsKey(arg);
            return !(
                p.employeesParamsKey === key &&
                p.employeesStatus === "succeeded"
            );
        },
    },
);

export const addEmployee = createAsyncThunk(
    "processes/addEmployee",
    async (payload: Parameters<typeof createEmployee>[0]) =>
        createEmployee(payload),
);

export const fetchActivityLog = createAsyncThunk(
    "processes/fetchActivityLog",
    async (params: ActivityLogParams = {}) => {
        const items = await getActivityLog(params);
        return Array.isArray(items) ? items : [];
    },
);

function sortProcessTypes(types: ProcessType[]): ProcessType[] {
    return [...types].sort((a, b) =>
        a.code.localeCompare(b.code, "sr", { sensitivity: "base" }),
    );
}

const processesSlice = createSlice({
    name: "processes",
    initialState,
    reducers: {
        invalidateBindings(state) {
            state.bindingsStatus = "idle";
        },
        invalidateRuns(state) {
            state.runsStatus = "idle";
        },
        invalidateProcessTypes(state) {
            state.processTypesStatus = "idle";
        },
        invalidateEquipment(state) {
            state.equipmentStatus = "idle";
        },
        invalidateEmployees(state) {
            state.employeesStatus = "idle";
        },
        invalidateActivityLog(state) {
            state.activityLogStatus = "idle";
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchClientCompanies.pending, (state) => {
                state.clientCompaniesStatus = "loading";
                state.clientCompaniesError = undefined;
            })
            .addCase(fetchClientCompanies.fulfilled, (state, action) => {
                state.clientCompaniesStatus = "succeeded";
                state.clientCompanies = action.payload;
            })
            .addCase(fetchClientCompanies.rejected, (state, action) => {
                state.clientCompaniesStatus = "failed";
                state.clientCompaniesError =
                    (action.error.message as string) ?? "Greška";
            })
            .addCase(ensureClientCompanies.pending, (state) => {
                state.clientCompaniesStatus = "loading";
                state.clientCompaniesError = undefined;
            })
            .addCase(ensureClientCompanies.fulfilled, (state, action) => {
                state.clientCompaniesStatus = "succeeded";
                state.clientCompanies = action.payload;
            })
            .addCase(ensureClientCompanies.rejected, (state, action) => {
                state.clientCompaniesStatus = "failed";
                state.clientCompaniesError =
                    (action.error.message as string) ?? "Greška";
            })
            .addCase(addClientCompany.fulfilled, (state, action) => {
                state.clientCompanies.push(action.payload);
            })
            .addCase(fetchProcessTypes.pending, (state) => {
                state.processTypesStatus = "loading";
                state.processTypesError = undefined;
            })
            .addCase(fetchProcessTypes.fulfilled, (state, action) => {
                state.processTypesStatus = "succeeded";
                state.processTypes = sortProcessTypes(action.payload);
            })
            .addCase(fetchProcessTypes.rejected, (state, action) => {
                state.processTypesStatus = "failed";
                state.processTypesError =
                    (action.error.message as string) ?? "Greška";
            })
            .addCase(ensureProcessTypes.pending, (state) => {
                state.processTypesStatus = "loading";
                state.processTypesError = undefined;
            })
            .addCase(ensureProcessTypes.fulfilled, (state, action) => {
                state.processTypesStatus = "succeeded";
                state.processTypes = sortProcessTypes(action.payload);
            })
            .addCase(ensureProcessTypes.rejected, (state, action) => {
                state.processTypesStatus = "failed";
                state.processTypesError =
                    (action.error.message as string) ?? "Greška";
            })
            .addCase(addProcessType.fulfilled, (state, action) => {
                state.processTypes = sortProcessTypes([
                    ...state.processTypes,
                    action.payload,
                ]);
            })
            .addCase(saveProcessType.fulfilled, (state, action) => {
                const u = action.payload;
                state.processTypes = sortProcessTypes(
                    state.processTypes.map((t) => (t.id === u.id ? u : t)),
                );
            })
            .addCase(removeProcessType.fulfilled, (state, action) => {
                const id = action.payload;
                state.processTypes = state.processTypes.filter(
                    (t) => t.id !== id,
                );
            })
            .addCase(fetchBindings.pending, (state) => {
                state.bindingsStatus = "loading";
                state.bindingsError = undefined;
            })
            .addCase(fetchBindings.fulfilled, (state, action) => {
                state.bindingsStatus = "succeeded";
                state.bindingsParamsKey = action.payload.paramsKey;
                state.bindingsItems = action.payload.items;
            })
            .addCase(fetchBindings.rejected, (state, action) => {
                state.bindingsStatus = "failed";
                state.bindingsError =
                    (action.error.message as string) ?? "Greška";
            })
            .addCase(addProcessBinding.fulfilled, (state, action) => {
                state.bindingsItems = [...state.bindingsItems, action.payload];
            })
            .addCase(saveProcessBinding.fulfilled, (state, action) => {
                state.bindingsItems = state.bindingsItems.map((b) =>
                    b.id === action.payload.id ? action.payload : b,
                );
            })
            .addCase(fetchRuns.pending, (state) => {
                state.runsStatus = "loading";
                state.runsError = undefined;
            })
            .addCase(fetchRuns.fulfilled, (state, action) => {
                state.runsStatus = "succeeded";
                state.runsParamsKey = action.payload.paramsKey;
                state.runsItems = action.payload.items;
            })
            .addCase(fetchRuns.rejected, (state, action) => {
                state.runsStatus = "failed";
                state.runsError = (action.error.message as string) ?? "Greška";
            })
            .addCase(completeRun.fulfilled, (state, action) => {
                const u = action.payload;
                state.runsItems = state.runsItems.map((r) =>
                    r.id === u.id ? u : r,
                );
            })
            .addCase(ensureProcessDocTemplates.pending, (state) => {
                state.processDocTemplatesStatus = "loading";
            })
            .addCase(ensureProcessDocTemplates.fulfilled, (state, action) => {
                state.processDocTemplatesStatus = "succeeded";
                state.processDocTemplates = action.payload;
            })
            .addCase(ensureProcessDocTemplates.rejected, (state) => {
                state.processDocTemplatesStatus = "failed";
            })
            .addCase(addProcessTemplate.fulfilled, (state) => {
                state.processTypesStatus = "idle";
            })
            .addCase(saveProcessTemplate.fulfilled, (state) => {
                state.processTypesStatus = "idle";
            })
            .addCase(removeProcessTemplate.fulfilled, (state) => {
                state.processTypesStatus = "idle";
            })
            .addCase(fetchEquipmentList.pending, (state) => {
                state.equipmentStatus = "loading";
                state.equipmentError = undefined;
            })
            .addCase(fetchEquipmentList.fulfilled, (state, action) => {
                state.equipmentStatus = "succeeded";
                state.equipmentParamsKey = action.payload.paramsKey;
                state.equipmentItems = action.payload.items;
            })
            .addCase(fetchEquipmentList.rejected, (state, action) => {
                state.equipmentStatus = "failed";
                state.equipmentError =
                    (action.error.message as string) ?? "Greška";
            })
            .addCase(addEquipmentItem.fulfilled, (state, action) => {
                const key = state.equipmentParamsKey;
                const cid = String(action.payload.client_company);
                if (key === "_all" || key === cid) {
                    state.equipmentItems = [
                        ...state.equipmentItems,
                        action.payload,
                    ];
                }
            })
            .addCase(fetchEmployeesList.pending, (state) => {
                state.employeesStatus = "loading";
                state.employeesError = undefined;
            })
            .addCase(fetchEmployeesList.fulfilled, (state, action) => {
                state.employeesStatus = "succeeded";
                state.employeesParamsKey = action.payload.paramsKey;
                state.employeesItems = action.payload.items;
            })
            .addCase(fetchEmployeesList.rejected, (state, action) => {
                state.employeesStatus = "failed";
                state.employeesError =
                    (action.error.message as string) ?? "Greška";
            })
            .addCase(addEmployee.fulfilled, (state, action) => {
                const row = action.payload;
                const summary: EmployeeSummary = {
                    id: row.id,
                    client_company: row.client_company,
                    client_company_name: row.client_company_name,
                    first_name: row.first_name,
                    last_name: row.last_name,
                    email: row.email,
                    org_unit: row.org_unit,
                    position: row.position,
                    job_role_risk_level: row.job_role_risk_level,
                    risk_level_override: row.risk_level_override,
                    risk_level_override_detail: row.risk_level_override_detail,
                    effective_risk_level: row.effective_risk_level,
                };
                const key = state.employeesParamsKey;
                const cid =
                    row.client_company != null
                        ? String(row.client_company)
                        : "";
                const matchesCompany =
                    key.includes(`"c":"_all"`) ||
                    key.includes(`"c":"${cid}"`);
                if (matchesCompany) {
                    state.employeesItems = [...state.employeesItems, summary];
                }
            })
            .addCase(fetchActivityLog.pending, (state) => {
                state.activityLogStatus = "loading";
                state.activityLogError = undefined;
            })
            .addCase(fetchActivityLog.fulfilled, (state, action) => {
                state.activityLogStatus = "succeeded";
                state.activityLogItems = action.payload;
            })
            .addCase(fetchActivityLog.rejected, (state, action) => {
                state.activityLogStatus = "failed";
                state.activityLogError =
                    (action.error.message as string) ?? "Greška";
            });
    },
});

export const {
    invalidateBindings,
    invalidateRuns,
    invalidateProcessTypes,
    invalidateEquipment,
    invalidateEmployees,
    invalidateActivityLog,
} = processesSlice.actions;

export default processesSlice.reducer;
