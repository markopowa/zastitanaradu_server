export type CompanyTabKey =
    | "identity"
    | "documents"
    | "job_roles"
    | "employees"
    | "obligations"
    | "expert_findings"
    | "compliance";

export const COMPANY_TABS: { key: CompanyTabKey; label: string }[] = [
    { key: "identity", label: "Lična karta" },
    { key: "documents", label: "Dokumentacija" },
    { key: "job_roles", label: "Radna mesta i rizik" },
    { key: "employees", label: "Zaposleni" },
    { key: "obligations", label: "Obaveze/Aktivnosti" },
    { key: "expert_findings", label: "Stručni nalazi" },
    { key: "compliance", label: "Usklađenost" },
];

const VALID_KEYS = new Set(COMPANY_TABS.map((t) => t.key));

export function parseCompanyTab(search: string): CompanyTabKey {
    const raw = search.startsWith("?") ? search.slice(1) : search;
    const tab = new URLSearchParams(raw).get("tab");
    if (tab != null && VALID_KEYS.has(tab as CompanyTabKey)) {
        return tab as CompanyTabKey;
    }
    return "identity";
}

export function companyTabUrl(
    companyId: number,
    tab: CompanyTabKey,
): string {
    return `/client-companies/${companyId}?tab=${tab}`;
}
