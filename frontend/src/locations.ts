export const paths = {
    login: "/login",
    profile: "/profile",
    users: "/users",
    roles: "/roles",
    documents: "/documents",
    documentCategories: "/documents/categories",
    documentTemplates: "/documents/templates",
    danas: "/danas",
    dashboard: "/dashboard",
    clientCompanies: "/client-companies",
    clientCompanyNew: "/client-companies/new",
    clientCompanyDetail: (id: number) => `/client-companies/${id}`,
    equipment: "/equipment",
    equipmentDetail: (id: number) => `/equipment/${id}`,
    riskLevels: "/risk-levels",
    processTypes: "/processes/types",
    processTemplates: "/processes/templates",
    processBindings: "/processes/bindings",
    processRuns: "/processes/runs",
    processUpcoming: "/processes/upcoming",
    processOutbox: "/processes/outbox",
    processRunDetail: (id: number) => `/processes/runs/${id}`,
} as const;

const pathToTitle: Record<string, string> = {
    [paths.profile]: "Profil",
    [paths.users]: "Korisnici",
    [paths.roles]: "Role",
    [paths.documents]: "Dokumenti",
    [paths.documentCategories]: "Kategorije dokumenata",
    [paths.documentTemplates]: "Šabloni dokumenata",
    [paths.danas]: "Danas",
    [paths.dashboard]: "Dnevnik",
    [paths.clientCompanies]: "Firme",
    [paths.clientCompanyNew]: "Nova firma",
    [paths.equipment]: "Oprema",
    [paths.riskLevels]: "Nivoi rizika",
    [paths.processTypes]: "Vrste obaveza",
    [paths.processTemplates]: "Šabloni obaveza",
    [paths.processBindings]: "Dodeljene obaveze",
    [paths.processRuns]: "Aktivnosti",
    [paths.processUpcoming]: "Aktivnosti",
    [paths.processOutbox]: "Slanja",
};

export function getPageTitle(pathname: string): string {
    if (pathname.startsWith("/client-companies/")) return "Firma";
    if (pathname.startsWith("/equipment/")) return "Oprema";
    if (pathname.startsWith("/processes/runs/")) return "Aktivnost";
    return pathToTitle[pathname] ?? "Zaštita na radu";
}
