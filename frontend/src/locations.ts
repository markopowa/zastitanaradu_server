export const paths = {
    login: "/login",
    profile: "/profile",
    users: "/users",
    roles: "/roles",
    documents: "/documents",
    documentCategories: "/documents/categories",
    trainings: "/trainings",
    trainingSessions: "/trainings/sessions",
    trainingAttendance: "/trainings/attendance",
    trainingPrograms: "/trainings/programs",
} as const;

const pathToTitle: Record<string, string> = {
    [paths.profile]: "Profil",
    [paths.users]: "Korisnici",
    [paths.roles]: "Role",
    [paths.documents]: "Dokumenti",
    [paths.documentCategories]: "Kategorije dokumenata",
    [paths.trainings]: "Obuke",
    [paths.trainingSessions]: "Sesije obuka",
    [paths.trainingAttendance]: "Prisustvo",
    [paths.trainingPrograms]: "Programi obuka",
};

export function getPageTitle(pathname: string): string {
    return pathToTitle[pathname] ?? "Zaštita na radu";
}

export const bottomNavPaths = [
    paths.profile,
    paths.users,
    paths.documents,
    paths.trainings,
    paths.roles,
] as const;

export function getNavLabel(path: string): string {
    return pathToTitle[path] ?? path;
}
