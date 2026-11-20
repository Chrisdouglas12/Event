"use client";

import { useEffect, useRef, type ElementType } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type RevealTextProps = {
  text: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
  className?: string;
  delay?: number;
  stagger?: number;
  start?: string;
};

/**
 * Word-by-word scroll reveal. Words begin below their clipping mask, blurred,
 * and rise into place as the section approaches the viewport.
 */
export function RevealText({
  text,
  as = "p",
  className = "",
  delay = 0,
  stagger = 0.035,
  start = "top 88%",
}: RevealTextProps) {
  const ref = useRef<HTMLElement>(null);
  const words = text.split(/\s+/);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const words = el.querySelectorAll<HTMLElement>("[data-reveal-word]");
    const ctx = gsap.context(() => {
      gsap.fromTo(
        words,
        {
          yPercent: 115,
          opacity: 0,
          rotateX: -38,
          filter: "blur(8px)",
        },
        {
          yPercent: 0,
          opacity: 1,
          rotateX: 0,
          filter: "blur(0px)",
          duration: 0.9,
          delay,
          ease: "power3.out",
          stagger,
          scrollTrigger: {
            trigger: el,
            start,
            toggleActions: "play none none reverse",
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [delay, stagger, start]);

  const Tag = as as ElementType;

  return (
    <Tag ref={ref} className={`reveal-text ${className}`}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="reveal-word-mask">
          <span data-reveal-word className="reveal-word">
            {word}
            {index < words.length - 1 ? "\u00a0" : ""}
          </span>
        </span>
      ))}
    </Tag>
  );
}
