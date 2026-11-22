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
            <HeroTitleStage theme={theme} logoSrc={SITE_CONFIG.logo.src} />
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
