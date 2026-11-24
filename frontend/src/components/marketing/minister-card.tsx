"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { ImageIcon } from "lucide-react";
import type { InlineStyle } from "@/components/marketing/inline-style";
import { FacebookIcon, YoutubeIcon, XIcon } from "@/components/icons/social-icons";
import { RevealText } from "@/components/ui/reveal-text";
import { getLandingPerformance } from "@/lib/landing-performance";

export interface MinisterProps {
  name: string;
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
 * Minister card — same design language as AboutPreview / DetailsCard:
 *
 *  - Slanted card surface (clip-path) on the light mint background.
 *  - Living background inside the card: mint blobs, dot grid + spotlight
 *    that track the pointer; on touch they drift with the scroll.
 *  - Portrait uses the same offset double frame as About The Movement.
 *  - Inside `.ms-group`, the two cards become one joined surface on desktop:
 *    one row, one slant, one shadow, with a hairline divider between them.
 *  - Reveal-on-scroll via IntersectionObserver (same pattern), type-in
 *    header via RevealText.
 *  - Socials upgraded to the magnetic + shine pill from the CTAs.
 *
 * All motion is written to CSS variables (no React re-renders). Reduced-motion
 * users get the static card.
 */

const MC_CSS = `
.mc-card{--p:0;--px:0;--py:0;--mx:72%;--my:26%;--mc-slant:18px;position:relative;
  clip-path:polygon(0 var(--mc-slant),100% 0,100% 100%,0 100%);
  padding-top:calc(var(--mc-slant) + 4px)}
@media (min-width:768px){.mc-card{--mc-slant:24px;padding-top:calc(var(--mc-slant) + 4px)}}

/* On desktop the two cards share one surface instead of reading as two cards. */
.ms-group{position:relative}
@media (min-width:1024px){
  .ms-group{isolation:isolate;overflow:hidden}
  .ms-group .mc-card{clip-path:none;padding-top:0;background:transparent;
    border:0;border-radius:0;box-shadow:none}
  .ms-group .mc-card:hover{border-color:transparent;box-shadow:none}
  .ms-group .mc-card + .mc-card{border-left:1px solid rgba(14,122,110,.14)}
  .ms-group .mc-card{display:flex}
  .ms-group .mc-card > .relative{width:100%;display:flex;flex-direction:column}
  .ms-group .mc-photo{aspect-ratio:auto;height:360px;min-height:0}
  .ms-group .mc-content{flex:1}
}

/* ---------- living background inside the card ---------- */
.mc-bg{position:absolute;inset:0;z-index:0;overflow:hidden;
  background:linear-gradient(180deg,#F7FBFA 0%,#EDF5F3 60%,#E4EFEC 100%)}
.mc-dots{position:absolute;inset:0;
  background-image:radial-gradient(rgba(14,122,110,.6) 1.1px,transparent 1.7px);
  background-size:22px 22px;
  -webkit-mask-image:radial-gradient(320px circle at var(--mx) var(--my),#000 0%,transparent 70%);
  mask-image:radial-gradient(320px circle at var(--mx) var(--my),#000 0%,transparent 70%)}
.mc-spot{position:absolute;inset:0;
  background:radial-gradient(420px circle at var(--mx) var(--my),rgba(142,227,214,.42),transparent 65%)}
.mc-blob{position:absolute;border-radius:9999px;filter:blur(60px);
  transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.mc-blob-a{width:280px;height:280px;left:-90px;top:-60px;background:rgba(142,227,214,.55);
  transform:translate3d(calc(var(--px) * 30px),calc(var(--p) * -80px + var(--py) * -18px),0)}
.mc-blob-b{width:240px;height:240px;right:-90px;bottom:4%;background:rgba(14,122,110,.22);
  transform:translate3d(calc(var(--px) * -26px),calc(var(--p) * 70px + var(--py) * 14px),0)}

/* Orbital motif shared with the navy section behind the card. */
.mc-orbit{position:absolute;left:74%;top:36%;transform:translate(-50%,-50%);aspect-ratio:1;
  border:1px solid rgba(14,122,110,.16);border-radius:50%;pointer-events:none}
.mc-orbit::after{content:"";position:absolute;left:50%;top:-2.5px;height:5px;width:5px;margin-left:-2.5px;
  border-radius:9999px;background:rgba(14,122,110,.55)}
.mc-orbit-a{width:520px;animation:mc-orbit-spin 80s linear infinite}
.mc-orbit-b{width:350px;border-style:dashed;border-color:rgba(14,122,110,.12);
  animation:mc-orbit-spin 60s linear infinite reverse}
@keyframes mc-orbit-spin{to{transform:translate(-50%,-50%) rotate(360deg)}}

/* ---------- reveal ---------- */
.mc-js .mc-reveal{opacity:0;transform:translate3d(0,26px,0) scale(.98);
  transition:opacity .8s ease,transform .9s cubic-bezier(.2,.8,.2,1);transition-delay:var(--d,0ms)}
.mc-js .mc-reveal.mc-in{opacity:1;transform:none}
.mc-underline{display:block;height:3px;width:0;margin-top:14px;border-radius:3px;
  background:linear-gradient(90deg,#0E7A6E,#8EE3D6);transition:width .9s cubic-bezier(.2,.8,.2,1) .5s}
.mc-in .mc-underline,.mc-card:not(.mc-js) .mc-underline{width:64px}

/* ---------- portrait (same framed stage as About The Movement) ---------- */
.mc-photo{position:relative;display:flex;align-items:center;justify-content:center;
  overflow:hidden;padding:28px 22px 36px;background:rgba(248,250,252,.7)}
.mc-frame{position:relative;width:max-content;max-width:100%;margin-inline:auto}
@media (min-width:1024px){.mc-frame{max-width:100%}}
.mc-par{position:relative;
  transform:translate3d(calc(var(--px) * -8px),calc(var(--py) * -6px),0)
    scale(calc(1 + var(--p) * .035));
  transition:transform .8s cubic-bezier(.2,.8,.2,1)}
html.perf-full .mc-card:hover .mc-par{
  transform:translate3d(calc(var(--px) * -10px),calc(var(--py) * -8px),0) scale(1.055)}
.mc-photo-img{display:block;width:auto;height:auto;max-width:100%}

/* ---------- socials (magnetic pill from the CTAs) ---------- */
.mc-social{position:relative;overflow:hidden;
  transform:translate3d(var(--tx,0px),var(--ty,0px),0);
  transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s ease,background-color .2s ease}
.mc-social::after{content:"";position:absolute;inset:0;transform:translateX(-120%) skewX(-20deg);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);
  transition:transform .7s ease}
.mc-social:hover::after{transform:translateX(120%) skewX(-20deg)}
.mc-tip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translate(-50%,4px);
  padding:3px 8px;border-radius:6px;background:#0E1020;color:#fff;font-size:11px;font-weight:600;
  white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .2s ease,transform .2s ease}
.mc-social:hover .mc-tip,.mc-social:focus-visible .mc-tip{opacity:1;transform:translate(-50%,0)}

@media (prefers-reduced-motion:reduce){
  .mc-js .mc-reveal{opacity:1;transform:none;transition:none}
  .mc-orbit{animation:none}
  .mc-par{transform:none}
}
`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
  onMove,
  onLeave,
}: {
  href: string;
  label: string;
  tip: string;
  children: ReactNode;
  onMove: (e: React.PointerEvent<HTMLAnchorElement>) => void;
  onLeave: (e: React.PointerEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="mc-social flex h-10 w-10 items-center justify-center rounded-full border border-[#D1D5DB] bg-white text-[#4B5563] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0E7A6E] hover:bg-[#0E7A6E] hover:text-white hover:shadow-[0_10px_24px_rgba(14,122,110,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7A6E]"
    >
      <span aria-hidden className="mc-tip">{tip}</span>
      {children}
    </a>
  );
}

