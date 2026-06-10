import type { TestFlowSectionMeta } from "./types";

export const TEST_FLOW_SECTIONS: TestFlowSectionMeta[] = [
    {
        id: "A1",
        label: "A1 — Nova firma, Lična karta",
        hint: "Čarobnjak, korak 1",
    },
    {
        id: "A3",
        label: "A3 — Nova firma, Radno mesto",
        hint: "Čarobnjak, korak 3",
    },
    {
        id: "B",
        label: "B — Kontakt-lice",
        hint: "Tab Lična karta, otvori dialog Dodaj kontakt-lice",
    },
    {
        id: "D_DATE",
        label: "D — Datum akta",
        hint: "Tab Dokumentacija, sekcija Akt o proceni rizika",
    },
    {
        id: "D_REASON",
        label: "D — Razlog izmene (akt)",
        hint: "Otvoren dialog priloga/izmene sekcije akta",
    },
    {
        id: "E_ADD",
        label: "E — Dodaj radno mesto",
        hint: "Tab Radna mesta, otvori Dodaj radno mesto",
    },
    {
        id: "E_EDIT",
        label: "E — Izmeni Viljuškarista",
        hint: "Tab Radna mesta, otvori izmenu za Viljuškarista",
    },
    {
        id: "F1",
        label: "F1 — Zaposleni (Marko, test flow)",
        hint: "Otvoren dialog Dodaj zaposlenog",
    },
    {
        id: "F2",
        label: "F2 — Zaposleni (random)",
        hint: "Otvoren dialog Dodaj zaposlenog — novi podaci svaki put",
    },
    {
        id: "F3",
        label: "F3 — Zaposleni (random)",
        hint: "Otvoren dialog Dodaj zaposlenog — novi podaci svaki put",
    },
    {
        id: "G",
        label: "G — Šablon dokumenta",
        hint: "Dokumenti → Šabloni, otvori Dodaj šablon (bez fajla)",
    },
    {
        id: "H",
        label: "H — Vrsta obaveze",
        hint: "Podešavanja → Vrste obaveza, otvori dialog",
    },
    {
        id: "I1",
        label: "I — Okidač Na zakazani datum",
        hint: "Šabloni obaveza, otvori dialog novog okidača",
    },
    {
        id: "I2",
        label: "I — Okidač Kada se završi pregled",
        hint: "Šabloni obaveza, otvori dialog novog okidača",
    },
    {
        id: "J1",
        label: "J — Dodaj obavezu",
        hint: "Otvoren dialog Dodaj obavezu",
    },
    {
        id: "K",
        label: "K — Završi aktivnost",
        hint: "Detalji aktivnosti, sekcija Završetak",
    },
    {
        id: "L_DATE",
        label: "L — Datum stručnog nalaza",
        hint: "Tab Stručni nalazi, otvoren dialog priloga",
    },
    {
        id: "M",
        label: "M — Nivo rizika TEST",
        hint: "Podešavanja → Nivoi rizika, otvori dialog",
    },
    {
        id: "O",
        label: "O — Predstojeći rokovi",
        hint: "Pregled → Predstojeći rokovi",
    },
];
