"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Download,
  Loader2,
  QrCode,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { RevealText } from "@/components/ui/reveal-text";
import {
  downloadGroupPdf,
  downloadTicketPdf,
  qrDataUrl,
  type GroupTicket,
  type Ticket,
  type TicketBundle,
  type TicketOrder,
} from "@/lib/tickets/ticket-pdf";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

type LookupTicket = {
  id: string;
  kind: "individual" | "group";
  name: string;
  reference: string;
  identifier: string;
  note: string;
  qrToken: string;
  bundle: TicketBundle;
};

function TicketResult({ entry }: { entry: LookupTicket }) {
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    qrDataUrl(entry.qrToken)
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => {
        if (alive) setError("Could not render this QR code.");
      });
    return () => {
      alive = false;
    };
  }, [entry.qrToken]);

  const downloadPdf = async () => {
    if (!qr) return;
    setBusy(true);
    setError(null);
    try {
      if (entry.kind === "group" && entry.bundle.group) {
        const group: GroupTicket = entry.bundle.group;
        const order: TicketOrder = entry.bundle.order;
        await downloadGroupPdf(group, order, qr);
        return;
      }

      const ticket: Ticket | undefined =
        entry.bundle.participants.find((participant) => participant.id === entry.id) ||
        entry.bundle.participants[0];
      if (!ticket) throw new Error("Missing ticket details");
      await downloadTicketPdf(ticket, qr);
    } catch {
      setError("Could not create the PDF. Try downloading the QR image instead.");
    } finally {
      setBusy(false);
    }
  };

  const isGroup = entry.kind === "group";
  const filename = isGroup
    ? `IHGC-2026-group-ticket-${entry.reference}.png`
    : `IHGC-2026-ticket-${entry.identifier}.png`;

  return (
    <article className="flex flex-col gap-4 border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="mx-auto flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 sm:mx-0">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt={`QR code for ${entry.name}`} className="h-full w-full" />
        ) : (
          <QrCode className="h-7 w-7 animate-pulse text-gray-300" aria-hidden />
        )}
      </div>

      <div className="min-w-0 flex-1 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
              isGroup ? "bg-[#EAF9F7] text-[#0E7A6E]" : "bg-[#EEF2FF] text-[#3730A3]"
            }`}
          >
            {isGroup ? <Users className="h-3 w-3" /> : <UserRound className="h-3 w-3" />}
            {isGroup ? "Group" : "Individual"}
          </span>
          <span className="font-mono text-[11px] font-semibold text-gray-500">{entry.reference}</span>
        </div>

        <h3 className="mt-2 truncate text-sm font-extrabold text-[#111320] sm:text-base">
          {entry.name}
        </h3>
        <p className="mt-0.5 text-xs text-gray-500">
          <span className="font-semibold text-[#0E7A6E]">{entry.identifier}</span> · {entry.note}
        </p>

        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
          {qr && (
            <a
              href={qr}
              download={filename}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-2 text-[11px] font-semibold text-[#0E1020] transition-colors hover:border-[#0E7A6E] hover:bg-[#F5FBFA]"
            >
              <Download className="h-3.5 w-3.5" />
              Download QR
            </a>
          )}
          <button
            type="button"
            onClick={downloadPdf}
            disabled={!qr || busy}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#0E1020] px-3.5 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-[#1A1D36] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {busy ? "Preparing…" : "Download Ticket PDF"}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-2 text-[11px] text-red-600">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}

/** Ticket-desk widget: list every paid QR tied to a phone number. */
export function TicketLookup() {
  const [phone, setPhone] = useState("+234 ");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LookupTicket[] | null>(null);
  const [searchedPhone, setSearchedPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);
    setSearchedPhone(phone.trim());

    try {
      const response = await fetch(`${API_BASE}/api/tickets/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not look up tickets right now.");
      setResults(Array.isArray(data.tickets) ? data.tickets : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not look up tickets right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section data-scene="sea" data-enter className="cv-auto relative overflow-hidden py-12 lg:py-16">
      <div className="px-[3px] sm:px-8 lg:px-8 xl:px-10">
        <div className="landing-card mx-auto max-w-3xl px-6 py-8 sm:px-10 sm:py-10">
          <div className="text-center">
            <span aria-hidden className="mx-auto mb-5 block h-px w-12 bg-[#0E7A6E]" />
            <RevealText
              as="h2"
              text="Find My Tickets"
              className="text-3xl font-bold leading-[1.1] tracking-tight text-[#0E1020] sm:text-4xl lg:text-[40px]"
              speed={14}
            />
            <RevealText
              as="p"
              text="Enter the phone number you registered with to download every QR code tied to it — individual tickets and group passes alike."
              className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#4B5563] lg:text-base"
              speed={9}
            />
          </div>

          <form onSubmit={submit} className="mt-7 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+234 801 234 5678"
                aria-label="Registered phone number"
                className="w-full rounded-full border border-gray-200 bg-[#F9FAFB] py-3 pl-10 pr-4 text-sm text-[#111320] outline-none transition-colors placeholder:text-gray-400 focus:border-[#1FA396] focus:bg-white focus:ring-2 focus:ring-[#8EE3D6]/40"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0E1020] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1A1D36] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
              {loading ? "Searching…" : "Find My QR Codes"}
            </button>
          </form>

          {error && (
            <p role="alert" className="mt-4 flex items-center justify-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          {results !== null && (
            <div className="mt-7">
              <p className="text-center text-xs font-semibold text-gray-500">
                {results.length > 0
                  ? `${results.length} QR code${results.length === 1 ? "" : "s"} found for ${searchedPhone}`
                  : `No paid tickets found for ${searchedPhone}.`}
              </p>
              {results.length > 0 && (
                <div className="mt-4 space-y-3">
                  {results.map((entry) => (
                    <TicketResult key={`${entry.kind}-${entry.id}`} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
