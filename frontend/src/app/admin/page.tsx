import Link from "next/link";
import { cookies } from "next/headers"; // 👈 Added
import { Users, Receipt, CheckCircle2, AlertCircle } from "lucide-react";
import { formatMoneyMinor, SupportedCurrency } from "@/config/currencies";

export const dynamic = "force-dynamic";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

export default async function AdminDashboardPage() {
  let dbAvailable = true;

  // Default metrics (in case the API fails)
  let totalAttendees = 0;
  let confirmedAttendees = 0;
  let checkedInAttendees = 0;
  let totalOrders = 0;
  let paidOrders = 0;
  let pendingOrders = 0;
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
      totalAttendees = data.totalAttendees || 0;
      confirmedAttendees = data.confirmedAttendees || 0;
      checkedInAttendees = data.checkedInAttendees || 0;
      totalOrders = data.totalOrders || 0;
      paidOrders = data.paidOrders || 0;
      pendingOrders = data.pendingOrders || 0;
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
  const currentTotal = confirmedAttendees || 0;
  const percentage = Math.min(100, Math.round((currentTotal / attendanceTarget) * 100));

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-[#111320] tracking-tight">
          Conference Operations Dashboard
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Real-time metrics for IHGC 2026 registration, revenue per currency, and gate capacity.
        </p>
      </div>

      {!dbAvailable && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-4 py-3">
          Backend API not reachable — showing empty metrics. Ensure your Express server is running and <code>NEXT_PUBLIC_API_BASE</code> is set.
        </div>
      )}

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-[16px] border border-gray-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Confirmed Attendees</span>
            <Users className="w-4 h-4 text-[#0E7A6E]" />
          </div>
          <div className="text-3xl font-black text-[#111320]">
            {confirmedAttendees}
          </div>
          <div className="text-[11px] text-gray-400">
            Total registered: {totalAttendees}
          </div>
        </div>

        <div className="bg-white p-5 rounded-[16px] border border-gray-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Paid Orders</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-[#111320]">
            {paidOrders}
          </div>
          <div className="text-[11px] text-gray-400">
            Pending checkout: {pendingOrders}
          </div>
        </div>

        <div className="bg-white p-5 rounded-[16px] border border-gray-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Gate Checked In</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-[#111320]">
            {checkedInAttendees}
          </div>
          <div className="text-[11px] text-gray-400">
            Awaiting arrival: {confirmedAttendees - checkedInAttendees}
          </div>
        </div>

        <div className="bg-white p-5 rounded-[16px] border border-gray-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Capacity Progress</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-[#111320]">
            {percentage}%
          </div>
          <div className="text-[11px] text-gray-400">
            Target planning: ~10,000 attendees
          </div>
        </div>
      </div>

      {/* Revenue PER CURRENCY Section */}
      <div className="bg-white rounded-[20px] border border-gray-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-[#111320]">
              Paid Order Totals (Per Currency)
            </h2>
            <p className="text-xs text-gray-400">
              Verified paid order amounts shown separately by currency; these are not provider settlement balances.
            </p>
          </div>
          <div className="text-xs font-semibold px-3 py-1 bg-gray-100 rounded-full text-gray-600">
            Database Totals
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          {(["NGN", "USD", "EUR", "GBP"] as SupportedCurrency[]).map((curr) => (
            <div key={curr} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="text-xs font-bold text-gray-500">
                {curr === "NGN" ? "Nigerian Naira" : curr === "USD" ? "US Dollar" : curr === "EUR" ? "Euro" : "British Pound"} ({curr})
              </div>
              <div className="text-xl font-extrabold text-[#111320] mt-1">
                {formatMoneyMinor(revenueByCurrency[curr], curr)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">{curr} orders</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/orders"
          className="p-5 rounded-[16px] bg-white border border-gray-200 hover:border-gray-300 transition-colors shadow-2xs block space-y-1"
        >
          <div className="text-sm font-bold text-[#111320]">Manage Orders →</div>
          <div className="text-xs text-gray-500">View payment references, retry verifications, and inspect payer records.</div>
        </Link>

        <Link
          href="/admin/attendees"
          className="p-5 rounded-[16px] bg-white border border-gray-200 hover:border-gray-300 transition-colors shadow-2xs block space-y-1"
        >
          <div className="text-sm font-bold text-[#111320]">Manage Attendees →</div>
          <div className="text-xs text-gray-500">Search attendee reference codes and inspect current check-in and booklet status.</div>
        </Link>
      </div>
    </div>
  );
}