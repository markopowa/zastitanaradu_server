import axios from "axios";
import { refresh } from "./tokenManager";

export const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const api = axios.create({
    baseURL: apiBaseUrl,
    withCredentials: true,
});

type PagedResponse<T> = T[] | { results?: T[]; next?: string | null };

const PAGE_SIZE = 500;

export async function getAll<T>(
    url: string,
    params?: Record<string, unknown>,
): Promise<T[]> {
    const items: T[] = [];
    for (let page = 1; ; page++) {
        const { data } = await api.get<PagedResponse<T>>(url, {
            params: { ...params, page, page_size: PAGE_SIZE },
        });
        if (Array.isArray(data)) return data;
        items.push(...(data?.results ?? []));
        if (!data?.next) return items;
    }
}

export async function getRecent<T>(url: string, limit = 200): Promise<T[]> {
    const { data } = await api.get<PagedResponse<T>>(url, {
        params: { page_size: limit },
    });
    return Array.isArray(data) ? data : (data?.results ?? []);
}

export function filenameFromResponse(
    headers: unknown,
    fallback: string,
): string {
    const cd =
        (headers as Record<string, string> | undefined)?.[
            "content-disposition"
        ] ?? "";
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
    if (!match) return fallback;
    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
}

export function triggerBlobDownload(data: BlobPart, filename: string): void {
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}

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
