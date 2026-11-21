"use client";

import { useEffect } from "react";

/**
 * Landing-only depth pass. Each section eases slightly away in 3D as it moves
 * away from the middle of the viewport, then returns as it scrolls back. The
 * scale is written to a CSS variable so the existing compositor-only enter
 * animation can keep owning the transform.
 */
export function LandingSectionDepth() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let marks: { el: HTMLElement; top: number; height: number }[] = [];

    const apply = () => {
      raf = 0;
      const viewportCenter = window.innerHeight * 0.5;
      const range = Math.max(1, window.innerHeight * 0.85);

      marks.forEach(({ el, top, height }) => {
        const sectionCenter = top + height * 0.5 - window.scrollY;
        const distance = Math.abs(sectionCenter - viewportCenter) / range;
        const scale = 1 - Math.min(0.09, distance * 0.09);
        el.style.setProperty("--section-scale", scale.toFixed(3));
      });
    };

    const measure = () => {
      const pageY = window.scrollY;
      marks = Array.from(document.querySelectorAll<HTMLElement>(".landing-navy [data-enter]")).map((el) => {
        const rect = el.getBoundingClientRect();
        return { el, top: rect.top + pageY, height: rect.height };
      });
      apply();
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(apply);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    const bodyRO = new ResizeObserver(measure);
    bodyRO.observe(document.body);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      window.removeEventListener("load", measure);
      bodyRO.disconnect();
      marks.forEach(({ el }) => el.style.removeProperty("--section-scale"));
    };
  }, []);

  return null;
}
