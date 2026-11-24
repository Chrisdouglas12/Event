"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { getLandingPerformance } from "@/lib/landing-performance";

type LandingScrollTarget = number | string | Element;

type LandingScrollOptions = {
  offset?: number;
  immediate?: boolean;
  duration?: number;
  lock?: boolean;
  force?: boolean;
};

let activeLenis: Lenis | null = null;

/**
 * Route programmatic scrolls through Lenis while it is mounted so the journey
 * rail and anchor jumps share the same inertia as the wheel. Falls back to the
 * native APIs on reduced-motion / low-tier devices where Lenis is not running.
 */
export function scrollLandingTo(
  target: LandingScrollTarget,
  options: LandingScrollOptions = {}
) {
  if (activeLenis) {
    activeLenis.scrollTo(target, options);
    return;
  }

  const behavior: ScrollBehavior = options.immediate ? "auto" : "smooth";

  if (typeof target === "number") {
    window.scrollTo({ top: target, behavior });
    return;
  }

  const element =
    typeof target === "string" ? document.querySelector(target) : target;
  element?.scrollIntoView({ behavior, block: "start" });
}

/**
 * Adds damped wheel inertia to the landing page only. Touch devices already
 * have native momentum, so syncTouch stays off; static/reduced-motion visitors
 * keep the browser's default scrolling entirely.
 */
export function SmoothScroll() {
  useEffect(() => {
    const perf = getLandingPerformance();
    if (!perf.ambientMotion) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.9,
      autoRaf: true,
      anchors: { offset: -72 },
      prevent: (node) => Boolean(node.closest("[data-lenis-prevent]")),
    });

    activeLenis = lenis;

    return () => {
      if (activeLenis === lenis) activeLenis = null;
      lenis.destroy();
    };
  }, []);

  return null;
}
