import { DateToString, StringToDate } from "./date";

const JMBG_RE = /^\d{13}$/;

export const isJmbgComplete = (jmbg: string): boolean =>
    JMBG_RE.test(jmbg.trim());

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
