"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { getLandingPerformance } from "@/lib/landing-performance";

type ParallaxLayerProps = {
  /** How far the layer lags behind the scroll. 0 = normal, 0.4 = slow/far away. */
  speed?: number;
  className?: string;
  children: ReactNode;
};

/**
 * Subtle scroll parallax for small screens only.
 * Desktop (lg+) deliberately renders a plain, static layer so scrolling stays
 * fast and there is no scroll-linked transform work on the main thread.
 */
export function ParallaxLayer({
  speed = 0.1,
  className,
  children,
}: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const perf = getLandingPerformance();
    if (!perf.parallax) return;

    const desktop = window.matchMedia("(min-width: 1024px)");
    let raf = 0;

    const clear = () => {
      el.style.transform = "";
      el.style.willChange = "";
    };

    const update = () => {
      raf = 0;
      if (desktop.matches) {
        clear();
        return;
      }
      // Stop the effect once the hero is well out of view.
      const y = Math.min(window.scrollY, window.innerHeight * 1.5);
      el.style.willChange = "transform";
      el.style.transform = `translate3d(0, ${y * speed}px, 0)`;
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    const onModeChange = () => {
      if (raf) cancelAnimationFrame(raf);
      update();
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    desktop.addEventListener("change", onModeChange);

    return () => {
      window.removeEventListener("scroll", onScroll);
      desktop.removeEventListener("change", onModeChange);
      if (raf) cancelAnimationFrame(raf);
      clear();
    };
  }, [speed]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
