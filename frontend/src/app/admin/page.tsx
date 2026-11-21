import Link from "next/link";
import { cookies } from "next/headers";
import {
  Baby,
  CheckCircle2,
  Globe2,
  MapPin,
  Receipt,
  ScanLine,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

type RankedLocation = { name: string; total: number };

type DashboardStats = {
  totalPaidParticipants: number;
  individualPaidParticipants: number;
  groupPaidParticipants: number;
  paidOrders: number;
  individualOrders: number;
  groupOrders: number;
  attendanceTotals: { physically: number; online: number; not_sure: number };
  genderTotals: { male: number; female: number };
  firstTimeTotals: { yes: number; no: number };
  children: number;
  groupInvitees: number;
  groupOrdersWithChildren: number;
  qrScans: number;
  scannedParticipants: number;
  checkedInParticipants: number;
  byState: RankedLocation[];
  byNation: RankedLocation[];
};

const EMPTY_STATS: DashboardStats = {
  totalPaidParticipants: 0,
  individualPaidParticipants: 0,
  groupPaidParticipants: 0,
  paidOrders: 0,
  individualOrders: 0,
  groupOrders: 0,
  attendanceTotals: { physically: 0, online: 0, not_sure: 0 },
  genderTotals: { male: 0, female: 0 },
  firstTimeTotals: { yes: 0, no: 0 },
  children: 0,
  groupInvitees: 0,
  groupOrdersWithChildren: 0,
  qrScans: 0,
  scannedParticipants: 0,
  checkedInParticipants: 0,
  byState: [],
  byNation: [],
};

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "teal",
}: {
  label: string;
  value: number;
  note: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "teal" | "blue" | "violet" | "amber";
}) {
  const tones: Record<string, string> = {
    teal: "bg-[#EAF9F7] text-[#0E7A6E]",
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs sm:space-y-3 sm:rounded-[16px] sm:p-5">
      <div className="flex items-start justify-between gap-1.5 text-[10px] font-semibold text-gray-500 sm:text-xs">
        <span className="leading-tight">{label}</span>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </span>
      </div>
      <div className="text-xl font-black text-[#111320] sm:text-3xl">{value.toLocaleString()}</div>
      <div className="text-[10px] text-gray-400 sm:text-[11px]">{note}</div>
    </div>
  );
}

function BreakdownCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 sm:rounded-xl sm:p-4">
      <div className="text-[10px] font-bold text-gray-500 sm:text-xs">{label}</div>
      <div className="mt-0.5 text-lg font-extrabold text-[#111320] sm:mt-1 sm:text-xl">
        {value.toLocaleString()}
      </div>
      {detail && <div className="mt-0.5 text-[9px] text-gray-400 sm:text-[10px]">{detail}</div>}
    </div>
  );
}

