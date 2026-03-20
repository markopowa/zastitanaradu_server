import type { NavigateFunction, NavigateOptions, To } from "react-router-dom";

let storedNavigate: NavigateFunction | null = null;

export function setNavigator(navigate: NavigateFunction): void {
    storedNavigate = navigate;
}

export function navigate(to: To, options?: NavigateOptions): void {
    if (!storedNavigate) {
        console.error("Navigator is not set. Cannot navigate to:", to);
        return;
    }
    storedNavigate(to, options);
}
