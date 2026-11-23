import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Footer } from "@/components/marketing/footer";
import { Header } from "@/components/marketing/header";
import { TicketLookup } from "@/components/marketing/ticket-lookup";
import { SITE_CONFIG } from "@/config/site";

/**
 * Shared ticket-desk page body. Next.js and the SPA both render this so the
 * standalone lookup stays identical in either deployment.
 */
export function FindMyTicketsPage() {
  return (
    <main className="landing-navy min-h-screen flex flex-col">
      <Header />

      <section className="ms-root relative isolate overflow-hidden border-b border-white/10 px-5 py-12 sm:px-8 sm:py-16">
        <div aria-hidden className="ms-bg">
          <span className="ms-stars" />
          <span className="ms-orbit ms-orbit-a" />
          <span className="ms-orbit ms-orbit-b" />
          <span className="ms-glow" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#8EE3D6]/30 bg-[#0E1020]/60 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8EE3D6]">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
            Ticket desk
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Your QR codes,
            <br />
            <span className="text-[#8EE3D6]">one easy lookup.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#B9C4D4] sm:text-base">
            Enter the phone number you registered with to retrieve individual
            tickets and group passes for {SITE_CONFIG.eventTitle}.
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:border-[#8EE3D6]/60 hover:bg-white/5"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
            Back to the landing page
          </Link>
        </div>
      </section>

      <div className="relative z-10 flex-1 bg-[#07101e]/55">
        <TicketLookup />
      </div>

      <Footer />
    </main>
  );
}
