"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Parallax } from "@/components/ui/parallax";
import { RevealText } from "@/components/ui/reveal-text";
import type { InlineStyle } from "@/components/marketing/inline-style";
import { getLandingPerformance } from "@/lib/landing-performance";

/**
 * AboutPreview — "About The Movement"
 *
 * Uses the same two-column landing-card layout as the "Spread the Word"
 * flyer section: framed photo stage on the left, kicker/heading/body/actions
 * on the right. The About copy, Founded chip, stats and magnetic CTA are kept.
 */

const AP_CSS = `
.ap-js .ap-reveal{opacity:0;transform:translate3d(0,20px,0);
  transition:opacity .7s ease,transform .8s cubic-bezier(.2,.8,.2,1);
  transition-delay:var(--d,0ms)}
.ap-js .ap-reveal.ap-in{opacity:1;transform:none}

.ap-chip{position:absolute;left:14px;bottom:14px;z-index:5;
  animation:ap-float 6s ease-in-out infinite}
@keyframes ap-float{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-8px,0)}}

.ap-stat{border:1px solid rgba(14,122,110,.25);border-radius:999px;
  background:rgba(255,255,255,.7);padding:6px 12px;font-size:11px;
  font-weight:700;color:#0E7A6E}

/* Magnetic + shine CTA, shared with the other marketing cards. */
.ap-cta{position:relative;overflow:hidden;
  transform:translate3d(var(--tx,0px),var(--ty,0px),0);
  transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s ease,background-color .2s ease}
.ap-cta::after{content:"";position:absolute;inset:0;
  transform:translateX(-120%) skewX(-20deg);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);
  transition:transform .7s ease}
.ap-cta:hover::after{transform:translateX(120%) skewX(-20deg)}

@media (prefers-reduced-motion:reduce){
  .ap-chip{animation:none}
  .ap-js .ap-reveal{opacity:1;transform:none;transition:none}
}
`;

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
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
  );
}

export function AboutPreview() {
  const sectionRef = useRef<HTMLElement>(null);

  // Reveal-on-scroll, matching the rest of the landing cards.
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

    return () => {
      revealIO.disconnect();
      root.classList.remove("ap-js");
    };
  }, []);

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
      className="cv-auto relative overflow-hidden py-12 lg:py-10"
    >
      <style dangerouslySetInnerHTML={{ __html: AP_CSS }} />

      <div className="px-[3px] sm:px-8 lg:px-8 xl:px-10">
        <div className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#8EE3D6] opacity-[0.10] blur-3xl"
          />

          <div className="landing-card relative grid grid-cols-1 items-stretch lg:grid-cols-12">
            <div className="relative flex items-center justify-center bg-[#F8FAFC]/80 p-8 sm:p-12 lg:col-span-5 lg:border-r lg:border-[#E5E7EB] lg:p-8">
              <div className="relative w-full">
                <div className="image-frame relative z-10 aspect-[4/3] w-full overflow-hidden bg-[#0E1020]">
                  <Parallax speed={0.14} className="absolute inset-0">
                    <Image
                      src="/images/about_us_1.jpg"
                      alt="Horemow ministry and fellowship"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 92vw, 560px"
                    />
                  </Parallax>
                  <div className="photo-veil pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07101e]/70 via-transparent to-transparent" />

                  <div className="ap-chip">
                    <div className="flex max-w-[230px] items-center gap-2.5 border border-white/70 bg-white/90 px-3 py-2 shadow-[0_10px_30px_rgba(14,16,32,0.22)] backdrop-blur-md">
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
              </div>
            </div>

            <div className="flex flex-col items-start justify-center p-8 sm:p-12 lg:col-span-7 lg:p-10 xl:p-12">
              <div className="flex items-center gap-3">
                <span aria-hidden className="h-px w-8 bg-[#8EE3D6]" />
                <RevealText
                  as="span"
                  text="About The Movement"
                  className="text-xs font-bold uppercase tracking-[0.2em] text-[#0E7A6E]"
                  speed={18}
                />
              </div>

              <RevealText
                as="h2"
                text="Holiness Revival Movement Worldwide"
                className="mt-5 max-w-xl font-display text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-[#0E1020] sm:text-4xl lg:text-[40px] xl:text-5xl"
                speed={14}
              />

              <RevealText
                as="p"
                text="An end-time movement reviving biblical righteousness and rapture readiness across denominations."
                className="mt-6 max-w-xl text-sm leading-relaxed text-[#4B5563] lg:text-base lg:leading-7"
                speed={9}
              />

              <p
                data-ap-reveal
                className="ap-reveal mt-5 max-w-xl text-sm leading-relaxed text-[#4B5563] lg:text-base lg:leading-7"
                style={{ "--d": "120ms" } as InlineStyle}
              >
                Founded in 2009 by Pastor Paul Rika and formally inaugurated in Kwali, Abuja in 2010, HOREMOW is an end-time movement reviving biblical righteousness, holiness, and rapture readiness across denominations.
              </p>

              <div
                data-ap-reveal
                className="ap-reveal mt-5 flex flex-wrap gap-2"
                style={{ "--d": "200ms" } as InlineStyle}
              >
                <span className="ap-stat">66 books · one manual</span>
                <span className="ap-stat">Global chapters</span>
              </div>

              <div
                data-ap-reveal
                className="ap-reveal mt-9 flex flex-wrap items-center gap-4"
                style={{ "--d": "280ms" } as InlineStyle}
              >
                <div className="-m-3 inline-block p-3" onPointerMove={onCtaMove} onPointerLeave={onCtaLeave}>
                  <Link
                    href="/about"
                    className="ap-cta group inline-flex items-center justify-center gap-2.5 rounded-full bg-[#8EE3D6] px-8 py-3.5 text-sm font-semibold tracking-wide text-[#0E1020] shadow-[0_8px_30px_rgba(142,227,214,0.25)] transition-all duration-200 hover:bg-[#7BD4C7] hover:shadow-[0_10px_36px_rgba(142,227,214,0.35)] active:scale-95"
                  >
                    Discover Our Story
                    <ArrowIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </div>

                <Link
                  href="/ministers"
                  className="group inline-flex items-center justify-center gap-2.5 rounded-full border border-[#8EE3D6]/50 px-8 py-3.5 text-sm font-semibold tracking-wide text-[#8EE3D6] transition-all duration-200 hover:bg-[#8EE3D6] hover:text-[#0E1020] active:scale-95"
                >
                  Meet the Ministers
                  <ArrowIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
