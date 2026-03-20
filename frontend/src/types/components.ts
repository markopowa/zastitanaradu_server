import type { ReactNode } from "react";

export interface DateTextFieldWithPickerProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
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
