"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { downloadTicketPdf, qrDataUrl, Ticket } from "@/lib/tickets/ticket-pdf";

/** Full ticket PDF button for pages that only render a QR/HTML ticket. */
export function TicketPdfButton({ ticket }: { ticket: Ticket }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const download = async () => {
    setBusy(true);
    setErr(null);
    try {
      const qr = await qrDataUrl(ticket.qrToken);
      await downloadTicketPdf(ticket, qr);
    } catch {
      setErr("Could not create the PDF. Try Print instead.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0E1020] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#1A1D36] disabled:opacity-50 print:hidden"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        <span>{busy ? "Preparing PDF…" : "Download Ticket PDF"}</span>
      </button>
      {err && (
        <p role="alert" className="text-center text-[11px] text-red-600">
          {err}
        </p>
      )}
    </div>
  );
}
