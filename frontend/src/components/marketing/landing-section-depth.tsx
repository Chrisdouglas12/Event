"use client";

import { useEffect } from "react";

/**
 * Landing-only depth pass, driven by the same single scroll progress idea as
 * the globe: one normalised value per section, written to a CSS variable.
 *
 * A section stays at full size while any part of it is in the viewport. Once
 * it leaves, it keeps zooming out the further it travels (no fixed floor), and
 * on the way back in it zooms up until it is fully normal again. The transform
 * stays on the compositor because the view-timeline enter animation reads the
 * same variable.
 */
export function LandingSectionDepth() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let sections: HTMLElement[] = [];

    const apply = () => {
      raf = 0;
      const vh = Math.max(1, window.innerHeight);

      sections.forEach((el) => {
        const rect = el.getBoundingClientRect();
        let scale = 1;

        if (rect.top >= vh) {
          // Below the viewport: zoom in continuously until it arrives at full
          // size as its top edge reaches the bottom of the screen.
          const distance = (rect.top - vh) / vh;
          scale = 1 / (1 + distance * 0.55);
        } else if (rect.bottom <= 0) {
          // Above the viewport: keep zooming out the further it travels, with
          // no floor other than a tiny safety value.
          const distance = -rect.bottom / vh;
          scale = Math.max(0.02, 1 / (1 + distance * 0.55));
        }
        // While any part of the element is visible it stays at normal size.

        el.style.setProperty("--section-scale", scale.toFixed(3));
      });
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(apply);
    };

    const measure = () => {
      sections = Array.from(
        document.querySelectorAll<HTMLElement>(".landing-navy [data-enter], .landing-navy [data-depth]")
      );
      schedule();
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    const bodyRO = new ResizeObserver(measure);
    bodyRO.observe(document.body);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      window.removeEventListener("load", measure);
      bodyRO.disconnect();
      sections.forEach((el) => el.style.removeProperty("--section-scale"));
    };
  }, []);

  return null;
}
