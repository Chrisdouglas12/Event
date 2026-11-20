import { revalidatePath } from "next/cache";
import { adminApi } from "@/lib/admin-api";
import { formatMoneyMinor, SupportedCurrency } from "@/config/currencies";

export const dynamic = "force-dynamic";

type PendingManual = {
  manual: {
    id: string;
    amountMinor: number;
    bankName: string;
    accountName: string;
    referenceOrTellerId: string;
    status?: "pending" | "approved" | "rejected";
    createdAt: string | Date;
  };
  order: {
    id: string;
    reference: string;
    groupName?: string | null;
    payerName: string;
    payerPhoneE164: string;
    totalMinor: number;
    currency: SupportedCurrency;
    expiresAt?: string | Date | null;
  } | null;
};

async function reviewPayment(formData: FormData) {
  "use server";
  const manualPaymentId = String(formData.get("manualPaymentId") || "");
  const action = String(formData.get("action") || "");
  if (!manualPaymentId || !["approve", "reject"].includes(action)) return;

  await adminApi("/admin/approvals/verify", {
    method: "POST",
    body: JSON.stringify({ manualPaymentId, action }),
  });
  revalidatePath("/finance/approvals");
  revalidatePath("/admin/approvals");
}

export default async function FinanceApprovalsPage() {
  let submissions: PendingManual[] = [];
  try {
    const data = await adminApi("/admin/approvals");
    submissions = (data.pendingManuals || []).filter((item: PendingManual) => item.order);
  } catch (error) {
    console.error("[finance/approvals] Unable to load manual payment queue:", error);
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Bank transfer submissions</h1>
        <p className="mt-1 text-sm text-gray-600">Match each submission to the official bank statement before approval.</p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Do not approve from a screenshot or receipt image. Verify the cleared transfer in the bank statement.
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr><th className="p-4">Order</th><th className="p-4">Payer</th><th className="p-4">Transfer claim</th><th className="p-4">Amounts</th><th className="p-4">Decision</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {submissions.length === 0 ? (
              <tr><td colSpan={5} className="p-10 text-center text-gray-500">No pending submissions.</td></tr>
            ) : submissions.map(({ order, manual }) => {
              if (!order) return null;
              const currency = order.currency as SupportedCurrency;
              const canApprove = currency === "NGN" && manual.amountMinor === order.totalMinor &&
                (!order.expiresAt || new Date(order.expiresAt).getTime() >= Date.now());
              return (
                <tr key={manual.id} className="align-top">
                  <td className="p-4 font-mono font-bold">{order.reference}</td>
                  <td className="p-4">{order.payerName}<div className="text-xs text-gray-500">{order.payerPhoneE164}</div></td>
                  <td className="p-4">{manual.bankName}<div>{manual.accountName}</div><div className="font-mono text-xs">{manual.referenceOrTellerId}</div></td>
                  <td className="p-4">Claim: {formatMoneyMinor(manual.amountMinor, currency)}<div>Order: {formatMoneyMinor(order.totalMinor, currency)}</div></td>
                  <td className="p-4">
                    <div className="flex flex-col gap-2">
                      <form action={reviewPayment}>
                        <input type="hidden" name="manualPaymentId" value={manual.id} />
                        <button name="action" value="approve" disabled={!canApprove} className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Approve</button>
                      </form>
                      <form action={reviewPayment}>
                        <input type="hidden" name="manualPaymentId" value={manual.id} />
                        <button name="action" value="reject" className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-700">Reject</button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
