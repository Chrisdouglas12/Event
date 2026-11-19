import { BookOpen, CheckCircle2 } from "lucide-react";
import { BookletStockManager } from "@/components/admin/booklet-stock-manager";
import { adminApi } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

export default async function AdminBookletStockPage() {
  let currentIssued = 0;
  let allocations: Array<{
    id: string;
    standId: string;
    allocatedDate: string;
    allocatedQuantity: number;
    issuedCount: number;
    returnedCount: number;
  }> = [];
  let dbAvailable = true;

  try {
    const data = await adminApi("/admin/booklet-stock");
    currentIssued = data.currentIssued ?? 0;
    allocations = data.allocations ?? [];
  } catch (err) {
    dbAvailable = false;
    console.error("[admin/booklet-stock] Unable to load stock:", err);
  }

  const totalAllocated = allocations.reduce((sum, row) => sum + row.allocatedQuantity, 0);
  const remainingAtStands = allocations.reduce((sum, row) => sum + row.allocatedQuantity - row.issuedCount - row.returnedCount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#111320]">Booklet Stock Management</h1>
        <p className="mt-1 text-xs text-gray-500">Allocate organizer-confirmed quantities by stand and event day. Scanner issuance is recorded against this stock.</p>
      </div>

      {!dbAvailable && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">The stock ledger could not be loaded. Check the Express connection.</div>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="space-y-2 rounded-[16px] border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500"><span>Issued to attendees</span><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
          <div className="text-3xl font-black text-emerald-700">{currentIssued.toLocaleString()}</div>
          <div className="text-[11px] text-gray-400">Current attendee issue records</div>
        </div>
        <div className="space-y-2 rounded-[16px] border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500"><span>Allocated</span><BookOpen className="h-4 w-4 text-amber-600" /></div>
          <div className="text-3xl font-black text-[#111320]">{totalAllocated.toLocaleString()}</div>
          <div className="text-[11px] text-gray-400">Across all stands and days</div>
        </div>
        <div className="space-y-2 rounded-[16px] border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500"><span>Remaining at stands</span><BookOpen className="h-4 w-4 text-[#0E7A6E]" /></div>
          <div className="text-3xl font-black text-[#0E7A6E]">{remainingAtStands.toLocaleString()}</div>
          <div className="text-[11px] text-gray-400">Returned booklets are no longer counted at the stand</div>
        </div>
      </div>

      <BookletStockManager initialStock={allocations} />
    </div>
  );
}