"use client";

import { Calendar } from "lucide-react";
import { CountdownClock } from "@/components/marketing/countdown-clock";
import { HeroBackground } from "@/components/marketing/hero-background";
import { ParallaxLayer } from "@/components/marketing/parallax-layer";
import { FitTwoLines } from "@/components/marketing/fit-two-lines";
import { useLandingSettings } from "@/components/marketing/landing-settings";

/**
 * Title + theme plates.
 *
 * Two dark, solid boxes that keep the copy readable over the globe. Each has
 * one cut corner and a single light travelling around the hairline edge. Both
 * plates stay the same height (grid-rows-2).
 */

// Plate outlines: full-width boxes with one cut corner each. The border is
// OUTER minus INNER (evenodd), so only a hairline edge is drawn.
const TOP_OUTER = ["14px 0", "100% 0", "100% 100%", "0 100%", "0 14px"];
const TOP_INNER = [
  "14.6px 1.5px",
  "calc(100% - 1.5px) 1.5px",
  "calc(100% - 1.5px) calc(100% - 1.5px)",
  "1.5px calc(100% - 1.5px)",
  "1.5px 14.6px",
];
const BOT_OUTER = ["0 0", "100% 0", "100% calc(100% - 14px)", "calc(100% - 14px) 100%", "0 100%"];
const BOT_INNER = [
  "1.5px 1.5px",
  "calc(100% - 1.5px) 1.5px",
  "calc(100% - 1.5px) calc(100% - 14.6px)",
  "calc(100% - 14.6px) calc(100% - 1.5px)",
  "1.5px calc(100% - 1.5px)",
];
const shape = (outer: string[]) => `polygon(${outer.join(", ")})`;
const ring = (outer: string[], inner: string[]) =>
  `polygon(evenodd, ${outer.join(", ")}, ${inner.join(", ")})`;

const HB_CSS = `
/* Dark, solid plates keep the title readable over the globe. */
.hb-wrap{position:relative}
.hb-plate{position:relative;overflow:hidden;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.hb-top{background:rgba(8,13,26,.78)}
.hb-bot{background:rgba(7,24,29,.82)}

/* Hairline edge with one light travelling around it. */
.hb-border{position:absolute;inset:0;z-index:3;pointer-events:none;overflow:hidden;
  background:linear-gradient(135deg,rgba(255,255,255,.45),rgba(142,227,214,.22) 45%,rgba(255,255,255,.1))}
.hb-border::before{content:"";position:absolute;left:-50%;top:-50%;width:200%;height:200%;
  background:conic-gradient(from 0deg,transparent 0 70%,rgba(142,227,214,.2) 78%,rgba(255,255,255,.95) 83%,rgba(142,227,214,.2) 88%,transparent 95%);
  animation:hb-edge 6s linear infinite}
.hb-border-bot::before{animation-delay:-3s}
@keyframes hb-edge{to{transform:rotate(360deg)}}

/* left accent bar */
.hb-bar{position:absolute;left:0;top:0;bottom:0;width:3px;z-index:2;
  background:linear-gradient(180deg,#8EE3D6,rgba(142,227,214,0))}

/* thin seam separating the boxes from the countdown */
.hb-seam{height:1px;width:100%;
  background:linear-gradient(90deg,transparent,rgba(142,227,214,.5) 12%,rgba(255,255,255,.55) 50%,rgba(142,227,214,.5) 88%,transparent)}

@media (prefers-reduced-motion:reduce){
  .hb-border::before{animation:none}
}
`;

export function Hero() {
  const { theme, heroDatesLabel, startsAt, endsAt } = useLandingSettings();

  return (
    <section
      data-track="hero"
      className="relative w-full lg:min-h-[640px] flex items-center bg-[#0E1020] overflow-hidden"
    >
      <style dangerouslySetInnerHTML={{ __html: HB_CSS }} />

      {/* Heavenly sun/halo behind the WebGL globe (mobile only; hidden on desktop) */}
      <div aria-hidden className="hero-heaven absolute inset-0 pointer-events-none lg:hidden" />

      {/* Layer 1: Globe background (slowest / farthest) */}
      <ParallaxLayer speed={0.4} className="absolute inset-0">
        <HeroBackground desktopLift={10} />
      </ParallaxLayer>

      <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-8 pt-[350px] sm:pt-[390px] pb-14 lg:py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
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

          {/* Layer 3: title + theme plates */}
          <ParallaxLayer speed={0.1} className="w-full">
            <div className="hb-wrap -mx-[6px] w-[calc(100%+12px)] sm:mx-0 sm:w-full">
              <div className="relative grid grid-rows-2 gap-1 sm:gap-1.5">
                {/* TOP PLATE: conference name */}
                <div className="hero-fade relative" style={{ animationDelay: "0.2s" }}>
                  <div
                    className="hb-plate hb-top relative flex h-full flex-col justify-center py-4 pl-4 pr-4 sm:py-5 sm:pl-6 sm:pr-6"
                    style={{ clipPath: shape(TOP_OUTER) }}
                  >
                    <span aria-hidden className="hb-bar" />
                    <h1 className="relative z-[2] whitespace-nowrap text-[4.2vw] font-extrabold uppercase leading-[1.1] tracking-tight text-white sm:text-3xl">
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

                {/* BOTTOM PLATE: theme, always one line */}
                <div className="hero-fade relative" style={{ animationDelay: "0.5s" }}>
                  <div
                    className="hb-plate hb-bot relative flex h-full flex-col justify-center py-4 pl-4 sm:py-5 sm:pl-6"
                    style={{ clipPath: shape(BOT_OUTER) }}
                  >
                    {/* Big faded quote mark */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute right-4 -top-3 select-none font-serif text-[88px] leading-none text-[#8EE3D6]/15 sm:right-6 sm:text-[110px]"
                    >
                      &ldquo;
                    </span>

                    <span className="relative z-[2] inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8EE3D6] sm:text-sm">
                      <span aria-hidden className="h-px w-5 bg-[#8EE3D6]/70" />
                      THEME
                    </span>

                    {/* Always one line; the component shrinks the type to fit */}
                    <FitTwoLines
                      text={theme.toUpperCase()}
                      minFont={7}
                      lines={1}
                      className="relative z-[2] mt-1 whitespace-nowrap pr-4 text-[9px] font-extrabold leading-snug tracking-tight text-white sm:mt-1.5 sm:pr-6 sm:text-xl md:text-2xl"
                    />
                  </div>
                  <div
                    aria-hidden
                    className="hb-border hb-border-bot"
                    style={{ clipPath: ring(BOT_OUTER, BOT_INNER) }}
                  />
                </div>
              </div>

              {/* Thin cut: ties the countdown to the boxes/Why Attend flow */}
              <div aria-hidden className="hb-seam mt-3 sm:mt-4" />
            </div>
          </ParallaxLayer>

          {/* Layer 4: 3D logo clock + flip countdown */}
          <ParallaxLayer speed={0.16} className="w-full">
            <div className="hero-fade pt-1 pb-0 sm:pt-2" style={{ animationDelay: "0.8s" }}>
              <CountdownClock startsAt={startsAt} endsAt={endsAt} theme={theme} />
            </div>
          </ParallaxLayer>
        </div>
      </div>
    </section>
  );
}
