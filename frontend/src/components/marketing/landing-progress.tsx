"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

export type TraceNode = {
  id: string;
  label: string;
  scene: string;
  /** Document-space Y of the waypoint. */
  top: number;
  /** 0..1 position of the waypoint in the page. */
  progress: number;
};

export type LandingProgressSnapshot = {
  progress: number;
  scrollY: number;
  viewport: number;
  docHeight: number;
  activeScene: string;
  activeLabel: string;
  nodes: TraceNode[];
};

type Subscriber = (snapshot: LandingProgressSnapshot) => void;

type LandingProgressApi = {
  get: () => LandingProgressSnapshot;
  subscribe: (subscriber: Subscriber) => () => void;
};

const EMPTY: LandingProgressSnapshot = {
  progress: 0,
  scrollY: 0,
  viewport: 1,
  docHeight: 1,
  activeScene: "hero",
  activeLabel: "Hero",
  nodes: [],
};

const LandingProgressContext = createContext<LandingProgressApi | null>(null);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * One scroll listener for the whole landing page.
 *
 * Consumers subscribe instead of adding their own scroll handlers. The current
 * snapshot is also published as CSS custom properties on <html>, so purely
 * decorative motion can stay in CSS without any React re-renders.
 */
export function LandingProgressProvider({ children }: { children: ReactNode }) {
  const snapshot = useRef<LandingProgressSnapshot>(EMPTY);
  const subscribers = useRef(new Set<Subscriber>());
  const frame = useRef(0);

  const measure = useCallback(() => {
    const doc = document.documentElement;
    const viewport = window.innerHeight || 1;
    const docHeight = doc.scrollHeight || viewport;
    const maxScroll = Math.max(1, docHeight - viewport);
    const scrollY = Math.max(0, window.scrollY || doc.scrollTop || 0);
    const progress = clamp(scrollY / maxScroll, 0, 1);

    const nodes: TraceNode[] = [];
    document.querySelectorAll<HTMLElement>("[data-trace-node]").forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      const top = rect.top + scrollY;
      nodes.push({
        id: el.dataset.traceId || `waypoint-${index}`,
        label: el.dataset.traceLabel || "Waypoint",
        scene: el.dataset.scene || "road",
        top,
        progress: clamp(top / maxScroll, 0, 1),
      });
    });
    nodes.sort((a, b) => a.top - b.top);

    // The "active" waypoint is the last one the reader has passed, using a
    // marker slightly below the top of the viewport so it changes while the
    // section is actually on screen.
    const marker = scrollY + viewport * 0.42;
    let active = nodes[0];
    for (const node of nodes) {
      if (node.top <= marker) active = node;
      else break;
    }

    snapshot.current = {
      progress,
      scrollY,
      viewport,
      docHeight,
      activeScene: active?.scene ?? "hero",
      activeLabel: active?.label ?? "Hero",
      nodes,
    };

    doc.style.setProperty("--landing-progress", progress.toFixed(5));
    doc.style.setProperty("--landing-scroll-y", `${Math.round(scrollY)}px`);

    subscribers.current.forEach((subscriber) => subscriber(snapshot.current));
  }, []);

  const schedule = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      measure();
    });
  }, [measure]);

  const subscribe = useCallback((subscriber: Subscriber) => {
    subscribers.current.add(subscriber);
    subscriber(snapshot.current);
    return () => {
      subscribers.current.delete(subscriber);
    };
  }, []);

  useEffect(() => {
    measure();

    const onScroll = () => schedule();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    observer?.observe(document.body);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [measure, schedule]);

  const api = useMemo<LandingProgressApi>(
    () => ({ get: () => snapshot.current, subscribe }),
    [subscribe]
  );

  return (
    <LandingProgressContext.Provider value={api}>
      {children}
    </LandingProgressContext.Provider>
  );
}

export function useLandingProgress(): LandingProgressApi {
  const api = useContext(LandingProgressContext);
  if (!api) {
    throw new Error(
      "useLandingProgress must be used inside <LandingProgressProvider>"
    );
  }
  return api;
}

/** Subscribe without re-rendering on every scroll frame. */
export function useLandingProgressSubscription(callback: Subscriber) {
  const api = useLandingProgress();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(
    () => api.subscribe((snapshot) => callbackRef.current(snapshot)),
    [api]
  );
}
