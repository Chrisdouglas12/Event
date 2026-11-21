import { adminApi } from "@/lib/admin-api";
import { formatMoneyMinor, SupportedCurrency } from "@/config/currencies";

export const dynamic = "force-dynamic";

type PaymentRow = {
  id: string;
  reference: string;
  payerName: string;
  groupName?: string | null;
  totalMinor: number;
  currency: string;
  seats?: number;
  isGroup?: boolean;
  provider?: string | null;
  paidAt?: string;
  createdAt?: string;
};

export default async function FinancePaymentsPage() {
  let payments: PaymentRow[] = [];
  let error: string | null = null;

  try {
    const data = await adminApi("/admin/payments");
    payments = data.payments || data.orders || [];
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load payments.";
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#111320]">Payments</h1>
        <p className="mt-1 text-sm text-gray-600">
          Verified Paystack and PayPal payments only.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="p-4">Reference</th>
              <th className="p-4">Payer</th>
              <th className="p-4">Provider</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Seats</th>
              <th className="p-4">Paid At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-gray-500">
                  No verified payments recorded yet.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="align-top">
                  <td className="p-4 font-mono font-bold">{payment.reference}</td>
                  <td className="p-4">
                    {payment.payerName}
                    {payment.groupName && (
                      <div className="text-xs text-gray-500">{payment.groupName}</div>
                    )}
                  </td>
                  <td className="p-4 capitalize">{payment.provider || "—"}</td>
                  <td className="p-4 font-bold">
                    {formatMoneyMinor(payment.totalMinor, (payment.currency || "NGN") as SupportedCurrency)}
                  </td>
                  <td className="p-4">{payment.seats ?? 1}</td>
                  <td className="p-4 text-xs text-gray-500">
                    {payment.paidAt || payment.createdAt
                      ? new Date(payment.paidAt || payment.createdAt || "").toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
