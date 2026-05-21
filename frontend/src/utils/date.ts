const pad2 = (n: number): string => String(n).padStart(2, "0");

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
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${pad2(day)}.${pad2(m)}.${y}`;
};

export const formatDateTimeISO = (value?: string | null): string => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const h = d.getHours();
    const min = d.getMinutes();
    const s = d.getSeconds();
    return `${pad2(day)}.${pad2(m)}.${y} ${pad2(h)}:${pad2(min)}:${pad2(s)}`;
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
