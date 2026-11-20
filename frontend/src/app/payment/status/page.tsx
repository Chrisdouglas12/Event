"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Phone,
  Download,
  Image as ImageIcon,
  Printer,
} from "lucide-react";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { BookletDownload } from "@/components/ticket/booklet-download";
import { SITE_CONFIG } from "@/config/site";

// Origin of the backend (no trailing slash, no /api). Unset = same origin.
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

const EVENT = {
  name: "IHGC 2026 General Conference",
  dates: "8 – 11 Dec 2026",
  venue: "Holiness Campground, Kwali, Abuja",
};

// --- TYPES ---

type Ticket = {
  id: string;
  refCode: string;
  name: string;
  status: string;
  qrToken: string;
};

type TicketBundle = {
  order: {
    reference: string;
    currency: string;
    totalMinor: number;
    isGroup: boolean;
    groupName: string | null;
  };
  participants: Ticket[];
  group: { id: string; totalSeats: number; claimedSeats: number } | null;
};

type Phase = "checking" | "pending" | "timeout" | "need_phone" | "failed" | "error" | "ready";

// --- DOWNLOAD HELPERS ---

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not create image"))), "image/png");
  });
}

const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";

// Shrinks a single line until it fits the available width.
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  size: number,
  weight = 700,
  min = 22
) {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (s > min && ctx.measureText(text).width > maxWidth) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
}

