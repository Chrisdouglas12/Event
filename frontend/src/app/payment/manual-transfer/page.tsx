import Link from "next/link";
import { formatMoneyMinor, SupportedCurrency } from "@/config/currencies";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { ManualTransferSubmission } from "@/components/payment/manual-transfer-submission";

export const dynamic = "force-dynamic";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

export default async function ManualTransferPage({ searchParams }: { searchParams: Promise<{ ref?: string; access?: string }> }) {
  const { ref, access } = await searchParams;
  let content: React.ReactNode;

  if (!ref || !access) {
    content = <Unavailable message="The bank transfer link is incomplete. Return to registration and contact the help desk if you already submitted payment." />;
  } else {
    try {
      const [orderResponse, settingsResponse] = await Promise.all([
        fetch(`${API_BASE}/api/orders/${encodeURIComponent(ref.toUpperCase())}`, { cache: "no-store" }),
        fetch(`${API_BASE}/api/settings/public`, { cache: "no-store" }),
      ]);

      if (!orderResponse.ok) {
        content = <Unavailable message="This bank transfer link is invalid. Return to registration or contact the help desk." />;
      } else {
        const { order } = await orderResponse.json() as { order: {
          reference: string;
          currency: SupportedCurrency;
          totalMinor: number;
          status: string;
          expiresAt?: string | null;
        } };
        const settings = settingsResponse.ok ? await settingsResponse.json() as { event?: { bank?: { name?: string | null; accountName?: string | null; accountNumber?: string | null } } } : null;
        const bank = settings?.event?.bank;

        if (order.status === "paid") {
          content = <section className="w-full rounded-3xl border border-emerald-200 bg-emerald-50 p-7 text-center"><h1 className="text-xl font-extrabold text-emerald-900">Payment confirmed</h1><p className="mt-2 text-sm text-emerald-800">Your ticket is ready.</p><Link className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#0E1020] px-5 text-sm font-bold text-white" href={`/ticket/${encodeURIComponent(order.reference)}?access=${encodeURIComponent(access)}`}>View ticket</Link></section>;
        } else if (order.status !== "pending_payment" || (order.expiresAt && new Date(order.expiresAt).getTime() < Date.now())) {
          content = <Unavailable message="This order has expired or is no longer accepting bank transfer details. Contact the help desk before making another payment." />;
        } else if (!bank?.name?.trim() || !bank.accountName?.trim() || !bank.accountNumber?.trim()) {
          content = <Unavailable message="Bank transfer instructions are not configured for this order. Do not transfer funds; contact the help desk." />;
        } else {
          content = <ManualTransferSubmission
            reference={order.reference}
            ticketAccess={access}
            amount={formatMoneyMinor(order.totalMinor, order.currency)}
            bankName={bank.name}
            accountName={bank.accountName}
            accountNumber={bank.accountNumber}
            alreadySubmitted={false}
          />;
        }
      }
    } catch {
      content = <Unavailable message="Bank transfer instructions could not load. Retry after checking your connection." />;
    }
  }

  return <div className="flex min-h-screen flex-col bg-[#F9FAFB]"><Header /><main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-5 px-4 py-10 sm:px-6"><div className="w-full"><Link href="/register" className="text-xs font-bold text-[#0E7A6E] hover:underline">← Return to registration</Link><div className="mt-5"><h1 className="text-2xl font-black tracking-tight text-[#111320]">Bank transfer</h1><p className="mt-1 text-sm text-gray-600">Your order stays pending until the finance team confirms the transfer.</p></div></div>{content}</main><Footer /></div>;
}

function Unavailable({ message }: { message: string }) {
  return <section role="alert" className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">{message}</section>;
}
