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

export type TestFlowManualId =
    | "C00_INTRO"
    | "C01_WIZARD_DOCS"
    | "C01_FINISH"
    | "C02_OVERVIEW_LIST"
    | "C02_OVERVIEW_MENU"
    | "C02_OVERVIEW_BTNS"
    | "C02_NAP"
    | "C03_HEADER"
    | "C03_EDIT_BASIC"
    | "C03_EMAIL_MODE"
    | "C03_INTAKE"
    | "C04_INSPECTION"
    | "C04_ACT_MERGE"
    | "C04_BZR_DRAFTS"
    | "C04_WORD_PDF"
    | "C04_GENERATED"
    | "C05_RISK_TEXT"
    | "C05_LZO"
    | "C05_TRAINING_TYPE"
    | "C06_OPEN_EMP"
    | "C06_RISK_OVERRIDE"
    | "C06_OBRAZAC6"
    | "C06_REVERS"
    | "C06_POTVRDA"
    | "C06_TEST"
    | "C06_TRAININGS"
    | "C06_EMP_DOCS"
    | "C06_INJURY"
    | "C07_LIST"
    | "C07_ADD_BINDING"
    | "C07_FILTERS"
    | "C07_CHAIN"
    | "C07_OBRAZAC1"
    | "C07_REGISTAR"
    | "C07_ACT_GEN"
    | "C08_DANAS"
    | "C08_SLANJA"
    | "C09_USER"
    | "C09_ROLE";

export type TestFlowRowId = TestFlowSection | TestFlowManualId;

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
    id: TestFlowRowId;
    phaseId: string;
    label: string;
    hint: string;
    uiGroup: string;
    say: string;
    kind: "fill" | "check";
    badge?: string;
    route?: string;
    routeLabel?: string;
}

export function isFillSection(id: TestFlowRowId): id is TestFlowSection {
    return !String(id).startsWith("C");
}
