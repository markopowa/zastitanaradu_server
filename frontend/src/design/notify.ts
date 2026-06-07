import { enqueueSnackbar } from "notistack";

interface ErrorResponseData {
    detail?: unknown;
}

interface ErrorWithResponse {
    response?: {
        data?: ErrorResponseData | string;
    };
    message?: unknown;
}

function errorMessage(error: unknown, fallback: string): string {
    if (typeof error === "string") return error;
    if (typeof error !== "object" || error === null) return fallback;

    const source = error as ErrorWithResponse;
    const data = source.response?.data;

    if (typeof data === "string") return data;
    if (typeof data?.detail === "string") return data.detail;
    if (typeof source.message === "string") return source.message;

    return fallback;
}

export function notifySuccess(message: string): void {
    enqueueSnackbar(message, { variant: "success" });
}

export function notifyError(error: unknown, fallback: string): void {
    enqueueSnackbar(errorMessage(error, fallback), { variant: "error" });
}
