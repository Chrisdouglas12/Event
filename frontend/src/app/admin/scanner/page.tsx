// Standalone full-screen route: it deliberately lives outside the admin
// console layout so the scanner fills the viewport on mobile.
import { redirect } from "next/navigation";

import { ScannerInterface } from "@/components/scanner/scanner-interface";
import { requireAnyRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminScannerPage() {
  const user = await requireAnyRole(["attendant", "supervisor"]);
  if (!user) redirect("/staff/login");

  return <ScannerInterface />;
}
