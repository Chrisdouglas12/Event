// frontend/src/lib/auth/session.ts
import { cookies } from "next/headers";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("staff_token")?.value;

  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { 
        Authorization: `Bearer ${token}` 
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    
    const data = await res.json();
    return data.staff || null;
  } catch (err) {
    console.error("[getSession] Failed to fetch session:", err);
    return null;
  }
}

export async function requireAnyRole(allowedRoles: string[]) {
  const user = await getSession();

  if (!user) return null;

  if (user.role === "admin" || allowedRoles.includes(user.role)) {
    return user;
  }

  return null;
}

/** Preserves the original single-role contract, including the admin override. */
export async function requireRole(requiredRole: string) {
  return requireAnyRole([requiredRole]);
}