import { cookies } from "next/headers";
import { formatMoneyMinor, SupportedCurrency } from "@/config/currencies";

export const dynamic = "force-dynamic";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

type PaymentRow = {
  id: string;
  reference: string;
  payerName: string;
  groupName?: string | null;
  payerPhoneE164?: string;
  payerEmail?: string;
  totalMinor: number;
  currency: string;
  seats?: number;
  isGroup?: boolean;
  provider?: string | null;
  paidAt?: string;
  createdAt?: string;
};

export default async function AdminPaymentsPage() {
  let payments: PaymentRow[] = [];
  let errorMsg: string | null = null;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("staff_token")?.value;

    if (!token) {
      errorMsg = "Missing authentication token.";
    } else {
      const res = await fetch(`${API_BASE}/api/admin/payments`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        payments = data.payments || data.orders || [];
      } else {
        errorMsg = `API failed with status: ${res.status}`;
        console.error("[admin/payments] API failed with status:", res.status);
      }
    }
  } catch (err: any) {
    errorMsg = err?.message || "Failed to fetch";
    console.error("[admin/payments] Failed to fetch:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#111320] tracking-tight">Payments</h1>
        <p className="mt-0.5 text-xs text-gray-500">
          Verified Paystack payments. No pending or manual-transfer records are stored.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          Error: {errorMsg}
        </div>
      )}

      <div className="overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3.5">Reference</th>
                <th className="px-5 py-3.5">Payer / Group</th>
                <th className="px-5 py-3.5">Provider</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Seats</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Paid At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-gray-400">
                    No verified payments recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  let dateStr = "—";
                  const rawDate = payment.paidAt || payment.createdAt;
                  if (rawDate) {
                    try {
                      dateStr = new Date(rawDate).toLocaleString();
                    } catch {
                      dateStr = String(rawDate);
                    }
                  }

                  return (
                    <tr key={payment.id} className="transition-colors hover:bg-gray-50/80">
                      <td className="px-5 py-3.5 font-mono font-bold text-black">{payment.reference}</td>
                      <td className="px-5 py-3.5 font-semibold text-[#111320]">
                        <div>{payment.payerName}</div>
                        {payment.groupName && (
                          <div className="text-[10px] font-normal text-gray-400">{payment.groupName}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 capitalize">{payment.provider || "—"}</td>
                      <td className="px-5 py-3.5 font-bold text-black">
                        {formatMoneyMinor(payment.totalMinor, (payment.currency || "NGN") as SupportedCurrency)}
                      </td>
                      <td className="px-5 py-3.5">{payment.seats ?? 1}</td>
                      <td className="px-5 py-3.5">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                          {payment.isGroup ? "Group" : "Individual"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          paid
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[11px] text-gray-400">{dateStr}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
