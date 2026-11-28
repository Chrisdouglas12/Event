"use client";

import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Sparkles } from "lucide-react";
import type { InlineStyle } from "@/components/marketing/inline-style";
import { useLandingSettings } from "@/components/marketing/landing-settings";
import { getLandingPerformance } from "@/lib/landing-performance";

/**
 * "Why Attend" section on the joined landing canvas.
 *
 * The header, intro and CTA share one left rail; the three point rows sit in a
 * matching panel on the right. Both columns use the same container padding and
 * start at the same top edge on desktop and mobile, with the ghost numerals
 * hidden on small screens so the copy never gets squeezed.
 *
 * A progress rail fills the point panel as you scroll, and each row lights up
 * when it reaches the middle of the screen or when you hover / touch it.
 */

const WA_CSS = `
.wa-root{
  --p:0;--px:0;--py:0;--mx:72%;--my:26%;
  --wa-slant:28px;
  margin-top:-2.5rem;
  padding-top:calc(var(--wa-slant) + 3rem);
  clip-path:polygon(0 var(--wa-slant),100% 0,100% 100%,0 100%);
}
@media (min-width:640px){.wa-root{margin-top:-3.25rem}}
@media (min-width:1024px){.wa-root{--wa-slant:56px;margin-top:0;padding-top:calc(var(--wa-slant) + 1.5rem)}}

/* The joined landing canvas is flat; ambient layers stay hidden inside it. */
.wa-bg{position:absolute;inset:0;z-index:-1;overflow:hidden;background:transparent}
.wa-dots,.wa-spot,.wa-blob{display:none}

.wa-js .wa-reveal{opacity:0;transform:translate3d(0,24px,0);
  transition:opacity .7s ease,transform .8s cubic-bezier(.2,.8,.2,1);transition-delay:var(--d,0ms)}
.wa-js .wa-reveal.wa-in{opacity:1;transform:none}

.wa-cta{position:relative;overflow:hidden;
  transform:translate3d(var(--tx,0px),var(--ty,0px),0);
  transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s ease}
.wa-cta::after{content:"";position:absolute;inset:0;transform:translateX(-120%) skewX(-20deg);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);transition:transform .7s ease}
.wa-cta:hover::after{transform:translateX(120%) skewX(-20deg)}

.wa-rail-fill{transform:scaleX(var(--rail,0));transition:transform .15s linear}
.wa-point{
  position:relative;
  overflow:hidden;
  display:grid;
  grid-template-columns:40px minmax(0,1fr);
  column-gap:10px;
  align-items:start;
  padding:16px;
}
.wa-point::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .35s ease;
  background:radial-gradient(340px circle at var(--cx,50%) var(--cy,30%),rgba(14,122,110,.08),transparent 62%)}
.wa-point:hover::before,.wa-point[data-on="true"]::before{opacity:1}
.wa-point > *{position:relative;z-index:1}
.wa-ghost{
  display:none;
  justify-self:end;
  align-self:center;
  user-select:none;
  font-size:clamp(40px,5vw,64px);
  font-weight:900;
  line-height:.9;
  letter-spacing:-0.06em;
  color:transparent;
  -webkit-text-stroke:1px rgba(14,122,110,.12);
  transform:translateY(calc((var(--rail,0) - .5) * -12px));
  transition:-webkit-text-stroke-color .35s ease;
}
.wa-point:hover .wa-ghost,.wa-point[data-on="true"] .wa-ghost{-webkit-text-stroke-color:rgba(14,122,110,.38)}
.wa-icon{display:flex;height:36px;width:36px;flex:none;align-items:center;justify-content:center;border-radius:9999px;
  border:1px solid rgba(14,122,110,.18);background:rgba(14,122,110,.06);color:#0E7A6E;
  transition:transform .4s cubic-bezier(.2,.8,.2,1),background .3s ease}
.wa-point:hover .wa-icon{transform:rotate(-8deg) scale(1.1);background:rgba(14,122,110,.12)}
.wa-point[data-on="true"] .wa-icon{animation:wa-pulse 2.4s ease-out infinite}
@keyframes wa-pulse{0%{box-shadow:0 0 0 0 rgba(14,122,110,.28)}70%,100%{box-shadow:0 0 0 14px rgba(14,122,110,0)}}
.wa-underline{display:block;height:2px;width:28px;margin-top:14px;border-radius:2px;background:#0E7A6E;
  transition:width .5s cubic-bezier(.2,.8,.2,1)}
.wa-point:hover .wa-underline,.wa-point[data-on="true"] .wa-underline{width:72px}
@media (min-width:640px){
  .wa-point{grid-template-columns:44px minmax(0,1fr) 64px;column-gap:18px;padding:24px 26px}
  .wa-icon{height:44px;width:44px}
  .wa-ghost{display:block}
}
@media (min-width:1024px){
  .wa-point{align-items:center;padding-block:28px}
}

@media (prefers-reduced-motion:reduce){
  .wa-point .wa-icon{animation:none!important}
  .wa-js .wa-reveal{opacity:1;transform:none;transition:none}
}
`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function WhyAttend() {
  const { theme, datesText, openingTimeLabel, whyAttendIntro, venueName, venueAddress } =
    useLandingSettings();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;

    const perf = getLandingPerformance();
    const reveals = Array.from(root.querySelectorAll<HTMLElement>("[data-wa-reveal]"));

    root.classList.add("wa-js");

    // Static tier: show everything, skip all the effects and listeners.
    if (!perf.ambientMotion) {
      reveals.forEach((el) => el.classList.add("wa-in"));
      root.querySelectorAll<HTMLElement>("[data-wa-point]").forEach((el) => {
        el.dataset.on = "true";
      });
      return () => root.classList.remove("wa-js");
    }

    // Reveal each block once as it scrolls into view
    const revealIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("wa-in");
            revealIO.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => revealIO.observe(el));

    // Point columns light up while they sit in the middle of the screen
    const pointIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          (entry.target as HTMLElement).dataset.on = entry.isIntersecting ? "true" : "false";
        });
      },
      { rootMargin: "-38% 0px -38% 0px" }
    );
    root.querySelectorAll<HTMLElement>("[data-wa-point]").forEach((el) => pointIO.observe(el));

    const band = root.querySelector<HTMLElement>("[data-wa-band]");

    let near = true;
    let hovering = false;
    let scrollRaf = 0;
    let pointerRaf = 0;
    let pending: PointerEvent | null = null;

    const update = () => {
      scrollRaf = 0;
      if (!near) return;
      const vh = window.innerHeight;
      const rect = root.getBoundingClientRect();
      const p = clamp01((vh - rect.top) / (rect.height + vh));
      root.style.setProperty("--p", p.toFixed(4));

      // No mouse (touch screens): let the light drift with the scroll instead
      if (!hovering) {
        const px = Math.sin(p * 7) * 0.6;
        const py = Math.cos(p * 5) * 0.5;
        root.style.setProperty("--px", px.toFixed(3));
        root.style.setProperty("--py", py.toFixed(3));
        root.style.setProperty("--mx", `${(50 + px * 35).toFixed(1)}%`);
        root.style.setProperty("--my", `${(40 + py * 30).toFixed(1)}%`);
      }

      if (band) {
        const br = band.getBoundingClientRect();
        const r = clamp01((vh * 0.75 - br.top) / (br.height * 0.9));
        band.style.setProperty("--rail", r.toFixed(3));
      }
    };
    const scheduleScroll = () => {
      if (!scrollRaf) scrollRaf = requestAnimationFrame(update);
    };

    const applyPointer = () => {
      pointerRaf = 0;
      if (!pending) return;
      const r = root.getBoundingClientRect();
      const x = pending.clientX - r.left;
      const y = pending.clientY - r.top;
      root.style.setProperty("--mx", `${x.toFixed(0)}px`);
      root.style.setProperty("--my", `${y.toFixed(0)}px`);
      root.style.setProperty("--px", ((x / r.width) * 2 - 1).toFixed(3));
      root.style.setProperty("--py", ((y / r.height) * 2 - 1).toFixed(3));
      pending = null;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      hovering = true;
      pending = e;
      if (!pointerRaf) pointerRaf = requestAnimationFrame(applyPointer);
    };
    const onLeave = () => {
      hovering = false;
      scheduleScroll();
    };

    // Only do the work while the section is on or near the screen
    const nearIO = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        if (near) scheduleScroll();
      },
      { rootMargin: "200px 0px" }
    );
    nearIO.observe(root);

    update();
    window.addEventListener("scroll", scheduleScroll, { passive: true });
    window.addEventListener("resize", scheduleScroll, { passive: true });
    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave);

    return () => {
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      if (pointerRaf) cancelAnimationFrame(pointerRaf);
      revealIO.disconnect();
      pointIO.disconnect();
      nearIO.disconnect();
      window.removeEventListener("scroll", scheduleScroll);
      window.removeEventListener("resize", scheduleScroll);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.classList.remove("wa-js");
    };
  }, []);

  // Magnetic CTA: the button leans toward the pointer
  const onCtaMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const btn = e.currentTarget.firstElementChild as HTMLElement | null;
    if (!btn) return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    btn.style.setProperty("--tx", `${Math.max(-10, Math.min(10, dx * 0.18)).toFixed(1)}px`);
    btn.style.setProperty("--ty", `${Math.max(-8, Math.min(8, dy * 0.25)).toFixed(1)}px`);
  };
  const onCtaLeave = (e: ReactPointerEvent<HTMLDivElement>) => {
    const btn = e.currentTarget.firstElementChild as HTMLElement | null;
    btn?.style.setProperty("--tx", "0px");
    btn?.style.setProperty("--ty", "0px");
  };

  // Spotlight inside each point column follows the pointer
  const onPointMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--cx", `${(e.clientX - r.left).toFixed(0)}px`);
    e.currentTarget.style.setProperty("--cy", `${(e.clientY - r.top).toFixed(0)}px`);
  };

  const points = [
    {
      title: "Conference Theme",
      description: `${theme}.`,
      Icon: Sparkles,
    },
    {
      title: "Four Conference Days",
      description: `${datesText}. The opening is at ${openingTimeLabel}.`,
      Icon: CalendarDays,
    },
    {
      title: "Venue",
      description: `The conference venue is ${venueName}, ${venueAddress}.`,
      Icon: MapPin,
    },
  ];

  return (
    <section
      ref={sectionRef}
      data-scene="air"
      data-track="why"
      data-enter
      className="wa-root relative isolate z-20 overflow-hidden"
      style={
        {
          "--wa-accent": "#0E7A6E",
          "--wa-accent-hover": "#0C6A60",
          "--wa-ink": "#0E1020",
          "--wa-text": "#0E1020",
          "--wa-muted": "#4B5563",
          "--wa-subtle": "#6B7280",
          "--wa-line": "rgba(14,16,32,0.10)",
          "--wa-frame": "#D1D5DB",
        } as InlineStyle
      }
    >
      <style dangerouslySetInnerHTML={{ __html: WA_CSS }} />

      <div aria-hidden className="wa-bg">
        <div className="wa-blob wa-blob-a" />
        <div className="wa-blob wa-blob-b" />
        <div className="wa-dots" />
        <div className="wa-spot" />
      </div>

      <div className="relative mx-auto w-full max-w-[1320px] px-5 pb-8 pt-8 sm:px-8 sm:pt-10 lg:px-12 lg:pb-6 lg:pt-10">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <div className="flex flex-col items-start lg:col-span-5">
            <div className="flex items-center gap-2.5">
              <span aria-hidden className="h-px w-7 bg-[#8EE3D6]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0E7A6E]">
                Why Attend
              </span>
            </div>

            <h2 className="mt-3 max-w-xl font-display text-[28px] font-semibold leading-[1.12] tracking-[-0.02em] text-[var(--wa-text)] sm:text-4xl lg:text-[42px] xl:text-[46px]">
              Why Attend This Conference?
            </h2>
            <span aria-hidden className="mt-4 h-px w-14 bg-[#0E7A6E]/40" />

            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--wa-muted)] sm:text-base lg:text-[17px]">
              {whyAttendIntro}
            </p>

            <div className="mt-7">
              <div
                data-wa-reveal
                className="wa-reveal -m-1 inline-block p-1"
                style={{ "--d": "250ms" } as InlineStyle}
                onPointerMove={onCtaMove}
                onPointerLeave={onCtaLeave}
              >
                <Link
                  href="/register"
                  className="wa-cta inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#0E7A6E] to-[#0A5F56] px-6 py-3 text-[13px] font-semibold tracking-wide text-white shadow-[0_12px_34px_rgba(14,122,110,0.35)] transition-shadow hover:shadow-[0_16px_44px_rgba(14,122,110,0.45)] active:scale-95 sm:px-8 sm:py-3.5 sm:text-sm"
                >
                  Register For Conference
                </Link>
              </div>
            </div>
          </div>

          <div
            data-wa-band
            className="relative w-full overflow-hidden text-[#0E1020] lg:col-span-7"
          >
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 hidden h-px bg-[#0E7A6E]/15 lg:block">
              <div className="wa-rail-fill h-full origin-left bg-gradient-to-r from-[#0E7A6E] to-[#0A5F56]" />
            </div>

            <div className="divide-y divide-[#0E1020]/10">
              {points.map(({ title, description, Icon }, idx) => (
                <div
                  key={title}
                  data-wa-point
                  data-on="false"
                  data-wa-reveal
                  onPointerMove={onPointMove}
                  className="wa-point wa-reveal"
                  style={{ "--d": `${idx * 140}ms` } as InlineStyle}
                >
                  <span className="wa-icon">
                    <Icon className="h-5 w-5" strokeWidth={1.7} />
                  </span>

                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-[#0E1020] sm:text-lg lg:text-xl">{title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#4B5563] sm:text-sm">{description}</p>
                    <span aria-hidden className="wa-underline" />
                  </div>

                  <span aria-hidden className="wa-ghost">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
