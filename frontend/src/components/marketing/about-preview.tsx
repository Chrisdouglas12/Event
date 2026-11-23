"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { Parallax } from "@/components/ui/parallax";
import { RevealText } from "@/components/ui/reveal-text";
import { getLandingPerformance } from "@/lib/landing-performance";

/**
 * AboutPreview — "About The Movement"
 *
 * Visual sibling of DetailsCard:
 *  - Full-bleed light surface, slanted top edge, drifting mint blobs,
 *    dot grid + spotlight that follow the pointer (drift on touch).
 *  - ONE photo bleeding to the left screen edge with a slanted cut,
 *    parallax, and a floating "Founded" chip.
 *  - Copy column with mint pill CTA.
 *
 * Motion is written to CSS variables (no React re-renders). Reduced-motion
 * users get the static layout.
 */

const AP_CSS = `
.ap-root{--p:0;--px:0;--py:0;--mx:72%;--my:26%;
  --ap-slant:28px;padding-top:calc(var(--ap-slant) + 2rem);padding-bottom:2.5rem;
  clip-path:polygon(0 var(--ap-slant),100% 0,100% 100%,0 100%)}
@media (min-width:1024px){.ap-root{--ap-slant:56px;padding-top:calc(var(--ap-slant) + 3rem);padding-bottom:3.5rem}}

/* ---------- background ---------- */
.ap-bg{position:absolute;inset:0;z-index:-1;overflow:hidden;
  background:linear-gradient(180deg,#F7FBFA 0%,#EDF5F3 60%,#E4EFEC 100%)}
.ap-dots{position:absolute;inset:0;
  background-image:radial-gradient(rgba(14,122,110,.6) 1.1px,transparent 1.7px);
  background-size:22px 22px;
  -webkit-mask-image:radial-gradient(380px circle at var(--mx) var(--my),#000 0%,transparent 70%);
  mask-image:radial-gradient(380px circle at var(--mx) var(--my),#000 0%,transparent 70%)}
.ap-spot{position:absolute;inset:0;
  background:radial-gradient(520px circle at var(--mx) var(--my),rgba(142,227,214,.4),transparent 65%)}
.ap-blob{position:absolute;border-radius:9999px;filter:blur(70px);
  transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.ap-blob-a{width:420px;height:420px;left:-140px;top:-80px;background:rgba(142,227,214,.5);
  transform:translate3d(calc(var(--px) * 40px),calc(var(--p) * -120px + var(--py) * -24px),0)}
.ap-blob-b{width:360px;height:360px;right:-140px;bottom:6%;background:rgba(14,122,110,.2);
  transform:translate3d(calc(var(--px) * -34px),calc(var(--p) * 110px + var(--py) * 20px),0)}

/* ---------- reveal ---------- */
.ap-js .ap-reveal{opacity:0;transform:translate3d(0,24px,0);
  transition:opacity .7s ease,transform .8s cubic-bezier(.2,.8,.2,1);transition-delay:var(--d,0ms)}
.ap-js .ap-reveal.ap-in{opacity:1;transform:none}

/* ---------- photo (bleeds left, slanted cut) ---------- */
.ap-photo{position:relative;overflow:hidden;background:#0E1020;aspect-ratio:5/4}
@media (min-width:1024px){
  .ap-photo{aspect-ratio:auto;min-height:300px;height:100%}
}
.ap-feature{position:relative;isolation:isolate;overflow:hidden;
  border:1px solid rgba(142,227,214,.5);border-radius:18px;
  background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(255,255,255,.72));
  box-shadow:0 28px 70px rgba(7,16,30,.16),0 2px 0 rgba(255,255,255,.8) inset}
.ap-feature::after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;border-radius:inherit;
  box-shadow:0 0 0 1px rgba(14,122,110,.08) inset}
.ap-kicker{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(14,122,110,.25);
  border-radius:999px;background:rgba(142,227,214,.16);padding:5px 11px;
  color:#0E7A6E;font-size:9px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}
.ap-kicker::before{content:"";width:6px;height:6px;border-radius:999px;background:#0E7A6E;
  box-shadow:0 0 0 3px rgba(14,122,110,.12)}
.ap-stat{border:1px solid rgba(14,122,110,.25);border-radius:999px;background:rgba(255,255,255,.7);
  padding:6px 12px;font-size:11px;font-weight:700;color:#0E7A6E}
.ap-par{position:absolute;inset:0;
  transform:scale(1.08) translate3d(calc(var(--px) * -8px),calc(var(--py) * -6px),0);
  transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.ap-chip{position:absolute;left:16px;bottom:34px;z-index:5;
  transition:transform .45s cubic-bezier(.2,.8,.2,1);
  transform:translate3d(calc(var(--px) * 12px),calc(var(--py) * 10px),0)}
@media (min-width:1024px){.ap-chip{left:28px;bottom:28px}}
.ap-chip-body{animation:ap-float 6s ease-in-out infinite}
@keyframes ap-float{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-8px,0)}}

/* ---------- CTA (magnetic + shine) ---------- */
.ap-cta{position:relative;overflow:hidden;
  transform:translate3d(var(--tx,0px),var(--ty,0px),0);
  transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s ease,background-color .2s ease}
.ap-cta::after{content:"";position:absolute;inset:0;
  transform:translateX(-120%) skewX(-20deg);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);
  transition:transform .7s ease}
.ap-cta:hover::after{transform:translateX(120%) skewX(-20deg)}

@media (prefers-reduced-motion:reduce){
  .ap-chip-body{animation:none}
  .ap-js .ap-reveal{opacity:1;transform:none;transition:none}
}
`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function AboutPreview() {
  const sectionRef = useRef<HTMLElement>(null);

  // ---------- Scroll, pointer, reveal ----------
  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;

    const perf = getLandingPerformance();
    const reveals = Array.from(root.querySelectorAll<HTMLElement>("[data-ap-reveal]"));

    root.classList.add("ap-js");

    if (!perf.ambientMotion) {
      reveals.forEach((el) => el.classList.add("ap-in"));
      return () => root.classList.remove("ap-js");
    }

    const revealIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("ap-in");
            revealIO.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => revealIO.observe(el));

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

      if (!hovering) {
        const px = Math.sin(p * 7) * 0.6;
        const py = Math.cos(p * 5) * 0.5;
        root.style.setProperty("--px", px.toFixed(3));
        root.style.setProperty("--py", py.toFixed(3));
        root.style.setProperty("--mx", `${(50 + px * 35).toFixed(1)}%`);
        root.style.setProperty("--my", `${(40 + py * 30).toFixed(1)}%`);
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
      nearIO.disconnect();
      window.removeEventListener("scroll", scheduleScroll);
      window.removeEventListener("resize", scheduleScroll);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.classList.remove("ap-js");
    };
  }, []);

  // ---------- Magnetic CTA ----------
  const onCtaMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const btn = e.currentTarget.firstElementChild as HTMLElement | null;
    if (!btn) return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    btn.style.setProperty("--tx", `${Math.max(-10, Math.min(10, dx * 0.18)).toFixed(1)}px`);
    btn.style.setProperty("--ty", `${Math.max(-8, Math.min(8, dy * 0.25)).toFixed(1)}px`);
  };
  const onCtaLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    const btn = e.currentTarget.firstElementChild as HTMLElement | null;
    btn?.style.setProperty("--tx", "0px");
    btn?.style.setProperty("--ty", "0px");
  };

  return (
    <section
      ref={sectionRef}
      data-scene="sea"
      data-enter
      className="ap-root relative isolate overflow-hidden"
    >
      <style dangerouslySetInnerHTML={{ __html: AP_CSS }} />

      {/* Living background — identical system to DetailsCard */}
      <div aria-hidden className="ap-bg">
        <div className="ap-blob ap-blob-a" />
        <div className="ap-blob ap-blob-b" />
        <div className="ap-dots" />
        <div className="ap-spot" />
      </div>

      {/* ---------- Header ---------- */}
      <div className="relative mx-auto max-w-2xl px-5 text-center">
        <div className="flex items-center justify-center gap-3">
          <span aria-hidden className="h-px w-8 bg-[#0E7A6E]" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#0E7A6E]">
            About The Movement
          </span>
          <span aria-hidden className="h-px w-8 bg-[#0E7A6E]" />
        </div>
        <RevealText
          as="h2"
          text="Holiness Revival Movement Worldwide"
          className="mt-5 text-3xl font-bold leading-[1.1] tracking-tight text-[#0E1020] sm:text-4xl lg:text-[44px] xl:text-5xl"
          speed={14}
        />
        <RevealText
          as="p"
          text="An end-time movement reviving biblical righteousness and rapture readiness across denominations."
          className="mx-auto mt-5 max-w-xl text-sm text-[#4B5563] lg:text-base"
          speed={9}
        />
      </div>

      {/* ---------- Compact photo + story feature card ---------- */}
      <div className="relative mx-auto mt-8 max-w-[1320px] px-5 sm:px-8 lg:mt-10 lg:px-12">
        <div className="ap-feature grid grid-cols-1 lg:grid-cols-12">
          <div className="ap-photo lg:col-span-5">
            <div className="ap-par">
              <Parallax speed={0.14} className="absolute inset-0">
                <Image
                  src="/images/about_us_1.jpg"
                  alt="Horemow ministry and fellowship"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                />
              </Parallax>
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07101e]/70 via-transparent to-transparent" />

            <div className="ap-chip">
              <div className="ap-chip-body flex max-w-[230px] items-center gap-2.5 rounded-xl border border-white/70 bg-white/90 px-3 py-2 shadow-[0_10px_30px_rgba(14,16,32,0.22)] backdrop-blur-md">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#8EE3D6]/40 text-[#0E7A6E]">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
                    <circle cx="12" cy="9.5" r="2.5" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-[#0E7A6E]">
                    Founded
                  </span>
                  <span className="block truncate text-[12px] font-semibold leading-tight text-[#0E1020]">
                    2009 · Kwali, Abuja
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col p-6 sm:p-8 lg:col-span-7 lg:p-9">
            <span className="ap-kicker w-fit">Who we are</span>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#4B5563] lg:text-base">
              Founded in 2009 by Pastor Paul Rika and formally inaugurated in Kwali, Abuja in 2010, HOREMOW is an end-time movement reviving biblical righteousness, holiness, and rapture readiness across denominations.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="ap-stat">66 books · one manual</span>
              <span className="ap-stat">Global chapters</span>
            </div>

            <div
              data-ap-reveal
              className="ap-reveal mt-6 flex items-center justify-between gap-4 border-t border-[#D5E3E0] pt-5 lg:mt-auto lg:pt-6"
              style={{ "--d": "200ms" } as CSSProperties}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0E7A6E]">
                Learn more
              </span>

              <div className="-m-3 inline-block p-3" onPointerMove={onCtaMove} onPointerLeave={onCtaLeave}>
                <Link
                  href="/about"
                  className="ap-cta group inline-flex items-center justify-center gap-2 rounded-full bg-[#8EE3D6] px-6 py-3 text-sm font-semibold tracking-wide text-[#0E1020] shadow-[0_8px_30px_rgba(142,227,214,0.35)] hover:bg-[#7BD4C7] hover:shadow-[0_12px_40px_rgba(142,227,214,0.5)] active:scale-95"
                >
                  Discover Our Story
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
        </div>
      </div>
    </section>
  );
}