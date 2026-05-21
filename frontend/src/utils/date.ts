const pad2 = (n: number): string => String(n).padStart(2, "0");

export const SERBIAN_MONTH_NAMES = [
    "januar",
    "februar",
    "mart",
    "april",
    "maj",
    "jun",
    "jul",
    "avgust",
    "septembar",
    "oktobar",
    "novembar",
    "decembar",
] as const;

const formatDateParts = (day: number, monthIndex: number, year: number): string =>
    `${day}. ${SERBIAN_MONTH_NAMES[monthIndex]} ${year}.`;

export const DateToString = (value?: Date | null): string => {
    if (!value) return "";
    const y = value.getFullYear();
    const m = value.getMonth() + 1;
    const day = value.getDate();
    return `${pad2(day)}.${pad2(m)}.${y}`;
};

export const StringToDate = (value?: string | null): Date | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const m = /^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})$/.exec(trimmed);
    if (!m) return null;
    const [, dd, mm, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(d.getTime()) ? null : d;
};

export const formatDateDisplay = (value?: string | null): string => {
    if (!value) return "—";
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (isoMatch) {
        const [, yyyy, mm, dd] = isoMatch;
        const monthIndex = Number(mm) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
            return formatDateParts(Number(dd), monthIndex, Number(yyyy));
        }
    }
    const d = StringToDate(value) ?? new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return formatDateParts(d.getDate(), d.getMonth(), d.getFullYear());
};

export const formatDateTimeISO = (value?: string | null): string => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const datePart = formatDateParts(d.getDate(), d.getMonth(), d.getFullYear());
    return `${datePart} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

export const formatDateTimeDisplay = (value?: string | null): string => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const datePart = formatDateParts(d.getDate(), d.getMonth(), d.getFullYear());
    return `${datePart} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export const isoDateToFormDisplay = (value?: string | null): string => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return DateToString(d);
};

export const displayDateToIso = (value: string): string | undefined => {
    const date = StringToDate(value.trim());
    if (!date) return undefined;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const todayLocalDate = (): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

export const addMonths = (value: Date, months: number): Date => {
    const d = new Date(value.getFullYear(), value.getMonth(), value.getDate());
    d.setMonth(d.getMonth() + months);
    return d;
};

export const isDateTodayOrFuture = (value: string): boolean => {
    const date = StringToDate(value.trim());
    if (!date) return false;
    return date.getTime() >= todayLocalDate().getTime();
};

export const isDateStrictlyFuture = (value: string): boolean => {
    const date = StringToDate(value.trim());
    if (!date) return false;
    return date.getTime() > todayLocalDate().getTime();
};

export const bindingTermDateError = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (!StringToDate(trimmed)) return "Unesi datum kao dd.mm.yyyy.";
    if (!isDateTodayOrFuture(trimmed)) {
        return "Termin ne može biti u prošlosti.";
    }
    return undefined;
};

export const validUntilDateError = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (!StringToDate(trimmed)) return "Unesi datum kao dd.mm.yyyy.";
    if (!isDateStrictlyFuture(trimmed)) {
        return "Datum mora biti u budućnosti.";
    }
    return undefined;
};
