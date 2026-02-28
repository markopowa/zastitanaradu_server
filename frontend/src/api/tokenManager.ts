import type { AuthUser } from "../types/auth";
import { api } from "./client";

export interface LoginResult {
  user: AuthUser;
}

export async function login(
  username: string,
  password: string,
): Promise<LoginResult> {
  const { data } = await api.post<{ user: AuthUser }>("/auth/login/", {
    username,
    password,
  });
  return { user: data.user };
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout/");
}

export async function getSession(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>("/auth/me/");
  return data;
}

export async function refresh(): Promise<void> {
  await api.post("/auth/refresh/");
}
