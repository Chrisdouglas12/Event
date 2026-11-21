"use client";

import { useEffect, useRef } from "react";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Fixed camp photo behind the landing content. Scroll altitude is written as
 * CSS variables so the photo can pull back with the WebGL scene, giving the
 * same "drone rising" feel while keeping the layer cheap and reduced-motion
 * friendly.
 */
export function LandingBackdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = ref.current;
    if (!layer) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    const writeAltitude = (altitude: number) => {
      layer.style.setProperty("--drone-scale", (1.1 - altitude * 0.16).toFixed(3));
      layer.style.setProperty("--drone-lift", `${(altitude * 3.2).toFixed(2)}%`);
    };

    const readScroll = () => {
      raf = 0;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      writeAltitude(clamp01(window.scrollY / maxScroll));
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(readScroll);
    };

    writeAltitude(0);
    if (reduceMotion) return;

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return <div ref={ref} aria-hidden className="landing-backdrop" />;
}
