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
    documentTemplate: {
        name: "Uput - periodični lekarski pregled",
        context_type: "EMPLOYEE" as const,
        category_name: "Lekarski pregledi",
    },
    processType: {
        name: "Periodični lekarski pregled",
        subject_kind: "EMPLOYEE" as const,
        default_period_months: "12",
        lead_time_days: "30",
        is_active: true,
        include_in_medical_exam_record: true,
    },
    triggerOnSchedule: {
        document_template_name: "Uput - periodični lekarski pregled",
        email_subject: "Uput za periodični lekarski pregled",
        email_body: "U prilogu je uput za pregled.",
    },
    triggerOnComplete: {
        followup_process_type_name: "Periodični lekarski pregled",
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
    riskLevelTest: {
        code: "TEST",
        label: "Testni nivo",
        score: "5",
    },
    upcomingDeadlines: {
        company_name: "PRIVREDNO DRUŠTVO UKRAS DOO, VELIKI POPOVIĆ",
        within_days: "30",
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
