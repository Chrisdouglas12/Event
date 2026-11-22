"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { FacebookIcon, YoutubeIcon, XIcon } from "@/components/icons/social-icons";
import { RevealText } from "@/components/ui/reveal-text";
import { TiltCard } from "@/components/ui/tilt-card";

export interface MinisterProps {
  name: string;
  role: string;
  bio: string;
  image?: string;
  socials?: {
    youtube?: string;
    facebook?: string;
    x?: string;
    website?: string;
  };
}

/**
 * Interactive minister card (same design language as the Why Attend section).
 *
 *  - A dot grid + soft mint light follow the pointer; on touch screens they
 *    drift with your scroll and switch on while the card is mid-screen.
 *  - The portrait tilts in 3D, carries a glare that follows the pointer, a
 *    parallax photo, an offset outline frame and corner brackets that open up.
 *  - Name, role and bio type out (RevealText); portrait and socials rise in.
 *  - Social buttons lift, fill and show a tooltip.
 *
 * All motion is written to CSS variables (no React re-renders). Reduced-motion
 * users get the static card.
 */

const MC_CSS = `
.mc-card{--cx:72%;--cy:22%;--px:0;--py:0;--mp:.5;position:relative}

/* ---------- pointer / scroll light ---------- */
.mc-dots,.mc-spot{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:0;transition:opacity .4s ease}
.mc-dots{background-image:radial-gradient(rgba(14,122,110,.55) 1px,transparent 1.6px);background-size:20px 20px;
  -webkit-mask-image:radial-gradient(280px circle at var(--cx) var(--cy),#000 0%,transparent 70%);
  mask-image:radial-gradient(280px circle at var(--cx) var(--cy),#000 0%,transparent 70%)}
.mc-spot{background:radial-gradient(380px circle at var(--cx) var(--cy),rgba(142,227,214,.3),transparent 65%)}
.mc-card:hover .mc-dots,.mc-card:hover .mc-spot,
.mc-card[data-lit="true"] .mc-dots,.mc-card[data-lit="true"] .mc-spot{opacity:1}

/* ---------- reveal ---------- */
.mc-js .mc-rise{opacity:0;transform:translate3d(0,26px,0);
  transition:opacity .7s ease,transform .85s cubic-bezier(.2,.8,.2,1);transition-delay:var(--d,0ms)}
.mc-js.mc-in .mc-rise{opacity:1;transform:none}
.mc-underline{display:block;height:3px;width:0;margin-top:14px;border-radius:3px;
  background:linear-gradient(90deg,#0E7A6E,#8EE3D6);transition:width .9s cubic-bezier(.2,.8,.2,1) .5s}
.mc-in .mc-underline,.mc-card:not(.mc-js) .mc-underline{width:64px}

/* ---------- portrait ---------- */
.mc-offset{position:absolute;inset:0;pointer-events:none;border:1.5px solid rgba(14,122,110,.55);border-radius:2px;
  transform:translate3d(calc(14px + var(--px) * -10px),calc(14px + var(--py) * -10px),0);
  transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.mc-par{position:absolute;inset:0;
  transform:scale(1.08) translate3d(calc(var(--px) * -6px),calc((var(--mp) - .5) * -18px + var(--py) * -6px),0);
  transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.mc-glare{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:0;transition:opacity .3s ease;
  background:radial-gradient(circle at calc(50% + var(--px) * 40%) calc(30% + var(--py) * 40%),rgba(255,255,255,.35),transparent 50%)}
.mc-card:hover .mc-glare,.mc-card[data-lit="true"] .mc-glare{opacity:1}
.mc-corner{position:absolute;z-index:3;width:18px;height:18px;pointer-events:none;border:2px solid #8EE3D6;
  transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.mc-c-tl{top:8px;left:8px;border-right:0;border-bottom:0}
.mc-c-tr{top:8px;right:8px;border-left:0;border-bottom:0}
.mc-c-bl{bottom:8px;left:8px;border-top:0;border-right:0}
.mc-c-br{bottom:8px;right:8px;border-top:0;border-left:0}
.mc-card:hover .mc-c-tl,.mc-card[data-lit="true"] .mc-c-tl{transform:translate(-4px,-4px)}
.mc-card:hover .mc-c-tr,.mc-card[data-lit="true"] .mc-c-tr{transform:translate(4px,-4px)}
.mc-card:hover .mc-c-bl,.mc-card[data-lit="true"] .mc-c-bl{transform:translate(-4px,4px)}
.mc-card:hover .mc-c-br,.mc-card[data-lit="true"] .mc-c-br{transform:translate(4px,4px)}

/* ---------- socials ---------- */
.mc-social{position:relative}
.mc-tip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translate(-50%,4px);padding:3px 8px;border-radius:6px;
  background:#0E1020;color:#fff;font-size:11px;font-weight:600;white-space:nowrap;pointer-events:none;opacity:0;
  transition:opacity .2s ease,transform .2s ease}
.mc-social:hover .mc-tip,.mc-social:focus-visible .mc-tip{opacity:1;transform:translate(-50%,0)}

@media (prefers-reduced-motion:reduce){
  .mc-js .mc-rise{opacity:1;transform:none;transition:none}
  .mc-offset,.mc-par,.mc-corner,.mc-underline{transition:none}
}
`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function SocialLink({
  href,
  label,
  tip,
  children,
}: {
  href: string;
  label: string;
  tip: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="mc-social flex h-9 w-9 items-center justify-center rounded-full border border-[#D1D5DB] bg-white text-[#4B5563] transition-all duration-200 hover:-translate-y-1 hover:rotate-[-6deg] hover:border-[#0E7A6E] hover:bg-[#0E7A6E] hover:text-white hover:shadow-[0_10px_24px_rgba(14,122,110,0.3)]"
    >
      <span aria-hidden className="mc-tip">
        {tip}
      </span>
      {children}
    </a>
  );
}

