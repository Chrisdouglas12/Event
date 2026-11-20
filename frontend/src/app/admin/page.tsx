import Link from "next/link";
import { cookies } from "next/headers"; // 👈 Added
import { Users, Receipt, CheckCircle2, AlertCircle } from "lucide-react";
import { formatMoneyMinor, SupportedCurrency } from "@/config/currencies";

export const dynamic = "force-dynamic";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

export default async function AdminDashboardPage() {
  let dbAvailable = true;

  // Default metrics (in case the API fails)
  let totalParticipants = 0;
  let confirmedParticipants = 0;
  let checkedInParticipants = 0;
  let totalOrders = 0;
  let paidOrders = 0;
  let pendingOrders = 0;
  let attendanceTotals = { physically: 0, online: 0, not_sure: 0 };
  let revenueByCurrency: Record<SupportedCurrency, number> = {
    NGN: 0, USD: 0, EUR: 0, GBP: 0,
  };

  try {
    // 👇 Read the token from the cookie we set during login
    const cookieStore = await cookies();
    const token = cookieStore.get("staff_token")?.value;

    const res = await fetch(`${API_BASE}/api/admin/dashboard-stats`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`, // 👈 Pass the token to Express
      },
    });

    if (res.ok) {
      const data = await res.json();
      totalParticipants = data.totalParticipants || 0;
      confirmedParticipants = data.confirmedParticipants || 0;
      checkedInParticipants = data.checkedInParticipants || 0;
      totalOrders = data.totalOrders || 0;
      paidOrders = data.paidOrders || 0;
      pendingOrders = data.pendingOrders || 0;
      attendanceTotals = { ...attendanceTotals, ...(data.attendanceTotals || {}) };
      revenueByCurrency = { ...revenueByCurrency, ...(data.revenueByCurrency || {}) };
    } else {
      console.error("[admin] Dashboard API failed with status:", res.status);
      dbAvailable = false;
    }
  } catch (err) {
    dbAvailable = false;
    console.error("[admin] dashboard API unavailable:", err);
  }

  const attendanceTarget = 10000;
  const currentTotal = confirmedParticipants || 0;
  const percentage = Math.min(100, Math.round((currentTotal / attendanceTarget) * 100));

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-xl font-black tracking-tight text-[#111320] sm:text-2xl">
          Conference Operations Dashboard
        </h1>
        <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
          Real-time metrics for IHGC 2026 registration, revenue per currency, and gate capacity.
        </p>
      </div>

      {!dbAvailable && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800 sm:rounded-xl sm:px-4 sm:py-3 sm:text-xs">
          Backend API not reachable — showing empty metrics. Ensure your Express server is running and <code>NEXT_PUBLIC_API_BASE</code> is set.
        </div>
      )}

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs sm:space-y-3 sm:rounded-[16px] sm:p-5">
          <div className="flex items-start justify-between gap-1.5 text-[10px] font-semibold text-gray-500 sm:text-xs">
            <span className="leading-tight">Confirmed Participants</span>
            <Users className="h-3.5 w-3.5 shrink-0 text-[#0E7A6E] sm:h-4 sm:w-4" />
          </div>
          <div className="text-xl font-black text-[#111320] sm:text-3xl">
            {confirmedParticipants}
          </div>
          <div className="text-[10px] text-gray-400 sm:text-[11px]">
            Total registered: {totalParticipants}
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs sm:space-y-3 sm:rounded-[16px] sm:p-5">
          <div className="flex items-start justify-between gap-1.5 text-[10px] font-semibold text-gray-500 sm:text-xs">
            <span className="leading-tight">Paid Orders</span>
            <Receipt className="h-3.5 w-3.5 shrink-0 text-emerald-600 sm:h-4 sm:w-4" />
          </div>
          <div className="text-xl font-black text-[#111320] sm:text-3xl">
            {paidOrders}
          </div>
          <div className="text-[10px] text-gray-400 sm:text-[11px]">
            Pending checkout: {pendingOrders}
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs sm:space-y-3 sm:rounded-[16px] sm:p-5">
          <div className="flex items-start justify-between gap-1.5 text-[10px] font-semibold text-gray-500 sm:text-xs">
            <span className="leading-tight">Gate Checked In</span>
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-blue-600 sm:h-4 sm:w-4" />
          </div>
          <div className="text-xl font-black text-[#111320] sm:text-3xl">
            {checkedInParticipants}
          </div>
          <div className="text-[10px] text-gray-400 sm:text-[11px]">
            Awaiting arrival: {confirmedParticipants - checkedInParticipants}
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs sm:space-y-3 sm:rounded-[16px] sm:p-5">
          <div className="flex items-start justify-between gap-1.5 text-[10px] font-semibold text-gray-500 sm:text-xs">
            <span className="leading-tight">Capacity Progress</span>
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500 sm:h-4 sm:w-4" />
          </div>
          <div className="text-xl font-black text-[#111320] sm:text-3xl">
            {percentage}%
          </div>
          <div className="text-[10px] text-gray-400 sm:text-[11px]">
            Target planning: ~10,000 participants
          </div>
        </div>
      </div>

      {/* Attendance Mode Section */}
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs sm:space-y-4 sm:rounded-[20px] sm:p-6">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-[#111320] sm:text-base">
              Attendance Mode
            </h2>
            <p className="text-[11px] text-gray-400 sm:text-xs">
              Seats registered for physical attendance, online attendance, and those still undecided.
            </p>
          </div>
          <div className="self-start rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-600 sm:self-auto sm:px-3 sm:text-xs">
            Paid + Pending
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 sm:gap-4 sm:pt-2">
          {([
            ['physically', 'Physically'],
            ['online', 'Online'],
            ['not_sure', 'Not Sure'],
          ] as const).map(([key, label]) => (
            <div key={key} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 sm:rounded-xl sm:p-4">
              <div className="text-[10px] font-bold text-gray-500 sm:text-xs">{label}</div>
              <div className="mt-0.5 text-lg font-extrabold text-[#111320] sm:mt-1 sm:text-xl">
                {attendanceTotals[key]}
              </div>
              <div className="mt-0.5 text-[9px] text-gray-400 sm:text-[10px]">seats</div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue PER CURRENCY Section */}
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs sm:space-y-4 sm:rounded-[20px] sm:p-6">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-[#111320] sm:text-base">
              Paid Order Totals (Per Currency)
            </h2>
            <p className="text-[11px] text-gray-400 sm:text-xs">
              Verified paid order amounts shown separately by currency; these are not provider settlement balances.
            </p>
          </div>
          <div className="self-start rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-600 sm:self-auto sm:px-3 sm:text-xs">
            Database Totals
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4 sm:gap-4 sm:pt-2">
          {(["NGN", "USD", "EUR", "GBP"] as SupportedCurrency[]).map((curr) => (
            <div key={curr} className="rounded-lg border border-gray-100 bg-gray-50 p-3 sm:rounded-xl sm:p-4">
              <div className="text-[10px] font-bold leading-tight text-gray-500 sm:text-xs">
                {curr === "NGN" ? "Nigerian Naira" : curr === "USD" ? "US Dollar" : curr === "EUR" ? "Euro" : "British Pound"} ({curr})
              </div>
              <div className="mt-1 text-base font-extrabold text-[#111320] sm:text-xl">
                {formatMoneyMinor(revenueByCurrency[curr], curr)}
              </div>
              <div className="mt-0.5 text-[9px] text-gray-400 sm:text-[10px]">{curr} orders</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4">
        <Link
          href="/admin/orders"
          className="block space-y-1 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs transition-colors hover:border-gray-300 sm:rounded-[16px] sm:p-5"
        >
          <div className="text-xs font-bold text-[#111320] sm:text-sm">Manage Orders →</div>
          <div className="text-[11px] text-gray-500 sm:text-xs">View payment references, retry verifications, and inspect payer records.</div>
        </Link>

        <Link
          href="/admin/participants"
          className="block space-y-1 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs transition-colors hover:border-gray-300 sm:rounded-[16px] sm:p-5"
        >
          <div className="text-xs font-bold text-[#111320] sm:text-sm">Manage Participants →</div>
          <div className="text-[11px] text-gray-500 sm:text-xs">Search participant reference codes and inspect current check-in and booklet status.</div>
        </Link>
      </div>
    </div>
  );
}