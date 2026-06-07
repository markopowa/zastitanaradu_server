import type { ChipProps } from "@mui/material";
import type {
    EmailRecipientKind,
    RunStatus,
    SubjectKind,
    TriggerKind,
} from "../types/design";

export const RUN_STATUS_LABELS: Record<RunStatus, string> = {
    PENDING: "Na čekanju",
    SENT: "Poslat",
    COMPLETED: "Završeno",
    CANCELLED: "Otkazano",
    FAILED: "Neuspešno",
};

export const RUN_STATUS_COLOR: Record<RunStatus, ChipProps["color"]> = {
    PENDING: "default",
    SENT: "info",
    COMPLETED: "success",
    CANCELLED: "default",
    FAILED: "error",
};

export const SUBJECT_KIND_LABELS: Record<SubjectKind, string> = {
    EMPLOYEE: "Zaposleni",
    EQUIPMENT: "Oprema",
    CLIENT_COMPANY: "Firma",
};

export const TRIGGER_LABELS: Record<TriggerKind, string> = {
    ON_LEAD: "N dana pre termina",
    ON_SCHEDULED: "Na zakazani datum",
    ON_COMPLETED: "Kada se završi pregled",
    ON_OVERDUE: "Kada nije završeno na vreme",
};

export const TRIGGER_KINDS: TriggerKind[] = [
    "ON_LEAD",
    "ON_SCHEDULED",
    "ON_COMPLETED",
    "ON_OVERDUE",
];

export const EMAIL_RECIPIENT_LABELS: Record<EmailRecipientKind, string> = {
    CLIENT_MAIN_EMAIL: "Glavni email firme",
    EMPLOYEE_EMAIL: "Email zaposlenog",
    INTERNAL_ROLE: "Interna uloga",
    CUSTOM: "Prilagođena adresa",
};

export const EMAIL_RECIPIENT_KINDS: EmailRecipientKind[] = [
    "CLIENT_MAIN_EMAIL",
    "EMPLOYEE_EMAIL",
    "INTERNAL_ROLE",
    "CUSTOM",
];

export const RUN_STATUS_KINDS: RunStatus[] = [
    "PENDING",
    "SENT",
    "COMPLETED",
    "CANCELLED",
    "FAILED",
];

export const BUTTON_LABELS = {
    save: "Sačuvaj",
    cancel: "Odustani",
    delete: "Obriši",
    add: "Dodaj",
    edit: "Izmeni",
    close: "Zatvori",
    saving: "Čuvam…",
    deleting: "Brišem…",
};

export function runStatusLabel(status: string): string {
    return RUN_STATUS_LABELS[status as RunStatus] ?? status;
}

export function runStatusColor(status: string): ChipProps["color"] {
    return RUN_STATUS_COLOR[status as RunStatus] ?? "default";
}

export function subjectKindLabel(kind: string): string {
    return SUBJECT_KIND_LABELS[kind as SubjectKind] ?? kind;
}

export function triggerLabel(trigger: string): string {
    return TRIGGER_LABELS[trigger as TriggerKind] ?? trigger;
}

export function emailRecipientLabel(kind: string): string {
    return EMAIL_RECIPIENT_LABELS[kind as EmailRecipientKind] ?? kind;
}
