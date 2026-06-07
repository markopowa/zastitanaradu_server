import type { ReactNode } from "react";
import type { ButtonProps } from "@mui/material";

export type RunStatus =
    | "PENDING"
    | "SENT"
    | "COMPLETED"
    | "CANCELLED"
    | "FAILED";

export type SubjectKind = "EMPLOYEE" | "EQUIPMENT" | "CLIENT_COMPANY";

export type TriggerKind =
    | "ON_LEAD"
    | "ON_SCHEDULED"
    | "ON_COMPLETED"
    | "ON_OVERDUE";

export type DesignChipSize = "small" | "medium";

export type RiskBadgeSource = "override" | "job_role";

export interface RiskLevelLike {
    label: string;
    is_high_risk?: boolean;
    is_acceptable?: boolean;
    score?: number;
}

export interface StatusBadgeProps {
    status: string;
    isOverdue?: boolean;
    isExpiringSoon?: boolean;
    hasEmailError?: boolean;
    size?: DesignChipSize;
}

export interface RiskBadgeProps {
    riskLevel?: RiskLevelLike | null;
    source?: RiskBadgeSource;
    size?: DesignChipSize;
}

export interface SectionCardProps {
    title: string;
    action?: ReactNode;
    children: ReactNode;
    dense?: boolean;
}

export interface EmptyStateProps {
    message: string;
    icon?: ReactNode;
    action?: ReactNode;
}

export interface LoadingStateProps {
    label?: string;
}

export interface ErrorStateProps {
    message: string;
    onRetry?: () => void;
}

export interface TableStateRowProps {
    colSpan: number;
    state: "loading" | "empty" | "error";
    emptyMessage?: string;
    errorMessage?: string;
    onRetry?: () => void;
}

export interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmColor?: Extract<
        ButtonProps["color"],
        "error" | "warning" | "primary"
    >;
    loading?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export interface FormActionsProps {
    onCancel: () => void;
    onSave?: () => void;
    saving?: boolean;
    saveLabel?: string;
    cancelLabel?: string;
    disabled?: boolean;
    savePermission?: string;
}

export interface RequiredLabelProps {
    text: string;
}
