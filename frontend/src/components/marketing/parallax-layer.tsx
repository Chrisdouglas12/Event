"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ParallaxLayerProps = {
  /** How far the layer lags behind the scroll. 0 = normal, 0.4 = slow/far away. */
  speed?: number;
  className?: string;
  children: ReactNode;
};

export function ParallaxLayer({
  speed = 0.1,
  className,
  children,
}: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect users who turned off motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;

    const update = () => {
      raf = 0;
      // Stop the effect once the hero is well out of view
      const y = Math.min(window.scrollY, window.innerHeight * 1.5);
      el.style.transform = `translate3d(0, ${y * speed}px, 0)`;
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [speed]);

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
