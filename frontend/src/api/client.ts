import axios from "axios";
import { refresh } from "./tokenManager";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const api = axios.create({
    baseURL: apiBaseUrl,
    withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown = null, token: unknown = null) {
    failedQueue.forEach((prom) =>
        error ? prom.reject(error) : prom.resolve(token),
    );
    failedQueue = [];
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const isSessionCheck =
            originalRequest?.url != null &&
            (originalRequest.url.includes("/auth/me/") ||
                originalRequest.url.includes("/auth/login/"));

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !isSessionCheck
        ) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => api(originalRequest))
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            return refresh()
                .then(() => {
                    processQueue(null, null);
                    return api(originalRequest);
                })
                .catch((err) => {
                    processQueue(err, null);
                    return Promise.reject(err);
                })
                .finally(() => {
                    isRefreshing = false;
                });
        }

        return Promise.reject(error);
    },
);