// Wraps text into centred lines with an ellipsis when it exceeds maxLines,
// so long names never encroach on the QR code or the page edges.
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  maxWidth: number,
  startY: number,
  options: { size: number; weight?: number; lineHeight: number; maxLines?: number; color: string }
) {
  const { size, weight = 700, lineHeight, maxLines = 2, color } = options;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;

  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  let index = 0;

  for (; index < words.length; index++) {
    const candidate = line ? `${line} ${words[index]}` : words[index];
    if (!line || ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = words[index];
    if (lines.length >= maxLines) break;
  }

  if (lines.length < maxLines && line) lines.push(line);

  const truncated = index < words.length - 1;
  if (truncated && lines.length > 0) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last.trimEnd()}…`;
  }

  lines.forEach((value, i) => ctx.fillText(value, centerX, startY + i * lineHeight));
  return startY + lines.length * lineHeight;
}

// Draws the full ticket (header, name, reference, QR, instructions) onto a canvas.
// The same canvas is used for the PNG download and the PDF.
async function renderTicketCanvas(ticket: Ticket, qrDataUrl: string): Promise<HTMLCanvasElement> {
  const W = 1080;
  const H = 1500;
  const SIDE_MARGIN = 70;
  const contentWidth = W - SIDE_MARGIN * 2;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Header band
  ctx.fillStyle = "#0E1020";
  ctx.fillRect(0, 0, W, 300);

  ctx.fillStyle = "#8EE3D6";
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText("PARTICIPANT PASS", W / 2, 90);

  ctx.fillStyle = "#FFFFFF";
  fitText(ctx, EVENT.name, contentWidth, 58, 800, 30);
  ctx.fillText(EVENT.name, W / 2, 170);

  ctx.fillStyle = "#C7CAD6";
  const sub = `${EVENT.dates}  •  ${EVENT.venue}`;
  fitText(ctx, sub, contentWidth, 32, 400, 22);
  ctx.fillText(sub, W / 2, 235);

  // Participant name (max two lines, never overlapping the reference block)
  drawWrappedText(ctx, ticket.name, W / 2, contentWidth, 400, {
    size: 56,
    weight: 700,
    lineHeight: 64,
    maxLines: 2,
    color: "#111320",
  });

  // Reference
  ctx.fillStyle = "#6B7280";
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText("REFERENCE", W / 2, 560);
  ctx.fillStyle = "#0E7A6E";
  fitText(ctx, ticket.refCode, contentWidth, 52, 800, 32);
  ctx.fillText(ticket.refCode, W / 2, 620);

  // QR code
  const img = new Image();
  img.src = qrDataUrl;
  await img.decode();
  const qrSize = 700;
  const qrX = (W - qrSize) / 2;
  const qrY = 680;
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 4;
  ctx.strokeRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
  ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

  // Instructions (kept inside the bottom margin)
  ctx.fillStyle = "#111320";
  fitText(ctx, "Show this QR code at the booklet desk", contentWidth, 32, 600, 22);
  ctx.fillText("Show this QR code at the booklet desk", W / 2, 1420);
  ctx.fillStyle = "#6B7280";
  fitText(ctx, "to collect your conference booklet. Do not share this code.", contentWidth, 26, 400, 18);
  ctx.fillText("to collect your conference booklet. Do not share this code.", W / 2, 1462);

  return canvas;
}

// --- SHARED UI ---

function HelpLine() {
  return (
    <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs text-gray-500">
      <Phone className="w-3.5 h-3.5 text-gray-400" />
      <span>Help desk: {SITE_CONFIG.contact.phone}</span>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md w-full bg-white rounded-[24px] border border-gray-100 p-8 shadow-sm text-center space-y-6">
      {children}
    </div>
  );
}

// --- TICKET CARD ---

function TicketCard({ ticket, bundle }: { ticket: Ticket; bundle: TicketBundle }) {
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(ticket.qrToken, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 1024,
      color: { dark: "#000000", light: "#FFFFFF" },
    })
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => {
        if (alive) setErr("Could not generate the QR code.");
      });
    return () => {
      alive = false;
    };
  }, [ticket.qrToken]);

  const fileBase = `IHGC-2026-ticket-${ticket.refCode}`;

  const downloadPng = async () => {
    if (!qr) return;
    setBusy("png");
    setErr(null);
    try {
      const canvas = await renderTicketCanvas(ticket, qr);
      downloadBlob(await canvasToBlob(canvas), `${fileBase}.png`);
    } catch {
      setErr("Could not create the image. Try Print instead.");
    } finally {
      setBusy(null);
    }
  };

  const downloadPdf = async () => {
    if (!qr) return;
    setBusy("pdf");
    setErr(null);
    try {
      const canvas = await renderTicketCanvas(ticket, qr);
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
      const w = 148;
      const h = (w * canvas.height) / canvas.width;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, h);
      pdf.save(`${fileBase}.pdf`);
    } catch {
      setErr("Could not create the PDF. Try the image download or Print.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-md w-full bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden print:shadow-none print:border-gray-300 print:break-inside-avoid">
      <div className="bg-[#0E1020] text-white px-6 py-5 text-center">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#8EE3D6]">Participant Pass</div>
        <div className="text-lg font-extrabold tracking-tight mt-1">{EVENT.name}</div>
        <div className="text-xs text-gray-300 mt-1">
          {EVENT.dates} • {EVENT.venue}
        </div>
      </div>

      <div className="p-6 sm:p-8 text-center space-y-5">
        <div>
          <div className="text-xl font-extrabold text-[#111320] break-words">{ticket.name}</div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mt-3">Reference</div>
          <div className="text-2xl font-black tracking-wider text-[#0E7A6E] font-mono">{ticket.refCode}</div>
        </div>

        <div className="mx-auto w-full max-w-[280px] aspect-square rounded-xl border border-gray-200 bg-white p-2 flex items-center justify-center">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={`QR code for ${ticket.name}`} className="w-full h-full" />
          ) : (
            <span className="text-xs text-gray-400">Generating QR code…</span>
          )}
        </div>

        <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
          Show this QR code at the booklet desk to collect your conference booklet. Turn your screen brightness up when
          scanning, and do not share this code.
        </p>

        {err && (
          <p role="alert" className="text-xs text-red-600">
            {err}
          </p>
        )}

        <div className="space-y-2 print:hidden">
          <button
            type="button"
            onClick={downloadPng}
            disabled={!qr || busy !== null}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-[#0E1020] text-white font-semibold text-xs hover:bg-[#1A1D36] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {busy === "png" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            <span>{busy === "png" ? "Preparing…" : "Save as Image"}</span>
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={!qr || busy !== null}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-[#0E1020] text-white font-semibold text-xs hover:bg-[#1A1D36] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {busy === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{busy === "pdf" ? "Preparing…" : "Download PDF"}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!qr}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-[#F3F4F6] text-[#0E1020] font-semibold text-xs hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {bundle.group && (
        <div className="px-6 pb-6 text-center text-[11px] text-gray-500">
          Group: {bundle.order.groupName || "—"} · {bundle.group.claimedSeats} of {bundle.group.totalSeats} seats
          claimed
        </div>
      )}
    </div>
  );
}

// --- STATUS CONTENT ---

function StatusContent() {
  const params = useSearchParams();
  const reference = (params.get("ref") || params.get("reference") || params.get("trxref") || "").trim();
  const access = (params.get("access") || "").trim();
  const isCancelled = params.get("cancelled") === "true" || params.get("cancelled") === "1";

  const [phase, setPhase] = useState<Phase>("checking");
  const [bundle, setBundle] = useState<TicketBundle | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState("+234 ");
  const attempts = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const check = useCallback(
    async (phone: string) => {
      attempts.current += 1;
      try {
        const res = await fetch(`${API_BASE}/api/checkout/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference, access: access || undefined, phone: phone || undefined }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not check payment status.");

        if (data.status === "paid") {
          if (data.tickets) {
            try {
              localStorage.setItem(`ihgc_tickets_${reference}`, JSON.stringify(data.tickets));
            } catch (_) {}
            setBundle(data.tickets as TicketBundle);
            setMessage(null);
            setPhase("ready");
          } else {
            setMessage(phone ? "That phone number doesn't match this registration." : null);
            setPhase("need_phone");
          }
          return;
        }

        if (data.status === "failed") {
          setMessage(data.error || "Your payment was not successful, so no ticket was issued. You can try again.");
          setPhase("failed");
          return;
        }

        // Still pending: poll for about two minutes.
        if (attempts.current < 30) {
          setPhase("pending");
          timer.current = setTimeout(() => check(phone), 4000);
        } else {
          setPhase("timeout");
        }
      } catch (e: any) {
        setMessage(e?.message || "Could not check payment status.");
        setPhase("error");
      }
    },
    [reference, access]
  );

  useEffect(() => {
    if (!reference) return;

    if (isCancelled) {
      setMessage("Payment was cancelled by the user.");
      setPhase("failed");
      return;
    }

    // A ticket already loaded on this device shows instantly (works with weak signal at the venue).
    try {
      const cached = localStorage.getItem(`ihgc_tickets_${reference}`);
      if (cached) {
        setBundle(JSON.parse(cached) as TicketBundle);
        setPhase("ready");
        return;
      }
    } catch (_) {}

    let savedPhone = "";
    try {
      const raw = localStorage.getItem("ihgc_last_checkout");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.reference === reference && typeof parsed.phone === "string") savedPhone = parsed.phone;
      }
    } catch (_) {}

    attempts.current = 0;
    setPhase("checking");
    check(savedPhone);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reference, isCancelled, check]);

  const retry = (phone: string) => {
    if (timer.current) clearTimeout(timer.current);
    attempts.current = 0;
    setMessage(null);
    setPhase("checking");
    check(phone);
  };

  // Missing reference
  if (!reference) {
    return (
      <Panel>
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#111320]">Payment Incomplete</h2>
            <p className="text-xs text-red-600 leading-relaxed">
              Payment session details are missing. If you completed payment, open the link from your confirmation
              message or contact the help desk.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#0E1020] text-white font-semibold text-xs"
            >
              Return to Registration
            </Link>
          </div>
        </div>
        <HelpLine />
      </Panel>
    );
  }

  // Ticket ready
  if (phase === "ready" && bundle) {
    return (
      <div className="w-full flex flex-col items-center gap-6">
        <div className="text-center space-y-2 print:hidden">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#111320]">You&apos;re Registered!</h2>
          <p className="text-xs text-gray-600 max-w-xs mx-auto">
            Save or print your ticket now. A saved copy works without a network connection at the venue.
          </p>
        </div>

        {bundle.participants.map((t) => (
          <TicketCard key={t.id} ticket={t} bundle={bundle} />
        ))}

        <BookletDownload />

        <div className="max-w-md w-full print:hidden">
          <HelpLine />
        </div>
      </div>
    );
  }

  return (
    <Panel>
      {(phase === "checking" || phase === "pending") && (
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#EAF9F7] text-[#0E7A6E] mx-auto flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#111320]">
              {phase === "checking" ? "Verifying Payment..." : "Waiting for Payment Confirmation..."}
            </h2>
            <p className="text-xs text-[#6B7280]">
              Connecting with payment gateway for reference{" "}
              <strong className="text-black font-mono">{reference}</strong>
            </p>
          </div>
          <div className="text-[11px] text-gray-400">
            Please do not close this window. Confirmation takes a few seconds.
          </div>
        </div>
      )}

      {phase === "timeout" && (
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
            <RefreshCw className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#111320]">Payment Pending Confirmation</h2>
            <p className="text-xs text-[#6B7280]">
              We&apos;re still waiting for your bank or gateway to confirm order{" "}
              <strong className="text-black font-mono">{reference}</strong>.
            </p>
          </div>
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => retry("")}
              className="w-full py-2.5 px-4 rounded-full bg-[#0E1020] text-white font-semibold text-xs hover:bg-[#1A1D36] transition-colors cursor-pointer"
            >
              Re-check Status Now
            </button>
            <div className="text-[11px] text-gray-500 pt-2">
              If your account was debited, do not pay twice. You can also look up your ticket later at{" "}
              <Link href="/ticket/resend" className="text-[#0E7A6E] underline font-semibold">
                Resend Ticket
              </Link>
              .
            </div>
          </div>
        </div>
      )}

      {phase === "need_phone" && (
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#111320]">Payment Received</h2>
            <p className="text-xs text-gray-600">
              Enter the phone number you registered with to view and download your ticket.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              retry(phoneInput.trim());
            }}
            className="space-y-3 text-left"
          >
            <label className="text-xs font-semibold text-[#111320]" htmlFor="ticket-phone">
              Phone number
            </label>
            <input
              id="ticket-phone"
              type="tel"
              required
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="+234 801 234 5678"
              className="w-full px-3.5 py-2.5 rounded-[6px] bg-[#F3F4F6] border border-transparent focus:border-gray-300 focus:bg-white text-sm focus:outline-none"
            />
            {message && (
              <p role="alert" className="text-xs text-red-600">
                {message}
              </p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-full bg-[#0E1020] text-white font-semibold text-xs hover:bg-[#1A1D36] transition-colors cursor-pointer"
            >
              View My Ticket
            </button>
          </form>
        </div>
      )}

      {phase === "failed" && (
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#111320]">Payment Incomplete</h2>
            <p className="text-xs text-red-600 leading-relaxed">
              {message || "The transaction could not be completed."}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#0E1020] text-white font-semibold text-xs"
            >
              Return to Registration
            </Link>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#111320]">We Couldn&apos;t Check Your Payment</h2>
            <p className="text-xs text-red-600 leading-relaxed">{message}</p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => retry("")}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#0E1020] text-white font-semibold text-xs hover:bg-[#1A1D36] transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      <HelpLine />
    </Panel>
  );
}

// --- PAGE ---

export default function PaymentStatusPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      <div className="print:hidden">
        <Header />
      </div>
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <Suspense fallback={<div className="text-sm text-gray-500">Loading payment status...</div>}>
          <StatusContent />
        </Suspense>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
