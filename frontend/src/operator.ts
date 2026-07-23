export const OPERATOR_NAME = "Zaštita na radu";

export function getOperatorDomain(): string {
    if (typeof window !== "undefined" && window.location?.hostname) {
        return window.location.hostname;
    }
    return "";
}

export function getOperatorEmail(): string {
    const domain = getOperatorDomain();
    return domain ? `info@${domain}` : "";
}
