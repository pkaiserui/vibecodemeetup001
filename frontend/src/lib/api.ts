import { supabase } from "./supabase";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const authDisabled = import.meta.env.VITE_AUTH_DISABLED === "true";
  if (!authDisabled) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers.set("Authorization", `Bearer ${data.session.access_token}`);
    }
  } else {
    // For local development without auth, simulate a user
    headers.set("X-User-Id", "dev-user");
    headers.set("X-User-Email", "dev@local");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
