"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar } from "lucide-react";
import { CountdownClock } from "@/components/marketing/countdown-clock";
import { HeroBackground } from "@/components/marketing/hero-background";
import { ParallaxLayer } from "@/components/marketing/parallax-layer";
import { FitTwoLines } from "@/components/marketing/fit-two-lines";
import { useLandingSettings } from "@/components/marketing/landing-settings";
import { SITE_CONFIG } from "@/config/site";

/**
 * Title + theme plate ("glass plaque").
 *
 * Two translucent glass plates with chamfered corners and slanted inner edges
 * (the brand's diagonal motif). They let the globe and the background glow
 * through, so they blend into the hero instead of sitting on it like solid
 * boxes. The logo is a glowing medallion that bridges the two plates.
 *
 * --s = width of the slanted edge in fixed px, so the angle only depends on
 * the plate height. Both plates are always the same height (grid-rows-2).
 */

// Plate outlines. The border is the OUTER shape minus the INNER shape (evenodd),
// so the glass stays see-through and only a hairline edge is drawn.
const TOP_OUTER = ["14px 0", "100% 0", "calc(100% - var(--s)) 100%", "0 100%", "0 14px"];
const TOP_INNER = [
  "14.6px 1.5px",
  "calc(100% - 3px) 1.5px",
  "calc(100% - var(--s) - 0.75px) calc(100% - 1.5px)",
  "1.5px calc(100% - 1.5px)",
  "1.5px 14.6px",
];
const BOT_OUTER = ["0 0", "calc(100% - var(--s)) 0", "100% 100%", "14px 100%", "0 calc(100% - 14px)"];
const BOT_INNER = [
  "1.5px 1.5px",
  "calc(100% - var(--s) - 0.75px) 1.5px",
  "calc(100% - 3px) calc(100% - 1.5px)",
  "14.6px calc(100% - 1.5px)",
  "1.5px calc(100% - 14.6px)",
];
const shape = (outer: string[]) => `polygon(${outer.join(", ")})`;
const ring = (outer: string[], inner: string[]) =>
  `polygon(evenodd, ${outer.join(", ")}, ${inner.join(", ")})`;

const HB_CSS = `
.hb-wrap{position:relative;
  filter:drop-shadow(0 18px 40px rgba(0,0,0,.35)) drop-shadow(0 0 28px rgba(142,227,214,.10))}

/* glass */
.hb-plate{position:relative;overflow:hidden;-webkit-backdrop-filter:blur(14px) saturate(1.2);backdrop-filter:blur(14px) saturate(1.2)}
.hb-top{background:linear-gradient(120deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,.07) 55%,rgba(142,227,214,.12) 100%)}
.hb-bot{background:linear-gradient(120deg,rgba(142,227,214,.34) 0%,rgba(142,227,214,.18) 55%,rgba(79,209,192,.12) 100%)}

/* hairline edge */
.hb-border{position:absolute;inset:0;z-index:3;pointer-events:none}
.hb-border-top{background:linear-gradient(135deg,rgba(255,255,255,.8),rgba(142,227,214,.4) 45%,rgba(255,255,255,.08))}
.hb-border-bot{background:linear-gradient(135deg,rgba(142,227,214,.95),rgba(142,227,214,.4) 50%,rgba(255,255,255,.1))}

/* light that sweeps across the plates every few seconds */
.hb-sweep{position:absolute;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(100deg,transparent 38%,rgba(255,255,255,.2) 50%,transparent 62%);
  background-size:250% 100%;background-position:160% 0;animation:hb-sweep 7s ease-in-out infinite}
.hb-bot .hb-sweep{animation-delay:.9s}
@keyframes hb-sweep{0%,55%{background-position:160% 0}100%{background-position:-60% 0}}

/* pointer spotlight */
.hb-spot{position:absolute;inset:0;z-index:1;pointer-events:none;opacity:0;transition:opacity .4s ease;
  background:radial-gradient(260px circle at var(--hx,70%) var(--hy,30%),rgba(142,227,214,.24),transparent 65%)}
.hb-wrap:hover .hb-spot{opacity:1}

/* left accent bar */
.hb-bar{position:absolute;left:0;top:0;bottom:0;width:3px;z-index:2;
  background:linear-gradient(180deg,#8EE3D6,rgba(142,227,214,0))}

/* logo medallion */
.hb-medal{position:absolute;z-index:30;top:50%;transform:translateY(-50%);
  width:calc(var(--s) * 1.15);height:calc(var(--s) * 1.15);right:calc(var(--s) * -0.075)}
.hb-medal-glow{position:absolute;inset:-35%;border-radius:9999px;pointer-events:none;
  background:radial-gradient(closest-side,rgba(142,227,214,.4),transparent 70%);animation:hb-breathe 4s ease-in-out infinite}
.hb-medal-ring{position:absolute;inset:0;border-radius:9999px;
  background:conic-gradient(from 0deg,#8EE3D6,transparent 35%,#4FD1C0 60%,transparent 85%,#8EE3D6);
  -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 2px),#000 calc(100% - 2px));
  mask:radial-gradient(farthest-side,transparent calc(100% - 2px),#000 calc(100% - 2px));
  animation:hb-spin 6s linear infinite}
.hb-medal-orbit{position:absolute;inset:-5px;animation:hb-spin 9s linear infinite reverse}
.hb-medal-dot{position:absolute;left:50%;top:0;width:5px;height:5px;margin-left:-2.5px;border-radius:9999px;
  background:#8EE3D6;box-shadow:0 0 8px 2px rgba(142,227,214,.7)}
.hb-medal-core{position:absolute;inset:4px;border-radius:9999px;background:#0E1020;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.12),0 0 18px rgba(142,227,214,.35)}
@keyframes hb-spin{to{transform:rotate(360deg)}}
@keyframes hb-breathe{0%,100%{transform:scale(.92);opacity:.7}50%{transform:scale(1.08);opacity:1}}

@media (prefers-reduced-motion:reduce){
  .hb-sweep,.hb-medal-ring,.hb-medal-orbit,.hb-medal-glow{animation:none}
}
`;

