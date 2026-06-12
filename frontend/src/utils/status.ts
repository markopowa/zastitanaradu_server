import type { ChipProps } from "@mui/material";

export type RunStatus =
    | "PENDING"
    | "SENT"
    | "COMPLETED"
    | "CANCELLED"
    | "FAILED";
export type FindingStatus = "VALID" | "EXPIRING" | "EXPIRED" | "MISSING";
export type PlanStatus =
    | "OK"
    | "DUE_SOON"
    | "OVERDUE"
    | "MISSING"
    | "EXCLUDED"
    | "NOT_APPLICABLE";
export type OutboxStatus = "PENDING" | "SENT" | "FAILED" | "CANCELLED";

export interface StatusMeta {
    label: string;
    color: ChipProps["color"];
}

const RUN_STATUS_META: Record<RunStatus, StatusMeta> = {
    PENDING: { label: "Na čekanju", color: "default" },
    SENT: { label: "Poslat", color: "info" },
    COMPLETED: { label: "Završeno", color: "success" },
    CANCELLED: { label: "Otkazano", color: "default" },
    FAILED: { label: "Neuspešno", color: "error" },
};

const FINDING_STATUS_META: Record<FindingStatus, StatusMeta> = {
    VALID: { label: "Važi", color: "success" },
    EXPIRING: { label: "Ističe uskoro", color: "warning" },
    EXPIRED: { label: "Istekao", color: "error" },
    MISSING: { label: "Nedostaje", color: "default" },
};

const PLAN_STATUS_META: Record<PlanStatus, StatusMeta> = {
    OK: { label: "U redu", color: "success" },
    DUE_SOON: { label: "Uskoro dospeva", color: "warning" },
    OVERDUE: { label: "Kasni", color: "error" },
    MISSING: { label: "Nedostaje", color: "default" },
    EXCLUDED: { label: "Isključeno", color: "default" },
    NOT_APPLICABLE: { label: "Nije primenljivo", color: "default" },
};

const OUTBOX_STATUS_META: Record<OutboxStatus, StatusMeta> = {
    PENDING: { label: "Na čekanju", color: "default" },
    SENT: { label: "Poslato", color: "success" },
    FAILED: { label: "Neuspešno", color: "error" },
    CANCELLED: { label: "Otkazano", color: "default" },
};

export function runStatusMeta(status: string): StatusMeta {
    return (
        RUN_STATUS_META[status as RunStatus] ?? {
            label: status,
            color: "default",
        }
    );
}

export function findingStatusMeta(status: string): StatusMeta {
    return (
        FINDING_STATUS_META[status as FindingStatus] ?? {
            label: status,
            color: "default",
        }
    );
}

export function planStatusMeta(status: string): StatusMeta {
    return (
        PLAN_STATUS_META[status as PlanStatus] ?? {
            label: status,
            color: "default",
        }
    );
}

export function outboxStatusMeta(status: string): StatusMeta {
    return (
        OUTBOX_STATUS_META[status as OutboxStatus] ?? {
            label: status,
            color: "default",
        }
    );
}
