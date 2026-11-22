"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Car tracker for the landing page: Hero -> Why Attend -> Ministers.
 *
 * A slim route capsule is fixed to the right edge. A little car drives down
 * the road as you scroll (and back up, turning round, when you scroll up).
 * Each section is a stop on the route: stops light up when the car reaches
 * them and you can tap one to drive there.
 *
 * Sections are found by data attributes:
 *   data-track="hero" | "why" | "ministers"
 * (the Ministers stop falls back to the section that holds a .mc-card).
 */

type StopDef = { id: string; label: string; find: () => HTMLElement | null };

const qs = (selector: string) => document.querySelector<HTMLElement>(selector);

const STOPS: StopDef[] = [
  { id: "hero", label: "Hero", find: () => qs('[data-track="hero"]') },
  { id: "why", label: "Why Attend", find: () => qs('[data-track="why"]') },
  { id: "details", label: "Details", find: () => qs('[data-track="details"]') },
  {
    id: "ministers",
    label: "Ministers",
    find: () => qs('[data-track="ministers"]') ?? qs(".mc-card")?.closest<HTMLElement>("section") ?? null,
  },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function SectionTracker() {
  const [stops, setStops] = useState<{ id: string; label: string }[]>([]);
  const [active, setActive] = useState(0);

  const elsRef = useRef<HTMLElement[]>([]);
  const roadRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const carBodyRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  // Find the sections (they can mount a moment after this component)
  useEffect(() => {
    const scan = () => {
      const found = STOPS.map((s) => ({ s, el: s.find() })).filter(
        (x): x is { s: StopDef; el: HTMLElement } => x.el !== null
      );
      found.sort((a, b) =>
        a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
      );
      elsRef.current = found.map((f) => f.el);
      setStops((prev) => {
        const next = found.map((f) => ({ id: f.s.id, label: f.s.label }));
        return prev.length === next.length && prev.every((p, i) => p.id === next[i].id) ? prev : next;
      });
    };
    scan();
    const t1 = setTimeout(scan, 400);
    const t2 = setTimeout(scan, 1500);
    window.addEventListener("load", scan);
    window.addEventListener("resize", scan);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("load", scan);
      window.removeEventListener("resize", scan);
    };
  }, []);

  // Drive the car
  useEffect(() => {
    const n = stops.length;
    if (n < 2) return;

    const road = roadRef.current;
    const car = carRef.current;
    const body = carBodyRef.current;
    const fill = fillRef.current;
    if (!road || !car || !body || !fill) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dots = Array.from(road.querySelectorAll<HTMLElement>("[data-dot]"));

    let raf = 0;
    let cur = 0; // 0 .. n-1, where the car is now
    let dirDown = true;
    let shownDir: boolean | null = null;
    let lastActive = -1;
    let railH = road.clientHeight;

    // How far along the route are we? (0 = at hero, n-1 = at the last stop)
    const compute = () => {
      const els = elsRef.current;
      const count = els.length;
      if (count < 2) return 0;
      const vh = window.innerHeight;
      const reach = els.map((el, i) =>
        i === 0 ? el.getBoundingClientRect().top : el.getBoundingClientRect().top - vh * 0.45
      );
      let t = count - 1;
      for (let i = 0; i < count - 1; i++) {
        if (reach[i + 1] > 0) {
          const seg = reach[i + 1] - reach[i];
          t = i + clamp01(seg > 0 ? -reach[i] / seg : 0);
          break;
        }
      }
      return t;
    };

    const paint = () => {
      const frac = cur / (n - 1);
      car.style.transform = `translate3d(0, calc(${(frac * railH).toFixed(1)}px - 50%), 0)`;
      fill.style.transform = `scaleY(${frac.toFixed(4)})`;

      if (shownDir !== dirDown) {
        shownDir = dirDown;
        body.style.transform = `rotate(${dirDown ? 180 : 0}deg)`;
      }

      dots.forEach((d, i) => {
        const state = cur >= i - 0.02 ? "on" : "off";
        if (d.dataset.state !== state) d.dataset.state = state;
      });

      const a = Math.round(cur);
      if (a !== lastActive) {
        lastActive = a;
        setActive(a);
      }
    };

    const loop = () => {
      raf = 0;
      const target = compute();
      const diff = target - cur;
      if (Math.abs(diff) > 0.002) dirDown = diff > 0;
      cur += reduce ? diff : diff * 0.14;
      paint();
      if (Math.abs(target - cur) > 0.0008) raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onResize = () => {
      railH = road.clientHeight;
      kick();
    };

    kick();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", onResize);
    };
  }, [stops.length]);

  const go = (i: number) => {
    const el = elsRef.current[i];
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = i === 0 ? 0 : el.getBoundingClientRect().top + window.scrollY - 64;
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  };

  if (stops.length < 2) return null;

  const n = stops.length;
  const current = stops[Math.min(active, n - 1)];

  return (
    <nav
      aria-label="Page sections"
      className="pointer-events-none fixed right-2 top-1/2 z-[45] -translate-y-1/2 sm:right-4"
    >
      <div className="relative flex h-[min(46vh,340px)] rounded-full bg-[#0E1020]/80 px-2.5 py-5 shadow-[0_14px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/10 backdrop-blur-md">
        <div ref={roadRef} className="relative w-[10px]">
          {/* Road */}
          <div className="absolute inset-0 rounded-full bg-[#1b1e26]" />
          <div
            className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
            style={{
              backgroundImage:
                "repeating-linear-gradient(180deg, rgba(255,255,255,0.35) 0 6px, transparent 6px 12px)",
            }}
          />
          {/* Distance driven */}
          <div
            ref={fillRef}
            className="absolute inset-0 origin-top rounded-full bg-gradient-to-b from-[#8EE3D6] to-[#4FD1C0] opacity-80"
            style={{ transform: "scaleY(0)" }}
          />

          {/* Stops */}
          {stops.map((s, i) => (
            <div
              key={s.id}
              className="absolute left-1/2"
              style={{ top: `${(i / (n - 1)) * 100}%` }}
            >
              <button
                type="button"
                data-dot
                data-state="off"
                onClick={() => go(i)}
                aria-label={`Go to ${s.label}`}
                aria-current={active === i ? "true" : undefined}
                className="pointer-events-auto absolute left-1/2 top-0 h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30 bg-[#0E1020] transition-all duration-300 hover:scale-125 data-[state=on]:border-[#8EE3D6] data-[state=on]:bg-[#8EE3D6]"
              />
              {/* Labels on large screens */}
              <button
                type="button"
                onClick={() => go(i)}
                tabIndex={-1}
                aria-hidden
                className={`pointer-events-auto absolute right-full top-0 mr-4 hidden -translate-y-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ring-1 transition-colors duration-300 lg:block ${
                  active === i
                    ? "bg-[#8EE3D6] text-[#0E1020] ring-[#8EE3D6]"
                    : "bg-[#0E1020]/80 text-white/55 ring-white/10 hover:text-white"
                }`}
              >
                {s.label}
              </button>
            </div>
          ))}

          {/* The car */}
          <div
            ref={carRef}
            className="pointer-events-none absolute left-1/2 top-0 -ml-[10px] h-[34px] w-[20px]"
            style={{ transform: "translate3d(0, -50%, 0)" }}
          >
            <div
              ref={carBodyRef}
              className="h-full w-full transition-transform duration-500"
              style={{ transform: "rotate(180deg)" }}
            >
              <svg
                width="20"
                height="34"
                viewBox="0 0 20 34"
                style={{ overflow: "visible" }}
                className="drop-shadow-[0_2px_6px_rgba(142,227,214,0.55)]"
                aria-hidden
              >
                <defs>
                  <linearGradient id="trk-beam" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0" stopColor="#fff6c2" stopOpacity="0.5" />
                    <stop offset="1" stopColor="#fff6c2" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Headlight beam (the car faces up in its own drawing) */}
                <path d="M5 3 L-3 -16 L23 -16 L15 3 Z" fill="url(#trk-beam)" />
                {/* Wheels */}
                <rect x="0" y="6" width="3" height="7" rx="1.2" fill="#0b0f1a" />
                <rect x="17" y="6" width="3" height="7" rx="1.2" fill="#0b0f1a" />
                <rect x="0" y="22" width="3" height="7" rx="1.2" fill="#0b0f1a" />
                <rect x="17" y="22" width="3" height="7" rx="1.2" fill="#0b0f1a" />
                {/* Body */}
                <rect x="2" y="2" width="16" height="30" rx="6" fill="#8EE3D6" />
                <rect x="4.5" y="9" width="11" height="6" rx="2" fill="#0E1020" />
                <rect x="4.5" y="21" width="11" height="5" rx="2" fill="#0E1020" opacity="0.85" />
                {/* Lights */}
                <circle cx="5.2" cy="4.6" r="1.6" fill="#fff6c2" />
                <circle cx="14.8" cy="4.6" r="1.6" fill="#fff6c2" />
                <rect x="3.2" y="29" width="4" height="1.8" rx="0.9" fill="#ff5d6c" />
                <rect x="12.8" y="29" width="4" height="1.8" rx="0.9" fill="#ff5d6c" />
              </svg>
            </div>

            {/* "Now at" bubble that travels with the car (small screens) */}
            <div
              aria-live="polite"
              className="absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-full bg-[#8EE3D6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0E1020] shadow-lg lg:hidden"
            >
              {active + 1}/{n} · {current.label}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
