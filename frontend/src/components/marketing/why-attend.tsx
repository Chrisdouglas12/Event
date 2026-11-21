"use client";

import Link from "next/link";
import Image from "next/image";
import { Parallax } from "@/components/ui/parallax";
import { RevealText } from "@/components/ui/reveal-text";
import { TiltCard } from "@/components/ui/tilt-card";
import { useLandingSettings } from "@/components/marketing/landing-settings";

export function WhyAttend() {
  const { theme, datesText, openingTimeLabel, whyAttendIntro, venueName, venueAddress } =
    useLandingSettings();

  const points = [
    {
      title: "Conference Theme",
      description: `${theme}.`,
    },
    {
      title: "Four Conference Days",
      description: `${datesText}. The opening is at ${openingTimeLabel}.`,
    },
    {
      title: "Venue",
      description: `The conference venue is ${venueName}, ${venueAddress}.`,
    },
  ];

  return (
    <section
      data-scene="air"
      className="relative overflow-hidden py-20 lg:py-28"
      style={
        {
          "--wa-accent": "#8EE3D6",
          "--wa-accent-hover": "#7BD4C7",
          "--wa-ink": "#0E1020",
          "--wa-text": "#FFFFFF",
          "--wa-muted": "#B9C4D4",
          "--wa-subtle": "#A9B4C6",
          "--wa-line": "rgba(255,255,255,0.10)",
          "--wa-frame": "#3A404B",
        } as React.CSSProperties
      }
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        <TiltCard intensity={4} className="floating-card depth-stage rounded-[4px]">
          <div className="relative p-6 sm:p-10 lg:p-14 xl:p-16">
            {/* Ambient glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-[0.12] blur-3xl"
              style={{ background: "var(--wa-accent)" }}
            />

            {/* Main grid */}
            <div className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16 xl:gap-24">
              {/* Left: copy */}
              <div className="flex flex-col items-start lg:col-span-6">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="h-px w-8"
                    style={{ background: "var(--wa-accent)" }}
                  />
                  <RevealText
                    as="span"
                    text="Why Attend"
                    className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--wa-accent)]"
                    stagger={0.02}
                  />
                </div>

                <RevealText
                  as="h2"
                  text="Why Attend This Conference?"
                  className="mt-5 max-w-xl text-3xl font-bold leading-[1.1] tracking-tight text-[var(--wa-text)] sm:text-4xl lg:text-[44px] xl:text-5xl"
                  stagger={0.045}
                />

                <RevealText
                  as="p"
                  text={whyAttendIntro}
                  className="mt-6 max-w-xl text-base leading-relaxed text-[var(--wa-muted)] lg:text-[17px]"
                  stagger={0.012}
                />

                <div className="mt-9">
                  <Link
                    href="/register"
                    className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-[var(--wa-accent)] px-8 py-3.5 text-sm font-semibold tracking-wide text-[var(--wa-ink)] shadow-[0_8px_30px_rgba(142,227,214,0.25)] transition-all duration-200 hover:bg-[var(--wa-accent-hover)] hover:shadow-[0_10px_36px_rgba(142,227,214,0.35)] active:scale-95"
                  >
                    Register For Conference
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

              {/* Right: aligned collage */}
              <div className="depth-stage lg:col-span-6">
                <div className="relative mx-auto aspect-square w-full max-w-[540px] lg:ml-auto lg:mr-0">
                  {/* Accent frame, top-right */}
                  <div
                    aria-hidden
                    className="absolute right-0 top-0 h-[58%] w-[50%] rounded-[4px] border"
                    style={{
                      borderColor: "rgba(142,227,214,0.35)",
                      transform: "translate(14px, -14px) translateZ(-30px)",
                    }}
                  />
                  {/* Neutral frame, bottom-left */}
                  <div
                    aria-hidden
                    className="absolute bottom-0 left-0 h-[40%] w-[44%] rounded-[4px] border-2"
                    style={{
                      borderColor: "var(--wa-frame)",
                      transform: "translate(-14px, 14px) translateZ(-30px)",
                    }}
                  />

                  {/* Flyer */}
                  <TiltCard
                    intensity={7}
                    className="depth-card-left absolute left-0 top-0 z-10 aspect-[4/5] w-[62%] overflow-hidden rounded-[4px] bg-[var(--wa-ink)] shadow-xl ring-1 ring-white/10"
                  >
                    <Parallax speed={0.18} className="absolute inset-0">
                      <Image
                        src="/images/conference_flyer.png"
                        alt="Official flyer for the International Holiness General Conference 2026"
                        fill
                        priority
                        className="object-contain"
                        quality={95}
                        sizes="(max-width: 1024px) 70vw, 340px"
                      />
                    </Parallax>
                  </TiltCard>

                  {/* Crowd */}
                  <TiltCard
                    intensity={9}
                    className="depth-card-right clip-chamfer-tr absolute bottom-0 right-0 z-20 aspect-[3/4] w-[54%] overflow-hidden rounded-[4px] bg-[var(--wa-ink)] shadow-2xl ring-1 ring-white/10"
                  >
                    <Parallax speed={0.28} className="absolute inset-0">
                      <Image
                        src="/images/crowd-bw_2.jpg"
                        alt="Worshippers gathered for a conference service"
                        fill
                        priority
                        quality={95}
                        className="object-cover"
                        sizes="(max-width: 1024px) 60vw, 300px"
                      />
                    </Parallax>
                  </TiltCard>
                </div>
              </div>
            </div>

            {/* Points row */}
            <div
              className="relative mt-14 grid grid-cols-1 border-t md:grid-cols-3 lg:mt-20"
              style={{ borderColor: "var(--wa-line)" }}
            >
              {points.map((pt, idx) => (
                <div
                  key={pt.title}
                  className="flex gap-5 border-b py-7 md:border-b-0 md:px-8 md:py-10 md:first:pl-0 md:last:pr-0 md:[&:not(:first-child)]:border-l"
                  style={{ borderColor: "var(--wa-line)" }}
                >
                  <span
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums text-[var(--wa-accent)]"
                    style={{
                      borderColor: "rgba(142,227,214,0.3)",
                      background: "rgba(142,227,214,0.08)",
                    }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <RevealText
                      as="h3"
                      text={pt.title}
                      className="text-base font-semibold text-[var(--wa-text)] lg:text-lg"
                      delay={idx * 0.08}
                      stagger={0.03}
                    />
                    <RevealText
                      as="p"
                      text={pt.description}
                      className="mt-1.5 text-sm leading-relaxed text-[var(--wa-subtle)]"
                      delay={idx * 0.08 + 0.08}
                      stagger={0.01}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TiltCard>
      </div>
    </section>
  );
}
