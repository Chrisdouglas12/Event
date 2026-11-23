"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ElementType,
} from "react";
import { getLandingPerformance } from "@/lib/landing-performance";

type RevealTextProps = {
  text: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
  className?: string;
  /** Seconds to wait after the section enters the viewport. */
  delay?: number;
  /** Milliseconds per character on capable devices. */
  speed?: number;
};

type Tick = (now: number) => void;

// One shared rAF loop drives every active instance instead of one timer per
// element. This keeps the typing effect cheap even on low-power hardware.
const subscribers = new Set<Tick>();
let tickerFrame = 0;

const runTicker = (now: number) => {
  tickerFrame = requestAnimationFrame(runTicker);
  subscribers.forEach((subscriber) => subscriber(now));
  if (!subscribers.size) {
    cancelAnimationFrame(tickerFrame);
    tickerFrame = 0;
  }
};

const subscribe = (subscriber: Tick) => {
  subscribers.add(subscriber);
  if (!tickerFrame) tickerFrame = requestAnimationFrame(runTicker);
  return () => {
    subscribers.delete(subscriber);
    if (!subscribers.size && tickerFrame) {
      cancelAnimationFrame(tickerFrame);
      tickerFrame = 0;
    }
  };
};

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const isHeading = (as: RevealTextProps["as"]) =>
  as === "h1" || as === "h2" || as === "h3" || as === "h4";

/**
 * Typewriter reveal. The hidden ghost keeps the final layout stable while the
 * visible copy is typed once the section scrolls into view.
 *
 * Full effect on capable devices. On low-power devices only headings type (and
 * much faster); static-tier copy renders immediately with no rAF loop.
 */
export function RevealText({
  text,
  as = "p",
  className = "",
  delay = 0,
  speed = 16,
}: RevealTextProps) {
  const ref = useRef<HTMLElement>(null);
  // Server markup is the final text: no-JS, crawlers and reduced-motion users
  // always see content. Capable clients switch to the typing structure in a
  // layout effect, i.e. before the first paint.
  const [typedCount, setTypedCount] = useState(text.length);
  const [done, setDone] = useState(true);
  const heading = isHeading(as);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const perf = getLandingPerformance();

    // Static tier (reduced motion / save-data / software WebGL) shows all copy
    // immediately. Lite tier only types headings, and does so much faster.
    if (!perf.ambientMotion || (perf.tier === "lite" && !heading)) {
      setTypedCount(text.length);
      setDone(true);
      return;
    }

    // Set up the ghost structure before paint so the text never flashes full.
    setTypedCount(0);
    setDone(false);
    const charTime = perf.tier === "lite" ? Math.max(4, speed * 0.35) : speed;
    let startTimer = 0;
    let unsubscribe = () => {};

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        startTimer = window.setTimeout(() => {
          let typed = 0;
          const startedAt = performance.now();
          unsubscribe = subscribe((now) => {
            const next = Math.min(text.length, Math.floor((now - startedAt) / charTime) + 1);
            if (next === typed) return;
            typed = next;
            setTypedCount(typed);
            if (typed >= text.length) {
              unsubscribe();
              setDone(true);
            }
          });
        }, Math.max(0, delay * 1000));
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (startTimer) window.clearTimeout(startTimer);
      unsubscribe();
    };
  }, [text, delay, speed, heading]);

  const Tag = as as ElementType;

  if (done) {
    return (
      <Tag ref={ref} className={className}>
        {text}
      </Tag>
    );
  }

  return (
    <Tag ref={ref} className={`typing-text ${className}`}>
      <span className="sr-only">{text}</span>
      <span className="typing-ghost" aria-hidden="true">
        {text}
      </span>
      <span className="typing-current" aria-hidden="true">
        {text.slice(0, typedCount)}
        <span className="typing-caret" />
      </span>
    </Tag>
  );
}