export function MinisterCard({ name, role, bio, image, socials }: MinisterProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.classList.add("mc-js");

    if (reduce) {
      el.classList.add("mc-in");
      return () => el.classList.remove("mc-js", "mc-in");
    }

    // Rise in once
    const revealIO = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("mc-in");
          revealIO.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    revealIO.observe(el);

    // "Lit" while the card sits in the middle of the screen (touch screens)
    const litIO = new IntersectionObserver(
      ([entry]) => {
        el.dataset.lit = entry.isIntersecting ? "true" : "false";
      },
      { rootMargin: "-30% 0px -30% 0px" }
    );
    litIO.observe(el);

    let near = true;
    let hovering = false;
    let scrollRaf = 0;
    let pointerRaf = 0;
    let pending: PointerEvent | null = null;

    const update = () => {
      scrollRaf = 0;
      if (!near) return;
      const vh = window.innerHeight;
      const r = el.getBoundingClientRect();
      const p = clamp01((vh - r.top) / (r.height + vh));
      el.style.setProperty("--mp", p.toFixed(4));

      // No mouse: the light drifts with the scroll
      if (!hovering) {
        const px = Math.sin(p * 6) * 0.6;
        const py = Math.cos(p * 4) * 0.5;
        el.style.setProperty("--px", px.toFixed(3));
        el.style.setProperty("--py", py.toFixed(3));
        el.style.setProperty("--cx", `${(50 + px * 35).toFixed(1)}%`);
        el.style.setProperty("--cy", `${(35 + py * 30).toFixed(1)}%`);
      }
    };
    const scheduleScroll = () => {
      if (!scrollRaf) scrollRaf = requestAnimationFrame(update);
    };

    const applyPointer = () => {
      pointerRaf = 0;
      if (!pending) return;
      const r = el.getBoundingClientRect();
      const x = pending.clientX - r.left;
      const y = pending.clientY - r.top;
      el.style.setProperty("--cx", `${x.toFixed(0)}px`);
      el.style.setProperty("--cy", `${y.toFixed(0)}px`);
      el.style.setProperty("--px", ((x / r.width) * 2 - 1).toFixed(3));
      el.style.setProperty("--py", ((y / r.height) * 2 - 1).toFixed(3));
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
      { rootMargin: "150px 0px" }
    );
    nearIO.observe(el);

    update();
    window.addEventListener("scroll", scheduleScroll, { passive: true });
    window.addEventListener("resize", scheduleScroll, { passive: true });
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);

    return () => {
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      if (pointerRaf) cancelAnimationFrame(pointerRaf);
      revealIO.disconnect();
      litIO.disconnect();
      nearIO.disconnect();
      window.removeEventListener("scroll", scheduleScroll);
      window.removeEventListener("resize", scheduleScroll);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.classList.remove("mc-js", "mc-in");
    };
  }, []);

  return (
    <div ref={cardRef} className="mc-card" data-lit="false">
      <style dangerouslySetInnerHTML={{ __html: MC_CSS }} />

      <TiltCard
        intensity={0}
        className="landing-card group relative grid grid-cols-1 overflow-hidden md:grid-cols-12"
      >
        {/* Pointer / scroll light behind everything */}
        <div aria-hidden className="mc-dots" />
        <div aria-hidden className="mc-spot" />

        {/* Portrait: fixed, left-aligned and identical for every minister. */}
        <div className="relative z-10 flex justify-start p-4 sm:p-6 md:col-span-5 md:p-8">
          <div
            className="mc-rise relative w-[220px] max-w-full shrink-0 sm:w-[260px] lg:w-[280px]"
            style={{ "--d": "0ms" } as CSSProperties}
          >
            {/* Offset outline frame that slides opposite to the pointer */}
            <div aria-hidden className="mc-offset" />

            <TiltCard
              intensity={8}
              className="image-frame relative aspect-[4/5] w-full overflow-hidden bg-[#0E1020]"
            >
              {image ? (
                <div className="mc-par">
                  <Image
                    src={image}
                    alt={name}
                    fill
                    className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 220px, (max-width: 1024px) 260px, 280px"
                  />
                </div>
              ) : (
                /* Graphite-framed photo placeholder */
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
                  style={{
                    background: "linear-gradient(145deg, #3a3e46 0%, #23262c 45%, #16181c 100%)",
                    boxShadow:
                      "inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 2px 0 rgba(255,255,255,0.06), inset 0 -40px 70px rgba(0,0,0,0.35)",
                  }}
                >
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px)",
                    }}
                  />
                  <div className="pointer-events-none absolute inset-3 border border-[#5a606b]/70" />
                  <div className="pointer-events-none absolute inset-[18px] border border-black/45" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[#5a606b]/70 bg-[#1b1d22] shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)]">
                    <ImageIcon className="h-5 w-5 text-[#9aa2ae]" strokeWidth={1.5} />
                  </div>
                  <p className="relative text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c3c9d2]">
                    Photo needed
                  </p>
                  <p className="relative max-w-[12rem] text-[11px] leading-relaxed text-[#8a919c]">
                    {name}, unique portrait for this page
                  </p>
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07101e]/55 via-transparent to-transparent" />

              {/* Light that follows the pointer + corner brackets that open up */}
              <div aria-hidden className="mc-glare" />
              <span aria-hidden className="mc-corner mc-c-tl" />
              <span aria-hidden className="mc-corner mc-c-tr" />
              <span aria-hidden className="mc-corner mc-c-bl" />
              <span aria-hidden className="mc-corner mc-c-br" />
            </TiltCard>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-6 sm:p-8 md:col-span-7 lg:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#8EE3D6] opacity-[0.07] blur-3xl"
          />

          <div className="relative">
            <div className="flex items-center gap-3">
              <span aria-hidden className="h-px w-6 bg-[#0E7A6E]" />
              <RevealText
                as="span"
                text={role}
                className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#0E7A6E]"
                speed={18}
              />
            </div>

            <RevealText
              as="h3"
              text={name}
              className="mt-4 text-2xl font-bold leading-[1.15] tracking-tight text-[#0E1020] sm:text-3xl lg:text-4xl"
              speed={14}
            />
            <span aria-hidden className="mc-underline" />

            <RevealText
              as="p"
              text={bio}
              className="mt-5 max-w-prose text-sm leading-relaxed text-[#4B5563] lg:text-[15px] lg:leading-7"
              speed={9}
            />
          </div>

          {/* Socials */}
          <div
            className="mc-rise relative mt-8 flex items-center gap-2.5 border-t border-[#E5E7EB] pt-6"
            style={{ "--d": "450ms" } as CSSProperties}
          >
            {socials?.youtube && (
              <SocialLink href={socials.youtube} label={`${name} YouTube`} tip="YouTube">
                <YoutubeIcon className="h-4 w-4" />
              </SocialLink>
            )}
            {socials?.facebook && (
              <SocialLink href={socials.facebook} label={`${name} Facebook`} tip="Facebook">
                <FacebookIcon className="h-4 w-4" />
              </SocialLink>
            )}
            {socials?.x && (
              <SocialLink href={socials.x} label={`${name} X`} tip="X">
                <XIcon className="h-4 w-4" />
              </SocialLink>
            )}
            {socials?.website && (
              <SocialLink href={socials.website} label={`${name} website`} tip="Website">
                <GlobeIcon className="h-4 w-4" />
              </SocialLink>
            )}
            <span className="pl-1.5 text-xs font-medium text-[#6B7280]">
              Horemow social channel
            </span>
          </div>
        </div>
      </TiltCard>
    </div>
  );
}
