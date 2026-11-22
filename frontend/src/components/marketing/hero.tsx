"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { CountdownClock } from "@/components/marketing/countdown-clock";
import { HeroBackground } from "@/components/marketing/hero-background";
import { HeroTitleStage } from "@/components/marketing/hero-title-stage";
import { ParallaxLayer } from "@/components/marketing/parallax-layer";
import { useLandingSettings } from "@/components/marketing/landing-settings";
import { SITE_CONFIG } from "@/config/site";

export function Hero() {
  const { theme, heroDatesLabel, startsAt, endsAt } = useLandingSettings();

  return (
    <section
      data-track="hero"
      className="relative w-full lg:min-h-[720px] flex items-center bg-[#0E1020] overflow-hidden"
    >
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

          {/* Layer 3: interactive extruded headline cards + logo marker.
              The remote glass plaque is kept as the accessible fallback inside
              HeroTitleStage; WebGL fades over it once the intro is finished. */}
          <ParallaxLayer speed={0.1} className="w-full">
<<<<<<< HEAD
            <HeroTitleStage theme={theme} logoSrc={SITE_CONFIG.logo.src} />
=======
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
                    <h1 className="relative z-[2] whitespace-nowrap text-[4.2vw] font-extrabold uppercase leading-[1.1] tracking-tight text-white [text-shadow:0_2px_18px_rgba(142,227,214,0.3)] sm:text-3xl">
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
>>>>>>> dcb5da2 (save my local changes)
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
