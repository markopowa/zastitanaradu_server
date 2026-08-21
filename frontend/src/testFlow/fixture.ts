import { addMonths, DateToString, todayLocalDate } from "../utils/date";
import {
    TEST_EMPLOYEE_PRIMARY,
    TEST_EMPLOYEE_HIGH_RISK,
    TEST_EMPLOYEE_LOW_RISK,
} from "./employeeFixture";

function uniqueDigits(length: number): string {
    const raw = String(Date.now()) + String(Math.floor(Math.random() * 1e6));
    return raw.slice(-length).padStart(length, "0");
}

function daysAgoDisplay(days: number): string {
    const d = todayLocalDate();
    d.setDate(d.getDate() - days);
    return DateToString(d);
}

export function buildTestCompanyFixture() {
    const stamp = uniqueDigits(5);
    return {
        registration_number: uniqueDigits(8),
        name: `PRIVREDNO DRUŠTVO UKRAS TEST ${stamp} DOO`,
        tax_id: uniqueDigits(9),
        activity_code: "1623",
        address: "Veliki Popović bb",
        phone: "035 555 123",
        email: "markovuckovic1992@gmail.com",
        notes: "Integration test",
    };
}

export const TEST_FLOW = {
    company: buildTestCompanyFixture(),
    jobRoleWizard: {
        name: "Viljuškarista",
        riskLevelCode: "POVECAN",
        riskLevelLabel: "Povećan",
    },
    jobRoleAdd: {
        name: "Magacioner",
        riskLevelCode: "UMEREN",
        riskLevelLabel: "Umeren",
    },
    jobRoleEdit: {
        name: "Viljuškarista",
        description: "Upravljanje viljuškarom u magacinu, utovar i istovar robe",
    },
    contactPerson: {
        full_name: "Zoran Antić",
        role: "DIRECTOR" as const,
        phone: "062 236 018",
        email: "markovuckovic1992@gmail.com",
        is_primary: true,
    },
    employee: TEST_EMPLOYEE_PRIMARY,
    employeeHighRisk: TEST_EMPLOYEE_HIGH_RISK,
    employeeLowRisk: TEST_EMPLOYEE_LOW_RISK,
    riskActDate: daysAgoDisplay(200),
    riskActRevisionReason: {
        intro: "Inicijalni prilog uvoda",
        assessments: "Inicijalni prilog procene",
        conclusion: "Inicijalni prilog zakljucka",
        assessmentsRevision: "Dopuna procene",
    },
    processBinding: {
        process_type_code: "LEKARSKI_PREGLED",
        process_type_name: "Periodični lekarski pregled",
    },
    activityComplete: {
        report_number: "IZV-2026-001",
        fitness_assessment: "Sposoban",
        measures_taken: "/",
    },
    complianceFindingDates: {
        equipment: daysAgoDisplay(140),
        electrical: daysAgoDisplay(200),
        environmentSummer: daysAgoDisplay(70),
        environmentWinter: daysAgoDisplay(220),
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
        name: "PP aparat P6",
        category: "PP aparati",
        inventory_number: "PP-001",
        location: "Magacin",
        service_process_type_code: "PP_APARATI_SERVIS",
        service_process_type_name: "Servis PP aparata",
    },
};

export function refreshTestCompanyFixture(): void {
    Object.assign(TEST_FLOW.company, buildTestCompanyFixture());
}

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
