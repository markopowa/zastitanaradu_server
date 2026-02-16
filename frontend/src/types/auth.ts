export interface AuthUser {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: string[];
    permissions: string[];
}

export interface Role {
    id: string;
    name: string;
    permissions: string[];
}

export interface AuthState {
    accessToken?: string;
    refreshToken?: string;
    user?: AuthUser;
    isAuthenticated: boolean;
    loading: boolean;
    error?: string;
    users: AuthUser[];
    roles: Role[];
    adminLoading: boolean;
    adminError?: string;
}


