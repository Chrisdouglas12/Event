"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { Parallax } from "@/components/ui/parallax";
import { RevealText } from "@/components/ui/reveal-text";
import type { InlineStyle } from "@/components/marketing/inline-style";
import { useLandingSettings } from "@/components/marketing/landing-settings";
import { getLandingPerformance } from "@/lib/landing-performance";

type IconProps = { className?: string };

function IconBase({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function CalendarIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </IconBase>
  );
}

function ClockIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconBase>
  );
}

function MapPinIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </IconBase>
  );
}

function ShareIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.2 10.8l7.6-4.4" />
      <path d="M8.2 13.2l7.6 4.4" />
    </IconBase>
  );
}

/**
 * Conference Details: "Plan Your Journey".
 *
 * Uses the same flat two-column landing-card as the flyer, About and gallery
 * sections: framed venue photo on the left, copy and three key facts on the
 * right. There is no route/car progress mechanic — the facts are a compact
 * grid of cards on the shared landing surface.
 */

const DC_CSS = `
.dc-js .dc-reveal{opacity:0;transform:translate3d(0,24px,0);
  transition:opacity .7s ease,transform .8s cubic-bezier(.2,.8,.2,1);transition-delay:var(--d,0ms)}
.dc-js .dc-reveal.dc-in{opacity:1;transform:none}

.dc-chip{position:absolute;left:14px;bottom:14px;z-index:5;
  animation:dc-float 6s ease-in-out infinite}
@keyframes dc-float{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-8px,0)}}
.dc-pin{position:relative}
.dc-pin::after{content:"";position:absolute;inset:-4px;border-radius:9999px;
  border:1.5px solid rgba(14,122,110,.5);animation:dc-ping 2.2s ease-out infinite}
@keyframes dc-ping{0%{transform:scale(.7);opacity:.9}100%{transform:scale(1.5);opacity:0}}

.dc-card{position:relative;overflow:hidden;transition:border-color .3s ease,box-shadow .3s ease}
.dc-card::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .35s ease;
  background:radial-gradient(260px circle at var(--cx,50%) var(--cy,30%),rgba(142,227,214,.3),transparent 62%)}
.dc-card:hover::before{opacity:1}
.dc-card:hover{border-color:rgba(14,122,110,.45);box-shadow:0 14px 40px rgba(14,122,110,.12)}
.dc-ico{transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.dc-card:hover .dc-ico{transform:rotate(-8deg) scale(1.1)}

.dc-cta{position:relative;overflow:hidden;transform:translate3d(var(--tx,0px),var(--ty,0px),0);
  transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s ease,background-color .2s ease}
.dc-cta::after{content:"";position:absolute;inset:0;transform:translateX(-120%) skewX(-20deg);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);transition:transform .7s ease}
.dc-cta:hover::after{transform:translateX(120%) skewX(-20deg)}

@media (prefers-reduced-motion:reduce){
  .dc-pin::after{animation:none}
  .dc-js .dc-reveal{opacity:1;transform:none;transition:none}
}
`;

