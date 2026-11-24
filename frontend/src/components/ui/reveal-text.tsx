"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ElementType,
} from "react";
import type { InlineStyle } from "@/components/marketing/inline-style";
import { getLandingPerformance } from "@/lib/landing-performance";

type RevealTextProps = {
  text: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
  className?: string;
  /** Seconds to wait after the section enters the viewport. */
  delay?: number;
  /** Milliseconds per word; smaller values make a tighter stagger. */
  speed?: number;
};

type RevealMode = "plain" | "armed" | "visible";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Scroll-linked word reveal.
 *
 * The server always renders the final copy so crawlers, no-JS visitors and
 * reduced-motion users see everything. Capable clients wrap each word in a
 * clipped layer and let CSS stagger it into place once the element enters the
 * viewport. There is no per-character timer or shared rAF loop: the browser
 * composites the whole reveal, and it only plays once per mount.
 */
export function RevealText({
  text,
  as = "p",
  className = "",
  delay = 0,
  speed = 16,
}: RevealTextProps) {
  const ref = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<RevealMode>("plain");
  const words = text.trim().split(/\s+/).filter(Boolean);
  const gap = Math.max(22, Math.min(72, Math.round(speed * 3)));

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Lite/static tiers keep the copy plain; only the full WebGL tier gets the
    // extra reveal work.
    if (!getLandingPerformance().ambientMotion) {
      setMode("plain");
      return;
    }

    setMode("armed");
    let timer = 0;

    if (typeof IntersectionObserver === "undefined") {
      setMode("visible");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const reveal = () => setMode("visible");
        if (delay > 0) timer = window.setTimeout(reveal, delay * 1000);
        else reveal();
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.08 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (timer) window.clearTimeout(timer);
    };
  }, [delay, text]);

  const Tag = as as ElementType;

  if (mode === "plain") {
    return (
      <Tag ref={ref} className={className}>
        {text}
      </Tag>
    );
  }

  const style = {
    "--rt-gap": `${gap}ms`,
    "--rt-delay": `${Math.max(0, delay) * 1000}ms`,
  } as InlineStyle;

  return (
    <Tag
      ref={ref}
      className={`rt-text ${mode === "visible" ? "is-visible" : ""} ${className}`.trim()}
      style={style}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden className="rt-words">
        {words.map((word, index) => (
          <span
            key={`${index}-${word}`}
            className="rt-word"
            style={{ "--i": index } as InlineStyle}
          >
            <span className="rt-word-inner">{word}</span>
          </span>
        ))}
      </span>
    </Tag>
  );
}
