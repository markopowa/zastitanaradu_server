import type { TestFlowPhase, TestFlowSectionMeta } from "./types";

export const TEST_FLOW_PHASES: TestFlowPhase[] = [
    { id: "01_uvod", title: "01 — Uvod", description: "Orijentacija" },
    {
        id: "02_unos_firme",
        title: "02 — Unos firme",
        description: "Čarobnjak",
    },
    {
        id: "03_pregled",
        title: "03 — Firma: Pregled i profil",
        description: "Lična karta, profil",
    },
    {
        id: "04_dokumenta",
        title: "04 — Dokumentacija",
        description: "Akt, amandmani, stručni nalazi",
    },
    {
        id: "05_zaposleni_oprema",
        title: "05 — Zaposleni i oprema",
        description: "Radna mesta, zaposleni, oprema",
    },
    {
        id: "06_obaveze",
        title: "06 — Obaveze i aktivnosti",
        description: "Motor, završetak, lančanje",
    },
    {
        id: "07_slanja",
        title: "07 — Podsetnici i slanja",
        description: "Danas, Slanja",
    },
    { id: "08_obrazac1", title: "08 — Obrazac 1", description: "" },
    {
        id: "09_korisnici",
        title: "09 — Korisnici i uloge",
        description: "",
    },
];

export const TEST_FLOW_SECTIONS: TestFlowSectionMeta[] = [
    {
        id: "A1",
        phaseId: "02_unos_firme",
        label: "Lična karta",
        hint: "Čarobnjak korak 1",
        route: "/client-companies/new",
        routeLabel: "Čarobnjak",
    },
    {
        id: "A3",
        phaseId: "02_unos_firme",
        label: "Radno mesto",
        hint: "Čarobnjak korak 3",
        route: "/client-companies/new",
        routeLabel: "Čarobnjak",
    },
    {
        id: "F1",
        phaseId: "02_unos_firme",
        label: "Zaposleni (Marko)",
        hint: "Čarobnjak korak 4, dialog otvoren",
        route: "/client-companies/new",
        routeLabel: "Čarobnjak",
    },
    {
        id: "J1",
        phaseId: "02_unos_firme",
        label: "Obaveza za zaposlenog",
        hint: "Čarobnjak korak 5",
        route: "/client-companies/new",
        routeLabel: "Čarobnjak",
    },
    {
        id: "B",
        phaseId: "03_pregled",
        label: "Kontakt-lice",
        hint: "Tab Lična karta",
    },
    {
        id: "P_PROFIL",
        phaseId: "03_pregled",
        label: "Profil firme (ZOP/rizik/instalacije)",
        hint: "Tab Lična karta → Izmeni",
    },
    {
        id: "D_DATE",
        phaseId: "04_dokumenta",
        label: "Datum akta",
        hint: "Akt o proceni rizika",
    },
    {
        id: "D_REASON",
        phaseId: "04_dokumenta",
        label: "Razlog izmene (akt)",
        hint: "Dialog priloga sekcije",
    },
    {
        id: "D_AMD",
        phaseId: "04_dokumenta",
        label: "Izmena i dopuna Akta",
        hint: "Akt → Dodaj izmenu (dialog)",
    },
    {
        id: "L_DATE",
        phaseId: "04_dokumenta",
        label: "Datum stručnog nalaza",
        hint: "Tab Dokumentacija → stručni nalazi",
    },
    {
        id: "E_ADD",
        phaseId: "05_zaposleni_oprema",
        label: "Dodaj radno mesto",
        hint: "Tab Radna mesta",
    },
    {
        id: "E_EDIT",
        phaseId: "05_zaposleni_oprema",
        label: "Izmeni Viljuškarista",
        hint: "Tab Radna mesta",
    },
    {
        id: "F2",
        phaseId: "05_zaposleni_oprema",
        label: "Zaposleni random",
        hint: "Dialog Dodaj zaposlenog",
    },
    {
        id: "F3",
        phaseId: "05_zaposleni_oprema",
        label: "Zaposleni random",
        hint: "Dialog Dodaj zaposlenog",
    },
    {
        id: "EQ1",
        phaseId: "05_zaposleni_oprema",
        label: "Oprema",
        hint: "Oprema → Dodaj (dialog)",
    },
    {
        id: "K",
        phaseId: "06_obaveze",
        label: "Završi aktivnost",
        hint: "Detalji aktivnosti",
        route: "/processes/runs",
        routeLabel: "Aktivnosti",
    },
];
