/**
 * Shared capability check for the landing experience.
 *
 * The rich version uses several persistent WebGL layers plus scroll/pointer
 * effects. Constrained devices drop the extra journey/splash canvases, but the
 * signature globe and clock always render at full visual quality. Only a
 * browser with no WebGL context at all falls back to static posters.
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
  maxDpr: 2,
  fps: 60,
  density: 1,
};

const LITE: LandingPerformance = {
  tier: "lite",
  webgl: true,
  journeyWebgl: false,
  // The globe and clock are the signature visuals, so they keep the same
  // sharpness and frame rate here. Only the extra ambient layers are dropped.
  heroWebgl: true,
  clockWebgl: true,
  splashWebgl: false,
  ambientMotion: false,
  parallax: false,
  pointerEffects: false,
  maxDpr: 2,
  fps: 60,
  density: 1,
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

type WebglProbe = { available: boolean; software: boolean };

let probeCache: WebglProbe | null = null;

/**
 * A plain context check is deliberate. Asking for
 * `failIfMajorPerformanceCaveat` rejects integrated/software GPUs even though
 * the reduced-quality scene runs fine on them.
 */
function probeWebgl(): WebglProbe {
  if (probeCache) return probeCache;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return (probeCache = { available: false, software: false });

    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = debug
      ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))
      : "";
    const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);

    const lose = gl.getExtension("WEBGL_lose_context");
    lose?.loseContext();
    return (probeCache = { available: true, software });
  } catch {
    return (probeCache = { available: false, software: false });
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
  const webgl = probeWebgl();

  let tier: LandingTier;
  if (!webgl.available) {
    tier = "static";
  } else if (
    reduce ||
    saveData ||
    slowNetwork ||
    coarse ||
    webgl.software ||
    cores <= 4 ||
    memory <= 4 ||
    window.innerWidth < 768
  ) {
    tier = "lite";
  } else {
    tier = "full";
  }

  cached = tier === "full" ? FULL : tier === "lite" ? LITE : STATIC;
  return cached;
}

/** True once the splash overlay has handed control back to the landing page. */
export function isLandingIntroDone(): boolean {
  if (typeof document === "undefined") return true;
  return (
    document.documentElement.dataset.intro === "done" ||
    new URLSearchParams(window.location.search).has("skipIntro")
  );
}

/**
 * WebGL scenes preload and build during the intro, then hold their first frame
 * until it finishes. The timeout is a safety net if the intro is interrupted
 * or disabled.
 */
export function whenLandingIntroDone(): Promise<void> {
  if (typeof window === "undefined" || isLandingIntroDone()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    let timer = 0;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener("ihgc:intro-complete", finish);
      resolve();
    };
    timer = window.setTimeout(finish, 4200);
    window.addEventListener("ihgc:intro-complete", finish, { once: true });
  });
}
