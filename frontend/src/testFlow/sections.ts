import type { TestFlowPhase, TestFlowSectionMeta } from "./types";

export const TEST_FLOW_PHASES: TestFlowPhase[] = [
    {
        id: "01_unos_firme",
        title: "01 — Unos nove firme",
        description: "Čarobnjak, profil, Pregled",
    },
    {
        id: "02_dokumentacija_firme",
        title: "02 — Dokumentacija firme",
        description: "Akt, obavezna dokumentacija",
    },
    {
        id: "03_zaposleni",
        title: "03 — Zaposleni",
        description: "Radna mesta, vrste obuka, test obuke, potvrda, Obrazac 6, revers",
    },
    {
        id: "04_lekarski",
        title: "04 — Lekarski",
        description: "Uput, završetak, lančanje, Obrazac 1, registar povećanog rizika",
    },
    {
        id: "05_oprema_nalazi",
        title: "05 — Oprema i stručni nalazi",
        description: "",
    },
    {
        id: "06_podsetnici_slanja",
        title: "06 — Podsetnici i slanja",
        description: "Danas (semafor), Slanja",
    },
    {
        id: "07_korisnici",
        title: "07 — Korisnici i uloge",
        description: "",
    },
];

export const TEST_FLOW_SECTIONS: TestFlowSectionMeta[] = [
    {
        id: "A1",
        phaseId: "01_unos_firme",
        label: "Lična karta",
        hint: "Čarobnjak korak 1",
        route: "/client-companies/new",
        routeLabel: "Čarobnjak",
    },
    {
        id: "A3",
        phaseId: "01_unos_firme",
        label: "Radno mesto",
        hint: "Čarobnjak korak 3",
        route: "/client-companies/new",
        routeLabel: "Čarobnjak",
    },
    {
        id: "F1",
        phaseId: "01_unos_firme",
        label: "Zaposleni (Marko)",
        hint: "Čarobnjak korak 4, dialog otvoren",
        route: "/client-companies/new",
        routeLabel: "Čarobnjak",
    },
    {
        id: "J1",
        phaseId: "01_unos_firme",
        label: "Obaveza za zaposlenog",
        hint: "Čarobnjak korak 5",
        route: "/client-companies/new",
        routeLabel: "Čarobnjak",
    },
    {
        id: "P_PROFIL",
        phaseId: "01_unos_firme",
        label: "Profil firme (ZOP/rizik/instalacije)",
        hint: "Tab Lična karta → Izmeni podatke",
    },
    {
        id: "B",
        phaseId: "01_unos_firme",
        label: "Kontakt-lice",
        hint: "Tab Lična karta",
    },
    {
        id: "D_DATE",
        phaseId: "02_dokumentacija_firme",
        label: "Datum akta",
        hint: "Akt o proceni rizika",
    },
    {
        id: "D_REASON",
        phaseId: "02_dokumentacija_firme",
        label: "Razlog izmene (akt)",
        hint: "Dialog priloga sekcije",
    },
    {
        id: "D_AMD",
        phaseId: "02_dokumentacija_firme",
        label: "Izmena i dopuna Akta",
        hint: "Akt → Dodaj izmenu (dialog)",
    },
    {
        id: "E_ADD",
        phaseId: "03_zaposleni",
        label: "Dodaj radno mesto",
        hint: "Tab Radna mesta i rizik",
    },
    {
        id: "E_EDIT",
        phaseId: "03_zaposleni",
        label: "Izmeni Viljuškaristu",
        hint: "Tab Radna mesta i rizik",
    },
    {
        id: "F2",
        phaseId: "03_zaposleni",
        label: "Zaposleni (povećan rizik)",
        hint: "Dialog Dodaj zaposlenog — Viljuškarista",
    },
    {
        id: "F3",
        phaseId: "03_zaposleni",
        label: "Zaposleni (Umeren rizik)",
        hint: "Dialog Dodaj zaposlenog — Magacioner",
    },
    {
        id: "K",
        phaseId: "04_lekarski",
        label: "Završi aktivnost",
        hint: "Detalji aktivnosti",
        route: "/processes/runs",
        routeLabel: "Aktivnosti",
    },
    {
        id: "EQ1",
        phaseId: "05_oprema_nalazi",
        label: "Oprema (PP aparat + servis)",
        hint: "Oprema → Dodaj (dialog)",
        route: "/equipment",
        routeLabel: "Oprema",
    },
    {
        id: "L_DATE",
        phaseId: "05_oprema_nalazi",
        label: "Datum stručnog nalaza",
        hint: "Tab Dokumentacija → stručni nalazi",
    },
];
