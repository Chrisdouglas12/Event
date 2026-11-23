/**
 * Shared capability check for the landing experience.
 *
 * The rich version uses several persistent WebGL layers plus scroll/pointer
 * effects. Low-power devices and reduced-motion visitors get the same content
 * and the flat 2D journey trace, but with static posters instead of extra
 * canvases and no per-component scroll listeners.
 *
 * The result is cached because probing WebGL creates a throwaway context.
 */

export type LandingTier = "full" | "lite" | "static";

export type LandingPerformance = {
  tier: LandingTier;
  /** Master switch for WebGL layers. */
  webgl: boolean;
  journeyWebgl: boolean;
  heroWebgl: boolean;
  clockWebgl: boolean;
  splashWebgl: boolean;
  /** Scroll-linked CSS variables and chip/CTA motion. */
  ambientMotion: boolean;
  parallax: boolean;
  pointerEffects: boolean;
  maxDpr: number;
  fps: number;
  /** Star/vehicle density multiplier for scenes that still render. */
  density: number;
};

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

let cached: LandingPerformance | null = null;

const FULL: LandingPerformance = {
  tier: "full",
  webgl: true,
  journeyWebgl: true,
  heroWebgl: true,
  clockWebgl: true,
  splashWebgl: true,
  ambientMotion: true,
  parallax: true,
  pointerEffects: true,
  maxDpr: 1.5,
  fps: 30,
  density: 1,
};

const LITE: LandingPerformance = {
  tier: "lite",
  webgl: true,
  journeyWebgl: false,
  // Keep the globe (and its flag belts) on lite devices: it is the hero's
  // signature visual and is now capped to 24fps at 1x DPR.
  heroWebgl: true,
  clockWebgl: true,
  splashWebgl: false,
  ambientMotion: false,
  parallax: false,
  pointerEffects: false,
  maxDpr: 1,
  fps: 24,
  density: 0.5,
};

const STATIC: LandingPerformance = {
  tier: "static",
  webgl: false,
  journeyWebgl: false,
  heroWebgl: false,
  clockWebgl: false,
  splashWebgl: false,
  ambientMotion: false,
  parallax: false,
  pointerEffects: false,
  maxDpr: 1,
  fps: 0,
  density: 0.25,
};

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) ||
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;

    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = debug
      ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))
      : "";
    const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);

    const lose = gl.getExtension("WEBGL_lose_context");
    lose?.loseContext();
    return !software;
  } catch {
    return false;
  }
}

export function getLandingPerformance(): LandingPerformance {
  if (cached) return cached;
  if (typeof window === "undefined") return FULL;

  const nav = navigator as NavigatorWithHints;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const saveData = nav.connection?.saveData === true;
  const slowNetwork = nav.connection?.effectiveType === "slow-2g" || nav.connection?.effectiveType === "2g";
  const cores = nav.hardwareConcurrency || 8;
  const memory = nav.deviceMemory || 8;

  let tier: LandingTier;
  if (reduce || saveData || slowNetwork || !webglAvailable()) {
    tier = "static";
  } else if (coarse || cores <= 4 || memory <= 4 || window.innerWidth < 768) {
    tier = "lite";
  } else {
    tier = "full";
  }

  cached = tier === "full" ? FULL : tier === "lite" ? LITE : STATIC;
  return cached;
}
