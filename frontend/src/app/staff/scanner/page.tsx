import { redirect } from "next/navigation";

import { ScannerInterface } from "@/components/scanner/scanner-interface";
import { requireAnyRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function StaffScannerPage() {
  const user = await requireAnyRole(["attendant", "supervisor"]);
  if (!user) redirect("/staff/login");

  return <ScannerInterface />;
}
