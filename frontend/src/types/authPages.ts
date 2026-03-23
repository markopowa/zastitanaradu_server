import type { AuthUser, Permission, Role } from "./auth";

export interface LoginPageStateProps {
    loading: boolean;
    error?: string;
    isAuthenticated: boolean;
}

export interface LoginPageDispatchProps {
    onLogin: (username: string, password: string) => void;
}

export type LoginPageProps = LoginPageStateProps & LoginPageDispatchProps;

export interface LoginPageState {
    username: string;
    password: string;
}

export interface UsersListPageStateProps {
    users: AuthUser[];
    roles: Role[];
    adminError?: string;
}

export interface UsersListPageDispatchProps {
    loadUsers: () => void;
    loadRoles: () => void;
    createUser: (p: {
        username: string;
        first_name: string;
        last_name: string;
        email: string;
        password: string;
        is_active?: boolean;
        roles?: number[];
    }) => void;
    updateUser: (p: {
        id: number;
        username: string;
        first_name: string;
        last_name: string;
        email: string;
        is_active: boolean;
        roles: number[];
        password?: string;
    }) => void;
    clearAdminError: () => void;
    setLastPath: (path: string) => void;
}

export type UsersListPageProps = UsersListPageStateProps &
    UsersListPageDispatchProps;

export interface UsersListPageState {
    dialogOpen: boolean;
    editingUser: AuthUser | null;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    is_active: boolean;
    selectedRoleIds: number[];
}

export interface RolesListPageStateProps {
    roles: Role[];
    permissions: Permission[];
    adminError?: string;
}

export interface RolesListPageDispatchProps {
    loadRoles: () => void;
    loadPermissions: () => void;
    createRole: (p: { name: string; permissions: number[] }) => void;
    updateRole: (p: {
        id: number;
        name: string;
        permissions: number[];
    }) => void;
    deleteRole: (id: number) => void;
    setLastPath: (path: string) => void;
}

export type RolesListPageProps = RolesListPageStateProps &
    RolesListPageDispatchProps;

export interface RolesListPageState {
    dialogOpen: boolean;
    editingId: number | null;
    name: string;
    selectedPermissionIds: number[];
    deleteConfirmId: number | null;
}

export interface UserProfilePageStateProps {
    user?: AuthUser;
}

export interface UserProfilePageDispatchProps {
    dispatchUpdateProfile: (payload: {
        username: string;
        first_name: string;
        last_name: string;
    }) => Promise<unknown>;
}

export type UserProfilePageProps = UserProfilePageStateProps &
    UserProfilePageDispatchProps;

export interface UserProfilePageState {
    username: string;
    firstName: string;
    lastName: string;
    profileSaving: boolean;
    profileMessage: { type: "success" | "error"; text: string } | null;
    passwordDialogOpen: boolean;
}
