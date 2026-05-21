export const paths = {
    login: "/login",
    profile: "/profile",
    users: "/users",
    roles: "/roles",
    documents: "/documents",
    documentCategories: "/documents/categories",
    documentTemplates: "/documents/templates",
    dashboard: "/dashboard",
    clientCompanies: "/client-companies",
    clientCompanyDetail: (id: number) => `/client-companies/${id}`,
    equipment: "/equipment",
    equipmentDetail: (id: number) => `/equipment/${id}`,
    processTypes: "/processes/types",
    processTemplates: "/processes/templates",
    processBindings: "/processes/bindings",
    processRuns: "/processes/runs",
    processRunDetail: (id: number) => `/processes/runs/${id}`,
} as const;

const pathToTitle: Record<string, string> = {
    [paths.profile]: "Profil",
    [paths.users]: "Korisnici",
    [paths.roles]: "Role",
    [paths.documents]: "Dokumenti",
    [paths.documentCategories]: "Kategorije dokumenata",
    [paths.documentTemplates]: "Šabloni dokumenata",
    [paths.dashboard]: "Kontrolna tabla",
    [paths.clientCompanies]: "Klijenti",
    [paths.equipment]: "Oprema",
    [paths.processTypes]: "Vrste obaveza",
    [paths.processTemplates]: "Šablon obaveze",
    [paths.processBindings]: "Obaveze",
    [paths.processRuns]: "Aktivnosti",
};

export function getPageTitle(pathname: string): string {
    if (pathname.startsWith("/client-companies/")) return "Klijent";
    if (pathname.startsWith("/equipment/")) return "Oprema";
    if (pathname.startsWith("/processes/runs/")) return "Aktivnost";
    return pathToTitle[pathname] ?? "Zaštita na radu";
}

export const bottomNavPaths = [
    paths.dashboard,
    paths.clientCompanies,
    paths.profile,
    paths.documents,
    paths.roles,
    paths.users,
] as const;

export function getNavLabel(path: string): string {
    return pathToTitle[path] ?? path;
}