export function Hero() {
  const { theme, heroDatesLabel, startsAt, endsAt } = useLandingSettings();

  // Spotlight follows the pointer over the plaque (mouse / pen only)
  const onPlaqueMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--hx", `${(e.clientX - r.left).toFixed(0)}px`);
    e.currentTarget.style.setProperty("--hy", `${(e.clientY - r.top).toFixed(0)}px`);
  };

  return (
    <section
      data-track="hero"
      className="relative w-full lg:min-h-[720px] flex items-center bg-[#0E1020] overflow-hidden"
    >
      <style dangerouslySetInnerHTML={{ __html: HB_CSS }} />

      {/* Heavenly sun/halo behind the WebGL globe (mobile only; hidden on desktop) */}
      <div aria-hidden className="hero-heaven absolute inset-0 pointer-events-none lg:hidden" />

      {/* Layer 1: Globe background (slowest / farthest) */}
      <ParallaxLayer speed={0.4} className="absolute inset-0">
        <HeroBackground desktopLift={10} />
      </ParallaxLayer>

      <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-8 pt-[350px] sm:pt-[390px] pb-14 lg:py-20 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="hidden lg:block lg:col-span-5" />

        <div data-hero-content className="lg:col-span-7 flex flex-col items-start space-y-5 sm:space-y-8 text-left w-full">
          
          {/* Layer 2: Date badge */}
          <ParallaxLayer speed={0.04}>
            <div
              className="hero-fade inline-flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wider uppercase text-gray-300 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-sm"
              style={{ animationDelay: "0.05s" }}
            >
              <Calendar className="w-3.5 h-3.5 text-[#8EE3D6]" strokeWidth={1.8} />
              <span>{heroDatesLabel}</span>
            </div>
          </ParallaxLayer>

          {/* Layer 3: glass plaque (title + theme) with the logo medallion */}
          <ParallaxLayer speed={0.1} className="w-full">
            <div
              className="hb-wrap w-full [--s:44px] sm:[--s:56px]"
              onPointerMove={onPlaqueMove}
            >
              <div className="relative grid grid-rows-2 gap-1 sm:gap-1.5">
                {/* TOP PLATE: conference name */}
                <div className="hero-fade relative" style={{ animationDelay: "0.2s" }}>
                  <div
                    className="hb-plate hb-top relative flex h-full flex-col justify-center py-4 pl-4 pr-10 sm:py-5 sm:pl-6 sm:pr-14"
                    style={{ clipPath: shape(TOP_OUTER) }}
                  >
                    <span aria-hidden className="hb-bar" />
                    <span aria-hidden className="hb-sweep" />
                    <span aria-hidden className="hb-spot" />
                    <h1 className="relative z-[2] whitespace-nowrap bg-gradient-to-r from-white to-[#CFF5EE] bg-clip-text text-[4.2vw] font-extrabold uppercase leading-[1.1] tracking-tight text-transparent sm:text-3xl">
                      INTERNATIONAL HOLINESS
                    </h1>
                    <h2 className="relative z-[2] mt-0.5 whitespace-nowrap text-[3.2vw] font-bold uppercase leading-[1.2] tracking-wide text-[#8EE3D6] sm:mt-1 sm:text-xl">
                      GENERAL CONFERENCE 2026
                    </h2>
                  </div>
                  <div
                    aria-hidden
                    className="hb-border hb-border-top"
                    style={{ clipPath: ring(TOP_OUTER, TOP_INNER) }}
                  />
                </div>

                {/* BOTTOM PLATE: theme, never more than 2 lines */}
                <div className="hero-fade relative" style={{ animationDelay: "0.5s" }}>
                  <div
                    className="hb-plate hb-bot relative flex h-full flex-col justify-center py-4 pl-4 sm:py-5 sm:pl-6"
                    style={{ clipPath: shape(BOT_OUTER) }}
                  >
                    <span aria-hidden className="hb-sweep" />
                    <span aria-hidden className="hb-spot" />
                    {/* Big faded quote mark */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute right-[calc(var(--s)+6px)] -top-3 select-none font-serif text-[88px] leading-none text-[#8EE3D6]/15 sm:text-[110px]"
                    >
                      &ldquo;
                    </span>

                    <span className="relative z-[2] inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8EE3D6] sm:text-sm">
                      <span aria-hidden className="h-px w-5 bg-[#8EE3D6]/70" />
                      THEME
                    </span>

                    {/* Right padding keeps the text clear of the slanted edge */}
                    <FitTwoLines
                      text={`\u201C${theme}\u201D`}
                      minFont={10}
                      className="relative z-[2] mt-1 pr-[calc(var(--s)+8px)] text-[13px] font-extrabold leading-snug tracking-tight text-white sm:mt-1.5 sm:text-xl md:text-2xl"
                    />
                  </div>
                  <div
                    aria-hidden
                    className="hb-border hb-border-bot"
                    style={{ clipPath: ring(BOT_OUTER, BOT_INNER) }}
                  />
                </div>

                {/* LOGO MEDALLION: sits in the notch and bridges both plates */}
                <div className="hb-medal">
                  <span aria-hidden className="hb-medal-glow" />
                  <span aria-hidden className="hb-medal-orbit">
                    <span className="hb-medal-dot" />
                  </span>
                  <span aria-hidden className="hb-medal-ring" />
                  <div className="hb-medal-core">
                    <div className="relative h-full w-full p-[3px]">
                      <div className="relative h-full w-full">
                        <Image
                          src={SITE_CONFIG.logo.src}
                          alt={SITE_CONFIG.logo.alt}
                          fill
                          priority
                          fetchPriority="high"
                          sizes="(max-width: 639px) 44px, 56px"
                          className="object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ParallaxLayer>

          {/* Layer 4: 3D logo clock + flip countdown */}
          <ParallaxLayer speed={0.16} className="w-full">
            <div className="hero-fade pt-1 pb-1" style={{ animationDelay: "0.8s" }}>
              <CountdownClock startsAt={startsAt} endsAt={endsAt} theme={theme} />
            </div>
          </ParallaxLayer>

          {/* Layer 5: Register button (closest / fastest lag) */}
          <ParallaxLayer speed={0.22}>
            <div className="hero-fade pt-1" style={{ animationDelay: "1s" }}>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/80 bg-transparent text-white font-semibold text-sm tracking-wide hover:bg-white hover:text-[#0E1020] hover:border-white transition-all duration-200 active:scale-95 shadow-sm"
              >
                Register Now
              </Link>
            </div>
          </ParallaxLayer>
        </div>
      </div>
    </section>
  );
}
