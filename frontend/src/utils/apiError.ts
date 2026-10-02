export function apiErrorMessage(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: unknown } }).response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (!data || typeof data !== "object") return fallback;
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    const parts = Object.values(data as Record<string, unknown>).flatMap(
        (val) => (Array.isArray(val) ? val.map(String) : [String(val)]),
    );
    const text = parts.filter((p) => p.trim()).join(" ");
    return text || fallback;
}
