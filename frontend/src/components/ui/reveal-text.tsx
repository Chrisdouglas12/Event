"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type RevealTextProps = {
  text: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
  className?: string;
  /** Seconds to wait after the section enters the viewport. */
  delay?: number;
  /** Kept for backwards compatibility with the previous word-reveal call sites. */
  stagger?: number;
  /** Milliseconds per character. */
  speed?: number;
  start?: string;
};

/**
 * Typewriter reveal. Text keeps its final layout via a hidden ghost node while
 * the visible copy is typed when the section scrolls into view.
 */
export function RevealText({
  text,
  as = "p",
  className = "",
  delay = 0,
  speed = 16,
  start = "top 88%",
}: RevealTextProps) {
  const ref = useRef<HTMLElement>(null);
  const [typedCount, setTypedCount] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    setTypedCount(0);
    setTyping(false);

    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTypedCount(text.length);
      return;
    }

    let startTimer = 0;
    const trigger = ScrollTrigger.create({
      trigger: el,
      start,
      once: true,
      onEnter: () => {
        startTimer = window.setTimeout(() => setTyping(true), Math.max(0, delay * 1000));
      },
    });

    return () => {
      if (startTimer) window.clearTimeout(startTimer);
      trigger.kill();
    };
  }, [text, start, delay]);

  useEffect(() => {
    if (!typing || typedCount >= text.length) return;
    const timer = window.setTimeout(() => {
      setTypedCount((count) => Math.min(text.length, count + 1));
    }, speed);
    return () => window.clearTimeout(timer);
  }, [typing, typedCount, text.length, speed]);

  const Tag = as as ElementType;
  const visibleText = text.slice(0, typedCount);

  return (
    <Tag ref={ref} className={`typing-text ${className}`}>
      <span className="sr-only">{text}</span>
      <span className="typing-ghost" aria-hidden="true">
        {text}
      </span>
      <span className="typing-current" aria-hidden="true">
        {visibleText}
        {typedCount < text.length && <span className="typing-caret" />}
      </span>
    </Tag>
  );
}
