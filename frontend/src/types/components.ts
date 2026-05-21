import type { ReactNode } from "react";

export interface DateTextFieldWithPickerProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    defaultYearsAgo?: number;
    minYearsAgo?: number;
    minYearsAgoMessage?: string;
    minToday?: boolean;
    helperText?: string;
    error?: boolean;
}

export interface AuthInitializerOwnProps {
    children: ReactNode;
}

export interface AuthInitializerDispatchProps {
    loadMe: () => void;
}

export type AuthInitializerProps = AuthInitializerOwnProps &
    AuthInitializerDispatchProps;

export interface AuthInitializerState {}