function RankedList({
  title,
  subtitle,
  rows,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  rows: RankedLocation[];
  icon: React.ComponentType<{ className?: string }>;
}) {
  const max = rows.length > 0 ? rows[0].total : 0;

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs sm:space-y-4 sm:rounded-[20px] sm:p-6">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#0E7A6E]" />
          <h2 className="text-sm font-bold text-[#111320] sm:text-base">{title}</h2>
        </div>
        <p className="text-[11px] text-gray-400 sm:text-xs">{subtitle}</p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg bg-gray-50 p-4 text-center text-xs text-gray-400">
          No paid participant locations recorded yet.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={`${row.name}-${index}`} className="rounded-lg border border-gray-100 px-3 py-2.5">
              <div className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-center text-[11px] font-black text-gray-400">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#111320] sm:text-sm">
                  {row.name}
                </span>
                <span className="shrink-0 text-xs font-black text-[#0E7A6E] sm:text-sm">
                  {row.total.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 ml-8 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#8EE3D6]"
                  style={{ width: `${max > 0 ? Math.max(2, Math.round((row.total / max) * 100)) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function AdminDashboardPage() {
  let stats: DashboardStats = EMPTY_STATS;
  let dbAvailable = true;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("staff_token")?.value;
    const res = await fetch(`${API_BASE}/api/admin/dashboard-stats`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      stats = {
        ...EMPTY_STATS,
        ...data,
        attendanceTotals: { ...EMPTY_STATS.attendanceTotals, ...(data.attendanceTotals || {}) },
        genderTotals: { ...EMPTY_STATS.genderTotals, ...(data.genderTotals || {}) },
        firstTimeTotals: { ...EMPTY_STATS.firstTimeTotals, ...(data.firstTimeTotals || {}) },
        byState: Array.isArray(data.byState) ? data.byState : [],
        byNation: Array.isArray(data.byNation) ? data.byNation : [],
      };
    } else {
      console.error("[admin] Dashboard API failed with status:", res.status);
      dbAvailable = false;
    }
  } catch (err) {
    dbAvailable = false;
    console.error("[admin] dashboard API unavailable:", err);
  }

  const checkedIn = stats.checkedInParticipants || stats.scannedParticipants;
  const awaitingArrival = Math.max(0, stats.totalPaidParticipants - checkedIn);

  return (
    <div className="space-y-5 sm:space-y-8">
      <div>
        <h1 className="text-xl font-black tracking-tight text-[#111320] sm:text-2xl">
          Conference Operations Dashboard
        </h1>
        <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
          Paid-only registration, attendance, and gate metrics for IHGC 2026.
        </p>
      </div>

      {!dbAvailable && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800 sm:rounded-xl sm:px-4 sm:py-3 sm:text-xs">
          Backend API not reachable — showing empty metrics. Ensure your Express server is running and{" "}
          <code>NEXT_PUBLIC_API_BASE</code> is set.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <MetricCard
          label="Total Paid Participants"
          value={stats.totalPaidParticipants}
          note={`${stats.individualPaidParticipants} individual · ${stats.groupPaidParticipants} group`}
          icon={Users}
        />
        <MetricCard
          label="Checked In At Camp"
          value={checkedIn}
          note={`${awaitingArrival} paid seats not yet scanned`}
          icon={CheckCircle2}
          tone="blue"
        />
        <MetricCard
          label="First-Time Attendees"
          value={stats.firstTimeTotals.yes}
          note={`${stats.firstTimeTotals.no} returning`}
          icon={Sparkles}
          tone="violet"
        />
        <MetricCard
          label="QR Scans At Camp"
          value={stats.qrScans}
          note={`${stats.scannedParticipants} seats scanned`}
          icon={ScanLine}
          tone="amber"
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs sm:space-y-4 sm:rounded-[20px] sm:p-6">
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold text-[#111320] sm:text-base">Attendance &amp; Participant Mix</h2>
          <p className="text-[11px] text-gray-400 sm:text-xs">
            Every count is derived from verified paid registrations. Group counts include children.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
          <BreakdownCard label="Physically Attending" value={stats.attendanceTotals.physically} detail="paid seats" />
          <BreakdownCard label="Online" value={stats.attendanceTotals.online} detail="paid seats" />
          <BreakdownCard label="Not Sure" value={stats.attendanceTotals.not_sure} detail="paid seats" />
          <BreakdownCard label="Male" value={stats.genderTotals.male} detail="paid seats including children" />
          <BreakdownCard label="Female" value={stats.genderTotals.female} detail="paid seats including children" />
          <BreakdownCard label="Children" value={stats.children} detail="included in totals above" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs sm:rounded-[16px]">
          <Users className="h-5 w-5 shrink-0 text-[#0E7A6E]" />
          <div>
            <div className="text-[10px] font-semibold text-gray-500">Group Invitees</div>
            <div className="text-lg font-black text-[#111320]">{stats.groupInvitees.toLocaleString()}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs sm:rounded-[16px]">
          <UserRound className="h-5 w-5 shrink-0 text-[#0E7A6E]" />
          <div>
            <div className="text-[10px] font-semibold text-gray-500">Group Paid Seats</div>
            <div className="text-lg font-black text-[#111320]">{stats.groupPaidParticipants.toLocaleString()}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs sm:rounded-[16px]">
          <Baby className="h-5 w-5 shrink-0 text-[#0E7A6E]" />
          <div>
            <div className="text-[10px] font-semibold text-gray-500">Groups With Children</div>
            <div className="text-lg font-black text-[#111320]">{stats.groupOrdersWithChildren.toLocaleString()}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs sm:rounded-[16px]">
          <Receipt className="h-5 w-5 shrink-0 text-[#0E7A6E]" />
          <div>
            <div className="text-[10px] font-semibold text-gray-500">Paid Orders</div>
            <div className="text-lg font-black text-[#111320]">{stats.paidOrders.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 sm:gap-4">
        <RankedList
          title="Attendance By State"
          subtitle="Nigerian states ranked by paid seats, highest first."
          rows={stats.byState}
          icon={MapPin}
        />
        <RankedList
          title="Attendance By Nation"
          subtitle="Countries ranked by paid seats, highest first."
          rows={stats.byNation}
          icon={Globe2}
        />
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-4">
        <Link
          href="/admin/payments"
          className="block space-y-1 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs transition-colors hover:border-gray-300 sm:rounded-[16px] sm:p-5"
        >
          <div className="text-xs font-bold text-[#111320] sm:text-sm">Payments →</div>
          <div className="text-[11px] text-gray-500 sm:text-xs">
            Review verified Paystack and PayPal payments.
          </div>
        </Link>
        <Link
          href="/admin/participants"
          className="block space-y-1 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs transition-colors hover:border-gray-300 sm:rounded-[16px] sm:p-5"
        >
          <div className="text-xs font-bold text-[#111320] sm:text-sm">Participants →</div>
          <div className="text-[11px] text-gray-500 sm:text-xs">
            Inspect paid participant and check-in records.
          </div>
        </Link>
        <Link
          href="/admin/scanner"
          className="block space-y-1 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs transition-colors hover:border-gray-300 sm:rounded-[16px] sm:p-5"
        >
          <div className="text-xs font-bold text-[#111320] sm:text-sm">Live Scanner →</div>
          <div className="text-[11px] text-gray-500 sm:text-xs">
            Check in individual and group QR tickets at the gate.
          </div>
        </Link>
      </div>
    </div>
  );
}
