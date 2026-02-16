import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const api = axios.create({
    baseURL: apiBaseUrl,
    withCredentials: true,
});

let accessToken: string | undefined;
let refreshToken: string | undefined;

export function setTokens(nextAccess?: string, nextRefresh?: string): void {
    accessToken = nextAccess;
    refreshToken = nextRefresh ?? refreshToken;
}

api.interceptors.request.use((config) => {
    if (accessToken) {
        config.headers = {
            ...config.headers,
            Authorization: `Bearer ${accessToken}`,
        };
    }
    return config;
});


