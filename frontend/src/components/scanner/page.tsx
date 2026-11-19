// frontend/src/app/admin/scanner/page.tsx
import { ScannerInterface } from "@/components/scanner/scanner-interface";

export const dynamic = "force-dynamic";

export default function AdminScannerPage() {
  return (
    <div className="-m-6 sm:-m-8 h-[calc(100vh-56px)] overflow-hidden">
      <ScannerInterface />
    </div>
  );
}