"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * The browser install prompt is only useful inside the authenticated admin
 * console. Everywhere else we veto the event so public pages stay clean.
 */
export function InstallPromptGate() {
  const pathname = usePathname();

  useEffect(() => {
    const isAdminConsole = pathname === "/admin" || pathname.startsWith("/admin/");
    if (isAdminConsole) return;

    const veto = (event: Event) => event.preventDefault();
    window.addEventListener("beforeinstallprompt", veto);
    return () => window.removeEventListener("beforeinstallprompt", veto);
  }, [pathname]);

  return null;
}
