import { addMonths, DateToString, todayLocalDate } from "../utils/date";
import { TEST_EMPLOYEE_PRIMARY } from "./employeeFixture";

export const TEST_FLOW = {
    company: {
        registration_number: "20644206",
        name: "PRIVREDNO DRUŠTVO UKRAS DOO, VELIKI POPOVIĆ",
        tax_id: "108277286",
        activity_code: "1623",
        address: "Veliki Popović bb",
        phone: "035 555 123",
        email: "markovuckovic1992@gmail.com",
        notes: "Test",
    },
    jobRoleWizard: {
        name: "Viljuškarista",
        riskLevelLabel: "Povećan",
    },
    jobRoleAdd: {
        name: "Magacioner",
        riskLevelLabel: "Umeren",
    },
    jobRoleEdit: {
        name: "Viljuškarista",
        description: "Rukovanje viljuškarom u magacinu",
    },
    contactPerson: {
        full_name: "Zoran Antić",
        role: "DIRECTOR" as const,
        phone: "062 236 018",
        email: "markovuckovic1992@gmail.com",
        is_primary: true,
    },
    employee: TEST_EMPLOYEE_PRIMARY,
    riskActDate: "15.01.2025",
    riskActRevisionReason: {
        intro: "Inicijalni prilog uvoda",
        assessments: "Inicijalni prilog procene",
        conclusion: "Inicijalni prilog zakljucka",
        assessmentsRevision: "Dopuna procene",
    },
    processBinding: {
        process_type_name: "Periodični lekarski pregled",
    },
    activityComplete: {
        report_number: "IZV-2026-001",
        fitness_assessment: "Sposoban",
        measures_taken: "/",
    },
    complianceFindingDates: {
        equipment: "31.03.2026",
        electrical: "01.02.2026",
        environmentSummer: "15.06.2025",
        environmentWinter: "15.01.2025",
    },
    companyProfile: {
        zop_category: "III" as const,
        high_risk_activity: true,
        installations: ["FIRE_EXTINGUISHERS", "HYDRANT_NETWORK"] as const,
    },
    actAmendment: {
        title: "Izmena i dopuna Akta",
        note: "Promena na radnom mestu — povećan rizik",
    },
    equipment: {
        name: "Viljuškar Linde H25",
        category: "Oprema za rad",
        inventory_number: "INV-001",
        location: "Magacin",
    },
} as const;

export function bindingTermDateDisplay(): string {
    const d = todayLocalDate();
    d.setDate(d.getDate() + 30);
    return DateToString(d);
}

export function activityValidUntilDisplay(): string {
    return DateToString(addMonths(todayLocalDate(), 12));
}

export function activityPerformedAtDisplay(): string {
    return DateToString(todayLocalDate());
}