export function MinisterCard({ name, bio, image, socials }: MinisterProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // ---------- Scroll, pointer, reveal (same system as AboutPreview/DetailsCard) ----------
  useEffect(() => {
    const root = cardRef.current;
    if (!root) return;

    const perf = getLandingPerformance();
    const reveals = Array.from(root.querySelectorAll<HTMLElement>("[data-mc-reveal]"));

    root.classList.add("mc-js");

    if (!perf.ambientMotion) {
      reveals.forEach((el) => el.classList.add("mc-in"));
      return () => root.classList.remove("mc-js");
    }

    const revealIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("mc-in");
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
      { rootMargin: "150px 0px" }
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
      root.classList.remove("mc-js");
    };
  }, []);

  // ---------- Magnetic socials ----------
  const onSocMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    e.currentTarget.style.setProperty("--tx", `${Math.max(-6, Math.min(6, dx * 0.18)).toFixed(1)}px`);
    e.currentTarget.style.setProperty("--ty", `${Math.max(-6, Math.min(6, dy * 0.25)).toFixed(1)}px`);
  };
  const onSocLeave = (e: React.PointerEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.setProperty("--tx", "0px");
    e.currentTarget.style.setProperty("--ty", "0px");
  };

  return (
    <div ref={cardRef} className="mc-card landing-card depth-stage">
      <style dangerouslySetInnerHTML={{ __html: MC_CSS }} />

      {/* Living background inside the card (same system as the sections) */}
      <div aria-hidden className="mc-bg">
        <span className="mc-orbit mc-orbit-a" />
        <span className="mc-orbit mc-orbit-b" />
        <div className="mc-blob mc-blob-a" />
        <div className="mc-blob mc-blob-b" />
        <div className="mc-dots" />
        <div className="mc-spot" />
      </div>

      <div className="relative z-10 grid grid-cols-1">
        {/* Portrait uses the same framed stage as About The Movement */}
        <div className="mc-photo">
          <div className="mc-frame">
            {/* Mint accent frame, top-right */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-[4px] border"
              style={{
                borderColor: "rgba(142,227,214,0.35)",
                transform: "translate(14px, -14px)",
              }}
            />
            {/* Graphite frame, bottom-left */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-[4px] border-2 border-[#3A404B]"
              style={{ transform: "translate(-14px, 14px)" }}
            />

            <div
              className={`image-frame relative z-10 mx-auto max-w-full overflow-hidden bg-[#0E1020] ${image ? "" : "min-h-[360px]"}`}
            >
              <div className="mc-par">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt={name} className="mc-photo-img" />
                ) : null}
              </div>

              {/* Graphite placeholder if no image */}
              {!image && (
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

              <div className="photo-veil pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07101e]/60 via-transparent to-transparent" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mc-content flex flex-col px-5 py-6 sm:px-7 lg:px-8 lg:py-6">
          <div className="space-y-4">
            <div
              data-mc-reveal
              className="mc-reveal"
              style={{ "--d": "0ms" } as InlineStyle}
            >
              <RevealText
                as="h3"
                text={name}
                className="text-2xl font-bold leading-[1.15] tracking-tight text-[#0E1020] sm:text-3xl lg:text-[34px]"
                speed={14}
              />
              <span aria-hidden className="mc-underline" />
            </div>

            <div
              data-mc-reveal
              className="mc-reveal"
              style={{ "--d": "80ms" } as InlineStyle}
            >
              <RevealText
                as="p"
                text={bio}
                className="max-w-prose text-sm leading-relaxed text-[#4B5563] lg:text-[15px] lg:leading-7"
                speed={9}
              />
            </div>
          </div>

          {/* Socials — magnetic pill + shine, matching the CTAs */}
          <div
            data-mc-reveal
            className="mc-reveal mt-7 flex items-center justify-between gap-4 border-t border-[#D5E3E0] pt-5 md:mt-auto md:pt-6"
            style={{ "--d": "180ms" } as InlineStyle}
          >
            <div className="flex items-center gap-2.5">
              {socials?.youtube && (
                <SocialLink
                  href={socials.youtube}
                  label={`${name} YouTube`}
                  tip="YouTube"
                  onMove={onSocMove}
                  onLeave={onSocLeave}
                >
                  <YoutubeIcon className="h-4 w-4" />
                </SocialLink>
              )}
              {socials?.facebook && (
                <SocialLink
                  href={socials.facebook}
                  label={`${name} Facebook`}
                  tip="Facebook"
                  onMove={onSocMove}
                  onLeave={onSocLeave}
                >
                  <FacebookIcon className="h-4 w-4" />
                </SocialLink>
              )}
              {socials?.x && (
                <SocialLink
                  href={socials.x}
                  label={`${name} X`}
                  tip="X"
                  onMove={onSocMove}
                  onLeave={onSocLeave}
                >
                  <XIcon className="h-4 w-4" />
                </SocialLink>
              )}
              {socials?.website && (
                <SocialLink
                  href={socials.website}
                  label={`${name} website`}
                  tip="Website"
                  onMove={onSocMove}
                  onLeave={onSocLeave}
                >
                  <GlobeIcon className="h-4 w-4" />
                </SocialLink>
              )}
            </div>

            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0E7A6E]">
              Horemow channels
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}