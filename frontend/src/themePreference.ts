const STORAGE_KEY = "znr-ui-palette-mode";

export type PaletteMode = "light" | "dark";

export function getStoredPaletteMode(): PaletteMode {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === "light" || raw === "dark") return raw;
    } catch {
        /* ignore */
    }
    if (
        typeof matchMedia !== "undefined" &&
        matchMedia("(prefers-color-scheme: dark)").matches
    ) {
        return "dark";
    }
    return "light";
}

export function setStoredPaletteMode(mode: PaletteMode): void {
    try {
        localStorage.setItem(STORAGE_KEY, mode);
    } catch {
        /* ignore */
    }
}
