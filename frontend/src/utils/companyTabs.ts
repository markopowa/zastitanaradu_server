export type CompanyTabKey =
    | "overview"
    | "identity"
    | "documents"
    | "job_roles"
    | "employees"
    | "obligations";

export const COMPANY_TABS: { key: CompanyTabKey; label: string }[] = [
    { key: "overview", label: "Plan obaveza" },
    { key: "identity", label: "Lična karta" },
    { key: "documents", label: "Dokumentacija" },
    { key: "job_roles", label: "Radna mesta i rizik" },
    { key: "employees", label: "Zaposleni" },
    { key: "obligations", label: "Aktivne obaveze" },
];

const VALID_KEYS = new Set(COMPANY_TABS.map((t) => t.key));

const LEGACY_KEY_MAP: Record<string, CompanyTabKey> = {
    expert_findings: "documents",
    compliance: "overview",
};

export function parseCompanyTab(search: string): CompanyTabKey {
    const raw = search.startsWith("?") ? search.slice(1) : search;
    const tab = new URLSearchParams(raw).get("tab");
    if (tab != null) {
        if (VALID_KEYS.has(tab as CompanyTabKey)) {
            return tab as CompanyTabKey;
        }
        const mapped = LEGACY_KEY_MAP[tab];
        if (mapped != null) {
            return mapped;
        }
    }
    return "overview";
}

export function companyTabUrl(companyId: number, tab: CompanyTabKey): string {
    return `/client-companies/${companyId}?tab=${tab}`;
}
