export type TestFlowSection =
    | "A1"
    | "A3"
    | "B"
    | "D_DATE"
    | "D_REASON"
    | "E_ADD"
    | "E_EDIT"
    | "F1"
    | "F2"
    | "F3"
    | "J1"
    | "K"
    | "L_DATE"
    | "P_PROFIL"
    | "D_AMD"
    | "EQ1";

export type TestFillCommand = {
    type: "fill";
    section: TestFlowSection;
    sessionId: string;
};

export type TestFillResult = {
    type: "fill-result";
    section: TestFlowSection;
    sessionId: string;
    handled: boolean;
};

export type TestFlowMessage = TestFillCommand | TestFillResult;

export interface TestFlowPhase {
    id: string;
    title: string;
    description: string;
}

export interface TestFlowSectionMeta {
    id: TestFlowSection;
    label: string;
    hint: string;
    phaseId: string;
    badge?: string;
    route?: string;
    routeLabel?: string;
}
