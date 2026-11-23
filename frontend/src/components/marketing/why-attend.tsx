"use client";

import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, MapPin, Sparkles } from "lucide-react";
import type { InlineStyle } from "@/components/marketing/inline-style";
import { useLandingSettings } from "@/components/marketing/landing-settings";
import { getLandingPerformance } from "@/lib/landing-performance";

/**
 * Edge-to-edge "Why Attend" section, sized to sit in a single viewport on
 * desktop.
 *
 * Layers, back to front:
 *  1. Light surface with a slanted top edge and a soft dot/spot backdrop.
 *  2. Copy on the left; the conference flyer becomes a full-height background
 *     panel on the right instead of a floating, tilting card.
 *  3. A compact dark band with three "point" columns. A progress rail fills as
 *     you scroll, and each column lights up when it reaches the middle of the
 *     screen or when you hover / touch it.
 *
 * The old sideways ticker and all typing/tilt motion have been removed.
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

/* ---------- background ---------- */
.wa-bg{position:absolute;inset:0;z-index:-1;overflow:hidden;background:linear-gradient(180deg,#F7FBFA 0%,#EDF5F3 60%,#E4EFEC 100%)}
.wa-dots{position:absolute;inset:0;background-image:radial-gradient(rgba(14,122,110,.6) 1.1px,transparent 1.7px);background-size:22px 22px;
  -webkit-mask-image:radial-gradient(380px circle at var(--mx) var(--my),#000 0%,transparent 70%);
  mask-image:radial-gradient(380px circle at var(--mx) var(--my),#000 0%,transparent 70%)}
.wa-spot{position:absolute;inset:0;background:radial-gradient(520px circle at var(--mx) var(--my),rgba(142,227,214,.4),transparent 65%)}
.wa-blob{position:absolute;border-radius:9999px;filter:blur(70px);transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.wa-blob-a{width:420px;height:420px;right:-120px;top:-100px;background:rgba(142,227,214,.55);
  transform:translate3d(calc(var(--px) * -40px),calc(var(--p) * -140px + var(--py) * -24px),0)}
.wa-blob-b{width:360px;height:360px;left:-140px;bottom:10%;background:rgba(14,122,110,.22);
  transform:translate3d(calc(var(--px) * 34px),calc(var(--p) * 120px + var(--py) * 20px),0)}

/* ---------- reveal on scroll ---------- */
.wa-js .wa-reveal{opacity:0;transform:translate3d(0,24px,0);
  transition:opacity .7s ease,transform .8s cubic-bezier(.2,.8,.2,1);transition-delay:var(--d,0ms)}
.wa-js .wa-reveal.wa-in{opacity:1;transform:none}

/* ---------- flyer background panel ---------- */
.wa-photo{position:relative;overflow:hidden;background:#0E1020}
.wa-photo img{object-fit:cover;object-position:center 18%}
.wa-photo::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(180deg,rgba(7,16,30,.06),rgba(7,16,30,.62))}
.wa-photo-caption{position:absolute;left:20px;bottom:20px;z-index:2;
  max-width:calc(100% - 40px);padding:10px 14px;border:1px solid rgba(142,227,214,.4);
  border-radius:4px;background:rgba(7,16,30,.72);color:#fff;backdrop-blur-sm}
.wa-photo-caption strong{display:block;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8EE3D6}
.wa-photo-caption span{display:block;margin-top:3px;font-size:12px;line-height:1.4;color:rgba(255,255,255,.85)}
@media (min-width:1024px){
  .wa-photo{min-height:320px;clip-path:polygon(0 0,100% 0,100% 100%,56px 100%)}
}

/* ---------- CTA ---------- */
.wa-cta{position:relative;overflow:hidden;
  transform:translate3d(var(--tx,0px),var(--ty,0px),0);
  transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s ease}
.wa-cta::after{content:"";position:absolute;inset:0;transform:translateX(-120%) skewX(-20deg);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);transition:transform .7s ease}
.wa-cta:hover::after{transform:translateX(120%) skewX(-20deg)}

/* ---------- dark points band ---------- */
.wa-rail-fill{transform:scaleX(var(--rail,0));transition:transform .15s linear}
.wa-point{position:relative;overflow:hidden}
.wa-point::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .35s ease;
  background:radial-gradient(340px circle at var(--cx,50%) var(--cy,30%),rgba(142,227,214,.2),transparent 62%)}
.wa-point:hover::before,.wa-point[data-on="true"]::before{opacity:1}
.wa-ghost{position:absolute;right:1.25rem;top:.25rem;pointer-events:none;user-select:none;
  font-size:clamp(88px,10vw,148px);font-weight:900;line-height:1;color:transparent;
  -webkit-text-stroke:1px rgba(255,255,255,.08);
  transform:translateY(calc((var(--rail,0) - .5) * -28px));
  transition:-webkit-text-stroke-color .35s ease}
.wa-point:hover .wa-ghost,.wa-point[data-on="true"] .wa-ghost{-webkit-text-stroke-color:rgba(142,227,214,.4)}
.wa-icon{display:flex;height:44px;width:44px;flex:none;align-items:center;justify-content:center;border-radius:9999px;
  border:1px solid rgba(142,227,214,.3);background:rgba(142,227,214,.08);color:#8EE3D6;
  transition:transform .4s cubic-bezier(.2,.8,.2,1),background .3s ease}
.wa-point:hover .wa-icon{transform:rotate(-8deg) scale(1.1);background:rgba(142,227,214,.18)}
.wa-point[data-on="true"] .wa-icon{animation:wa-pulse 2.4s ease-out infinite}
@keyframes wa-pulse{0%{box-shadow:0 0 0 0 rgba(142,227,214,.45)}70%,100%{box-shadow:0 0 0 14px rgba(142,227,214,0)}}
.wa-underline{display:block;height:2px;width:28px;margin-top:18px;border-radius:2px;background:#8EE3D6;
  transition:width .5s cubic-bezier(.2,.8,.2,1)}
.wa-point:hover .wa-underline,.wa-point[data-on="true"] .wa-underline{width:84px}

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

  // ---------- Scroll + pointer + reveal wiring ----------
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

  // ---------- Small pointer helpers ----------
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

      {/* ---------- Layer 1: living background ---------- */}
      <div aria-hidden className="wa-bg">
        <div className="wa-blob wa-blob-a" />
        <div className="wa-blob wa-blob-b" />
        <div className="wa-dots" />
        <div className="wa-spot" />
      </div>

      {/* ---------- Layer 2: copy + flyer background ---------- */}
      <div className="relative mx-auto grid max-w-[1320px] grid-cols-1 items-center gap-10 px-5 pb-8 sm:px-8 lg:min-h-[380px] lg:grid-cols-12 lg:gap-12 lg:px-12 lg:pb-6 xl:gap-16">
        {/* Left: copy */}
        <div className="flex flex-col items-start lg:col-span-6">
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px w-8" style={{ background: "var(--wa-accent)" }} />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--wa-accent)]">
              Why Attend
            </span>
          </div>

          <h2 className="mt-4 max-w-xl text-3xl font-bold leading-[1.1] tracking-tight text-[var(--wa-text)] sm:text-4xl lg:text-[44px] xl:text-5xl">
            Why Attend This Conference?
          </h2>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--wa-muted)] lg:text-[17px]">
            {whyAttendIntro}
          </p>

          <div className="mt-7">
            <div
              data-wa-reveal
              className="wa-reveal -m-4 inline-block p-4"
              style={{ "--d": "250ms" } as InlineStyle}
              onPointerMove={onCtaMove}
              onPointerLeave={onCtaLeave}
            >
              <Link
                href="/register"
                className="wa-cta group inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-br from-[#0E7A6E] to-[#0A5F56] px-8 py-3.5 text-sm font-semibold tracking-wide text-white shadow-[0_12px_34px_rgba(14,122,110,0.35)] hover:shadow-[0_16px_44px_rgba(14,122,110,0.45)] active:scale-95"
              >
                Register For Conference
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
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

        {/* Right: the flyer becomes the section's own background panel */}
        <div className="lg:col-span-6 lg:self-stretch">
          <div
            data-wa-reveal
            className="wa-reveal wa-photo relative h-[320px] w-full sm:h-[400px] lg:h-full"
            style={{ "--d": "150ms" } as InlineStyle}
          >
            <Image
              src="/images/conference_flyer.jpg"
              alt="International Holiness General Conference 2026 flyer"
              fill
              className="object-cover"
              quality={90}
              sizes="(max-width: 1024px) 100vw, 46vw"
            />
            <div className="wa-photo-caption">
              <strong>IHGC 2026</strong>
              <span>{theme}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Layer 3: full-width dark points band ---------- */}
      <div data-wa-band className="relative bg-[#0E1020] text-white">
        {/* Progress rail: fills as you scroll through the band */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 hidden h-px bg-white/10 md:block">
          <div className="wa-rail-fill h-full origin-left bg-gradient-to-r from-[#8EE3D6] to-[#4FD1C0]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3">
          {points.map(({ title, description, Icon }, idx) => (
            <div
              key={title}
              data-wa-point
              data-on="false"
              data-wa-reveal
              onPointerMove={onPointMove}
              className="wa-point wa-reveal border-t border-white/10 px-5 py-8 first:border-t-0 sm:px-8 md:border-l md:border-t-0 md:py-5 md:first:border-l-0 lg:px-8"
              style={{ "--d": `${idx * 140}ms` } as InlineStyle}
            >
              <span aria-hidden className="wa-ghost">
                {String(idx + 1).padStart(2, "0")}
              </span>

              <div className="relative flex items-start gap-5">
                <span className="wa-icon">
                  <Icon className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white lg:text-xl">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#B9C4D4]">{description}</p>
                  <span aria-hidden className="wa-underline" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
