/**
 * Single source of truth for the landing experience.
 *
 * Every marketing surface (intro, globe, countdown, scroll trace, cards and
 * dividers) reads from this file so the palette, motion and layering stay in
 * sync. Values are also mirrored as CSS custom properties in globals.css.
 */
export const LANDING_THEME = {
  colors: {
    mint: "#8EE3D6",
    mintHover: "#7BD4C7",
    mintDeep: "#0E7A6E",
    mintLight: "#EAF9F7",
    mintBorder: "#CDEFEA",
    navy: "#0E1020",
    navyDeep: "#07101E",
    navyCard: "#121528",
    graphite: "#2B2F37",
    ink: "#111320",
    paper: "#F7FBFA",
  },
  motion: {
    /** Hard ceiling only; the intro normally exits when its animation ends. */
    introTotal: 2600,
    /** Cinematic pass from deep space into the hero globe. */
    introFlyIn: 1700,
    /** Final gentle dolly after the globe arrives. */
    introSettle: 500,
    /** Welcome brand lockup fades in immediately; WebGL never gates it. */
    introWelcomeAt: 140,
    /** Start dissolving as the globe arrives, not after a fixed delay. */
    introFadeAt: 1700,
    /** Dissolve length; the page is released before this finishes. */
    introDissolve: 520,
    /** Shared render ceiling for the heavier WebGL layers. */
    webglFps: 30,
  },
  zIndex: {
    backdrop: 0,
    starfield: 1,
    travel: 2,
    content: 10,
    trace: 40,
    header: 50,
    intro: 9999,
  },
  copy: {
    welcome: "Welcome to IHGC 2026",
    welcomeSub: "International Holiness General Conference",
    traceLabel: "THE JOURNEY",
  },
} as const;

export type LandingTheme = typeof LANDING_THEME;
