"use client";

import { Calendar } from "lucide-react";
import { CountdownClock } from "@/components/marketing/countdown-clock";
import { HeroBackground } from "@/components/marketing/hero-background";
import { ParallaxLayer } from "@/components/marketing/parallax-layer";
import { FitTwoLines } from "@/components/marketing/fit-two-lines";
import { useLandingSettings } from "@/components/marketing/landing-settings";

const TOP_OUTER = ["14px 0", "calc(100% - 14px) 0", "100% 14px", "100% 100%", "0 100%", "0 14px"];
const TOP_INNER = [
  "14.6px 1.5px",
  "calc(100% - 14.6px) 1.5px",
  "calc(100% - 1.5px) 14.6px",
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
/* NO WHITE ANYWHERE - solid dark plates, teal hairline only */
.hb-wrap{position:relative}
.hb-plate{position:relative;overflow:hidden}
.hb-top{background:#0E1020}
.hb-bot{background:#07181D}
.hb-border{position:absolute;inset:0;z-index:3;pointer-events:none;overflow:hidden;background:rgba(142,227,214,.28)}
.hb-border::before{display:none}
.hb-border-bot::before{display:none}
.hb-bar{position:absolute;left:0;top:0;bottom:0;width:3px;z-index:2;background:linear-gradient(180deg,#8EE3D6,rgba(142,227,214,0))}
.hb-seam{height:1px;width:100%;background:linear-gradient(90deg,transparent,rgba(142,227,214,.5) 12%,rgba(142,227,214,.5) 88%,transparent)}
.hb-top-cut{height:3px;width:100%;position:relative;background:linear-gradient(90deg,transparent,rgba(142,227,214,.6) 12%,rgba(142,227,214,.6) 88%,transparent);clip-path:polygon(14px 0, calc(100% - 14px) 0, 100% 100%, 0 100%)}
`;

const stripManAndSatan = (theme: string) =>
  theme.replace(/man\s+and\s+satan/i, "").replace(/\s+/g, " ").trim().toUpperCase() ||
  "IN CONTENTION AGAINST THE HOLY GOD";

export function Hero() {
  const { theme, heroDatesLabel, startsAt, endsAt } = useLandingSettings();
  const themeShort = stripManAndSatan(theme);

  return (
    <section
      data-track="hero"
      className="relative w-full lg:min-h-[640px] flex items-center bg-[#0E1020] overflow-hidden"
    >
      <style dangerouslySetInnerHTML={{ __html: HB_CSS }} />

      {/* REMOVED: hero-heaven white glow */}

      <ParallaxLayer speed={0.4} className="absolute inset-0">
        <HeroBackground desktopLift={10} />
      </ParallaxLayer>

      <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-8 pt-[350px] sm:pt-[390px] pb-14 lg:py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="hidden lg:block lg:col-span-5" />

        <div data-hero-content className="lg:col-span-7 flex flex-col items-start space-y-5 sm:space-y-8 text-left w-full">
          <ParallaxLayer speed={0.04}>
            <div
              className="hero-fade inline-flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wider uppercase text-gray-300 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-sm"
              style={{ animationDelay: "0.05s" }}
            >
              <Calendar className="w-3.5 h-3.5 text-[#8EE3D6]" strokeWidth={1.8} />
              <span>{heroDatesLabel}</span>
            </div>
          </ParallaxLayer>

          <ParallaxLayer speed={0.1} className="w-full">
            <div className="hb-wrap -mx-[6px] w-[calc(100%+12px)] sm:mx-0 sm:w-full">
              <div aria-hidden className="hb-top-cut mb-1.5 sm:mb-2" />

              <div className="relative grid grid-rows-2 gap-1 sm:gap-1.5">
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

                {/* THEME BOX */}
                <div className="hero-fade relative" style={{ animationDelay: "0.5s" }}>
                  <div
                    className="hb-plate hb-bot relative flex h-full flex-col justify-center py-4 pl-4 sm:py-5 sm:pl-6"
                    style={{ clipPath: shape(BOT_OUTER) }}
                    data-theme-box
                  >
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

                    {/* MOBILE ONLY: wrapped, so e no leak to desktop */}
                    <span className="relative z-[2] mt-1.5 block pr-4 text-[14px] font-extrabold uppercase leading-[1.25] tracking-tight text-white sm:hidden">
                     MAN AND SATAN IN CONTENTION
                      <br />
                      AGAINST THE HOLY GOD
                    </span>

                    {/* DESKTOP ONLY: 👇 FIX - wrapper div dey hide am for mobile.
                        Before, hidden sm:block dey inside FitTwoLines className,
                        FitTwoLines no dey forward am, so desktop text dey show for mobile. */}
                    <div aria-hidden className="relative z-[2] mt-1 hidden sm:block sm:mt-1.5 sm:pr-6">
                      <FitTwoLines
                        text={themeShort}
                        minFont={7}
                        lines={1}
                        className="whitespace-nowrap pr-4 text-[9px] font-extrabold leading-snug tracking-tight text-white sm:text-xl md:text-2xl"
                      />
                    </div>
                  </div>
                  <div
                    aria-hidden
                    className="hb-border hb-border-bot"
                    style={{ clipPath: ring(BOT_OUTER, BOT_INNER) }}
                  />
                </div>
              </div>

              <div aria-hidden className="hb-seam mt-3 sm:mt-4" />
            </div>
          </ParallaxLayer>

          <ParallaxLayer speed={0.16} className="w-full">
            <div className="hero-fade pt-1 pb-0 sm:pt-2" style={{ animationDelay: "0.8s" }}>
              {/* No dup: countdown no go print theme again */}
              <CountdownClock startsAt={startsAt} endsAt={endsAt} theme="" />
            </div>
          </ParallaxLayer>
        </div>
      </div>
    </section>
  );
}