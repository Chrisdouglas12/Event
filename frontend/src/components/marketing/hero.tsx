import Link from "next/link";
import { Calendar } from "lucide-react";
import { Countdown } from "@/components/ui/countdown";
import { HeroBackground } from "@/components/marketing/hero-background";
import { AnimatedHeading } from "@/components/marketing/animated-heading";
import { MarqueeHeading } from "@/components/marketing/marquee-heading";
import { SITE_CONFIG } from "@/config/site";

const TITLE = "International Holiness General Conference 2026";

export function Hero() {
  return (
    <section className="relative w-full lg:min-h-[720px] flex items-center bg-[#0E1020] overflow-hidden">
      <HeroBackground />

      {/* MOBILE: Globe na 0-340px. Text must start AFTER 340px, so no overlap.
          Before: pt-[330px] - text dey enter globe space.
          Now: pt-[350px] - text dey below globe. */}
      <div className="relative z-10 max-w-[1240px] mx-auto px-6 sm:px-8 pt-[350px] sm:pt-[390px] pb-14 lg:py-20 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="hidden lg:block lg:col-span-5" />

        <div className="lg:col-span-7 flex flex-col items-start space-y-5 sm:space-y-8 text-left">
          {/* Date badge */}
          <div
            className="hero-fade inline-flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wider uppercase text-gray-300 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-sm"
            style={{ animationDelay: "0.05s" }}
          >
            <Calendar className="w-3.5 h-3.5 text-[#8EE3D6]" strokeWidth={1.8} />
            <span>December 8 – 11, 2026</span>
          </div>

          {/* Mobile: One continuous marquee */}
          <MarqueeHeading
            line1="INTERNATIONAL HOLINESS"
            line2="GENERAL CONFERENCE 2026"
          />

          {/* Desktop: word-by-word heading */}
          <AnimatedHeading
            text={TITLE}
            highlight="2026"
            className="hidden lg:block text-[54px] font-extrabold text-white leading-[1.08] tracking-[-0.03em] max-w-2xl"
          />

          <p
            className="hero-fade text-base sm:text-lg text-gray-300 font-medium max-w-xl"
            style={{ animationDelay: "0.6s" }}
          >
            Theme: <span className="text-[#8EE3D6] font-semibold">&ldquo;{SITE_CONFIG.theme}&rdquo;</span>
          </p>

          <div className="hero-fade pt-1 pb-1" style={{ animationDelay: "0.8s" }}>
            <Countdown />
          </div>

          <div className="hero-fade pt-1" style={{ animationDelay: "1s" }}>
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/80 bg-transparent text-white font-semibold text-sm tracking-wide hover:bg-white hover:text-[#0E1020] hover:border-white transition-all duration-200 active:scale-95 shadow-sm"
            >
              Register Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}