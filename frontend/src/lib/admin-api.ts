import { cookies } from "next/headers";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

export async function adminApi(path: string, init: RequestInit = {}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("staff_token")?.value;
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || `Admin API request failed (${response.status})`);
  }
  return response.json();
}
