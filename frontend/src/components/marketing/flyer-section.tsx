"use client";

import Image from "next/image";
import Link from "next/link";
import { RevealText } from "@/components/ui/reveal-text";
import { Parallax } from "@/components/ui/parallax";
import { useLandingSettings } from "@/components/marketing/landing-settings";

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 4v11" />
      <path d="M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

export function FlyerSection() {
  const { eventName, flyerDescription } = useLandingSettings();

  return (
    <section data-scene="arrival" className="relative overflow-hidden py-16 lg:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="floating-card relative overflow-hidden rounded-[4px] ring-1 ring-white/10">
          {/* Ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#8EE3D6] opacity-[0.10] blur-3xl"
          />

          <div className="relative grid grid-cols-1 items-stretch lg:grid-cols-12">
            {/* Left: flyer stage */}
            <div className="relative flex items-center justify-center bg-[#0E1020]/60 p-8 sm:p-12 lg:col-span-5 lg:border-r lg:border-white/10 lg:p-14">
              <div className="relative w-full max-w-[380px]">
                {/* Accent frame, top-right */}
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-[4px] border"
                  style={{
                    borderColor: "rgba(142,227,214,0.35)",
                    transform: "translate(14px, -14px)",
                  }}
                />
                {/* Graphite frame, bottom-left */}
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-[4px] border-2 border-[#3A404B]"
                  style={{ transform: "translate(-14px, 14px)" }}
                />

                <Parallax
                  speed={0.15}
                  className="relative z-10 aspect-[3/4] w-full overflow-hidden rounded-[4px] bg-[#0E1020] shadow-2xl ring-1 ring-white/10"
                >
                  <Image
                    src="/images/conference_flyer.png"
                    alt={`Official flyer for ${eventName}`}
                    fill
                    className="object-contain"
                    quality={95}
                    sizes="(max-width: 1024px) 80vw, 380px"
                  />
                </Parallax>
              </div>
            </div>

            {/* Right: copy */}
            <div className="flex flex-col items-start justify-center p-8 sm:p-12 lg:col-span-7 lg:p-16 xl:p-20">
              <div className="flex items-center gap-3">
                <span aria-hidden className="h-px w-8 bg-[#8EE3D6]" />
                <RevealText
                  as="span"
                  text="Official Flyer"
                  className="text-xs font-bold uppercase tracking-[0.2em] text-[#8EE3D6]"
                  stagger={0.02}
                />
              </div>

              <RevealText
                as="h2"
                text="Spread the Word — Share the Flyer"
                className="mt-5 max-w-xl text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-[40px] xl:text-5xl"
                stagger={0.03}
              />

              <RevealText
                as="p"
                text={flyerDescription}
                className="mt-6 max-w-xl text-sm leading-relaxed text-[#B9C4D4] lg:text-base lg:leading-7"
                stagger={0.01}
              />

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <a
                  href="/images/conference_flyer.png"
                  download="IHGC-2026-Flyer.png"
                  className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-[#8EE3D6] px-8 py-3.5 text-sm font-semibold tracking-wide text-[#0E1020] shadow-[0_8px_30px_rgba(142,227,214,0.25)] transition-all duration-200 hover:bg-[#7BD4C7] hover:shadow-[0_10px_36px_rgba(142,227,214,0.35)] active:scale-95"
                >
                  <DownloadIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5" />
                  Download Flyer
                </a>

                <Link
                  href="/conference"
                  className="group inline-flex items-center justify-center gap-2.5 rounded-full border border-[#8EE3D6]/50 px-8 py-3.5 text-sm font-semibold tracking-wide text-[#8EE3D6] transition-all duration-200 hover:bg-[#8EE3D6] hover:text-[#0E1020] active:scale-95"
                >
                  Conference Details
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M5 12h14" />
                    <path d="M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}