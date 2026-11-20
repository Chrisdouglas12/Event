import { revalidatePath } from "next/cache";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { formatMoneyMinor, SupportedCurrency } from "@/config/currencies";
import { adminApi } from "@/lib/admin-api";

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
    groupName?: string;
    payerName: string;
    payerPhoneE164: string;
    totalMinor: number;
    currency: SupportedCurrency;
    expiresAt?: string | Date | null;
  };
};

export default async function AdminApprovalsPage() {
  let pendingManuals: PendingManual[] = [];
  try {
    const data = await adminApi("/admin/approvals");
    pendingManuals = (data.pendingManuals || []).map((item: PendingManual) => ({
      manual: {
        ...item.manual,
        createdAt: new Date(item.manual.createdAt),
      },
      order: {
        ...item.order,
        expiresAt: item.order.expiresAt ? new Date(item.order.expiresAt) : null,
      },
    }));
  } catch (error) {
    console.error("[admin/approvals] Unable to load manual payment queue:", error);
  }

  async function reviewPayment(formData: FormData) {
    "use server";
    const manualPaymentId = String(formData.get("manualPaymentId") || "");
    const action = String(formData.get("action") || "");
    if (!manualPaymentId || !["approve", "reject"].includes(action)) return;

    await adminApi("/admin/approvals/verify", {
      method: "POST",
      body: JSON.stringify({ manualPaymentId, action }),
    });
    revalidatePath("/admin/approvals");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#111320]">Manual Payment Approvals</h1>
        <p className="mt-0.5 text-xs text-gray-500">Review transfer submissions against the official bank statement.</p>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <span><strong>Finance policy:</strong> approve only after matching the transfer on the official bank statement. Never approve from screenshots or a participant-submitted receipt alone.</span>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3.5">Order</th>
                <th className="px-5 py-3.5">Payer</th>
                <th className="px-5 py-3.5">Transfer details</th>
                <th className="px-5 py-3.5">Submitted / expected</th>
                <th className="px-5 py-3.5 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingManuals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-4 text-center text-sm text-gray-500">
                    No pending manual payments.
                  </td>
                </tr>
              )}
              {pendingManuals.map((item) => {
                const isApproved = item.manual.status === "approved";
                const isRejected = item.manual.status === "rejected";
                const isPending = !isApproved && !isRejected;
                return (
                  <tr key={item.manual.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="font-medium text-gray-800">{item.order.reference}</div>
                      <div className="mt-0.5 text-xs text-gray-500">{item.order.groupName}</div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="font-medium text-gray-800">{item.order.payerName}</div>
                      <div className="mt-0.5 text-xs text-gray-500">{item.order.payerPhoneE164}</div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="font-medium text-gray-800">{item.manual.bankName}</div>
                      <div className="mt-0.5 text-xs text-gray-500">{item.manual.accountName}</div>
                      <div className="mt-0.5 text-xs text-gray-500">{item.manual.referenceOrTellerId}</div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="text-xs text-gray-500">
                        Submitted: {formatMoneyMinor(item.manual.amountMinor, item.order.currency)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Expected: {formatMoneyMinor(item.order.totalMinor, item.order.currency)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {isPending && (
                          <div className="flex gap-2">
                            <form action={reviewPayment} className="flex">
                              <input type="hidden" name="manualPaymentId" value={item.manual.id} />
                              <button
                                type="submit"
                                name="action"
                                value="approve"
                                className="flex items-center rounded-md bg-green-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-green-600"
                              >
                                <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" /> Approve
                              </button>
                            </form>
                            <form action={reviewPayment} className="flex">
                              <input type="hidden" name="manualPaymentId" value={item.manual.id} />
                              <button
                                type="submit"
                                name="action"
                                value="reject"
                                className="flex items-center rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-red-600"
                              >
                                <XCircle className="mr-1.5 h-4 w-4" aria-hidden="true" /> Reject
                              </button>
                            </form>
                          </div>
                        )}
                        {isApproved && (
                          <span className="flex items-center rounded-md bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-600">
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="flex items-center rounded-md bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-600">
                            Rejected
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