export function DetailsCard() {
  const {
    eventName,
    theme,
    datesText,
    heroDatesLabel,
    openingTimeLabel,
    registrationFeeLabel,
    venueName,
    venueAddress,
  } = useLandingSettings();

  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;

    const reveals = Array.from(root.querySelectorAll<HTMLElement>("[data-dc-reveal]"));
    root.classList.add("dc-js");

    if (!getLandingPerformance().ambientMotion) {
      reveals.forEach((el) => el.classList.add("dc-in"));
      return () => root.classList.remove("dc-js");
    }

    const revealIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("dc-in");
            revealIO.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => revealIO.observe(el));

    return () => {
      revealIO.disconnect();
      root.classList.remove("dc-js");
    };
  }, []);

  const onCardMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--cx", `${(e.clientX - r.left).toFixed(0)}px`);
    e.currentTarget.style.setProperty("--cy", `${(e.clientY - r.top).toFixed(0)}px`);
  };

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

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: eventName,
          text: `${eventName}. Theme: "${theme}". ${datesText}.`,
          url: window.location.href,
        })
        .catch(() => {});
    }
  };

  const info = [
    { icon: CalendarIcon, title: heroDatesLabel, note: "Tuesday to Friday" },
    { icon: ClockIcon, title: openingTimeLabel, note: "Opening session" },
    { icon: MapPinIcon, title: venueName, note: venueAddress },
  ];

  return (
    <section
      ref={sectionRef}
      data-scene="road"
      data-track="details"
      data-enter
      className="cv-auto relative overflow-hidden py-12 lg:py-10"
    >
      <style dangerouslySetInnerHTML={{ __html: DC_CSS }} />

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
                      src="/images/campground.jpg"
                      alt="Holiness Campground, Kwali, Abuja, during the 2025 conference"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 92vw, 560px"
                    />
                  </Parallax>
                  <div className="photo-veil pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07101e]/70 via-transparent to-transparent" />

                  <div className="dc-chip">
                    <div className="flex max-w-[230px] items-center gap-2.5 border border-white/70 bg-white/90 px-3 py-2 shadow-[0_10px_30px_rgba(14,16,32,0.22)] backdrop-blur-md">
                      <span className="dc-pin flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#8EE3D6]/40 text-[#0E7A6E]">
                        <MapPinIcon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-[#0E7A6E]">
                          Venue
                        </span>
                        <span className="block truncate text-[12px] font-semibold leading-tight text-[#0E1020]">
                          {venueName}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start justify-center p-8 sm:p-12 lg:col-span-7 lg:p-8 xl:p-10">
              <div className="flex items-center gap-3">
                <span aria-hidden className="h-px w-8 bg-[#8EE3D6]" />
                <RevealText
                  as="span"
                  text="Plan Your Journey"
                  className="text-xs font-bold uppercase tracking-[0.2em] text-[#0E7A6E]"
                  speed={18}
                />
              </div>

              <RevealText
                as="h2"
                text="Conference Details"
                className="mt-5 max-w-xl font-display text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-[#0E1020] sm:text-4xl lg:text-[40px] xl:text-5xl"
                speed={14}
              />

              <RevealText
                as="p"
                text="Essential dates, venue location, and session times"
                className="mt-6 max-w-xl text-sm leading-relaxed text-[#4B5563] lg:text-base lg:leading-7"
                speed={9}
              />

              <div
                data-dc-reveal
                className="dc-reveal mt-6 w-full max-w-xl"
                style={{ "--d": "120ms" } as InlineStyle}
              >
                <h3 className="text-2xl font-bold leading-[1.15] tracking-tight text-[#0E1020] sm:text-3xl">
                  {eventName}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4B5563] lg:text-base">
                  Theme: <span className="font-semibold text-[#0E7A6E]">&ldquo;{theme}&rdquo;</span>
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#0E1020] px-4 py-1.5 text-[11px] font-bold text-[#8EE3D6]">
                    {registrationFeeLabel} per participant
                  </span>
                  <span className="rounded-full border border-[#0E7A6E]/25 bg-white/70 px-4 py-1.5 text-[11px] font-semibold text-[#0E7A6E]">
                    {heroDatesLabel}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-4">
                {info.map(({ icon: Icon, title, note }, i) => (
                  <div
                    key={note}
                    data-dc-reveal
                    className="dc-reveal min-w-0"
                    style={{ "--d": `${i * 140}ms` } as InlineStyle}
                  >
                    <div
                      onPointerMove={onCardMove}
                      className="dc-card flex h-full min-w-0 items-center gap-3 border border-[#D5E3E0] bg-white/85 p-3 backdrop-blur-sm lg:p-3.5"
                    >
                      <span className="dc-ico relative flex h-8 w-8 flex-none items-center justify-center rounded-full border border-[#0E7A6E]/30 bg-[#EAF9F7] text-[#0E7A6E]">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="relative min-w-0">
                        <div className="truncate text-[13px] font-bold leading-snug text-[#0E1020]">{title}</div>
                        <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#6B7280]">{note}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div
                data-dc-reveal
                className="dc-reveal mt-5 flex w-full max-w-xl flex-wrap items-center justify-between gap-2 border-t border-[#D5E3E0] pt-4 sm:mt-6 sm:gap-4 sm:pt-5"
                style={{ "--d": "200ms" } as InlineStyle}
              >
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  <button
                    type="button"
                    onClick={handleShare}
                    aria-label="Share Conference Details"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D1D5DB] bg-white text-[#4B5563] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0E7A6E] hover:bg-[#0E7A6E] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7A6E] sm:h-10 sm:w-10"
                  >
                    <ShareIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                  <Link
                    href="/programme"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#D1D5DB] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#0E1020] transition-all hover:border-[#0E7A6E] hover:text-[#0E7A6E] sm:px-3.5 sm:py-2 sm:text-xs"
                  >
                    View Timetable
                  </Link>
                </div>

                <div className="-m-2 inline-block p-2 sm:-m-3 sm:p-3" onPointerMove={onCtaMove} onPointerLeave={onCtaLeave}>
                  <Link
                    href="/register"
                    className="dc-cta group inline-flex items-center justify-center gap-1.5 rounded-full bg-[#8EE3D6] px-4 py-2.5 text-[12px] font-semibold tracking-wide text-[#0E1020] shadow-[0_8px_30px_rgba(142,227,214,0.35)] transition-all duration-200 hover:bg-[#7BD4C7] hover:shadow-[0_12px_40px_rgba(142,227,214,0.5)] active:scale-95 sm:gap-2 sm:px-7 sm:py-3.5 sm:text-sm"
                  >
                    Register Now
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1 sm:h-4 sm:w-4"
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
      </div>
    </section>
  );
}
