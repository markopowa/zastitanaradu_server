export interface AuthUser {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    is_active: boolean;
    is_superuser?: boolean;
    roles?: number[];
    permissions?: string[];
}

export interface Permission {
    id: number;
    codename: string;
    name: string;
}

export interface Role {
    id: number;
    name: string;
    permissions: Permission[] | number[];
}

export interface AuthState {
    accessToken?: string;
    refreshToken?: string;
    user?: AuthUser & { permissions?: string[] };
    isAuthenticated: boolean;
    initialized: boolean;
    loading: boolean;
    error?: string;
    users: AuthUser[];
    roles: Role[];
    permissions: Permission[];
    adminLoading: boolean;
    adminError?: string;
}
