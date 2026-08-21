import { DateToString, StringToDate } from "./date";

const JMBG_RE = /^\d{13}$/;
const JMBG_WEIGHTS = [7, 6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;

export const isJmbgComplete = (jmbg: string): boolean =>
    JMBG_RE.test(jmbg.trim());

export function jmbgControlDigit(base12: string): string {
    if (!/^\d{12}$/.test(base12)) {
        throw new Error("JMBG base must be 12 digits");
    }
    let total = 0;
    for (let i = 0; i < 12; i += 1) {
        total += Number(base12[i]) * JMBG_WEIGHTS[i]!;
    }
    const remainder = 11 - (total % 11);
    const control = remainder === 10 || remainder === 11 ? 0 : remainder;
    return String(control);
}

export function buildValidJmbg(base12: string): string {
    return `${base12}${jmbgControlDigit(base12)}`;
}

export function isJmbgChecksumValid(jmbg: string): boolean {
    const trimmed = jmbg.trim();
    if (!JMBG_RE.test(trimmed)) return false;
    return trimmed[12] === jmbgControlDigit(trimmed.slice(0, 12));
}

export const jmbgToDateString = (jmbg: string): string | null => {
    const trimmed = jmbg.trim();
    if (!JMBG_RE.test(trimmed)) return null;
    const day = Number(trimmed.slice(0, 2));
    const month = Number(trimmed.slice(2, 4));
    const yyy = Number(trimmed.slice(4, 7));
    const year = yyy >= 900 ? 1000 + yyy : 2000 + yyy;
    const d = new Date(year, month - 1, day);
    if (
        Number.isNaN(d.getTime()) ||
        d.getFullYear() !== year ||
        d.getMonth() !== month - 1 ||
        d.getDate() !== day
    ) {
        return null;
    }
    return DateToString(d);
};

export const jmbgMatchesDate = (jmbg: string, dateStr: string): boolean => {
    if (!isJmbgComplete(jmbg)) return true;
    if (!dateStr.trim()) return true;
    const fromJmbg = jmbgToDateString(jmbg);
    if (!fromJmbg) return true;
    const parsed = StringToDate(dateStr);
    if (!parsed) return true;
    return fromJmbg === DateToString(parsed);
};
