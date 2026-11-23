"use client";

import { useEffect, useRef } from "react";

type FitTwoLinesProps = {
  text: string;
  /** Classes set the biggest size (e.g. text-[13px] sm:text-xl md:text-2xl) */
  className?: string;
  /** Smallest font size (px) it may shrink to */
  minFont?: number;
  /** Maximum number of lines (default 2) */
  lines?: number;
};

/**
 * Shows `text` in at most `lines` lines on every screen.
 *
 * It starts at the font size your classes give it and only shrinks (in 0.5px
 * steps) when the text would need more lines. It re-fits when the width
 * changes, when fonts finish loading and when the text changes (e.g. the theme
 * is edited in settings). As a last resort, line-clamp cuts it with "…" so it
 * can never grow past the limit.
 */
export function FitTwoLines({ text, className = "", minFont = 10, lines = 2 }: FitTwoLinesProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let lastWidth = -1;

    const fit = () => {
      el.style.fontSize = ""; // back to the class-based (maximum) size
      let size = parseFloat(getComputedStyle(el).fontSize) || 16;

      const tooBig = () => {
        const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || size * 1.3;
        const tooTall = el.scrollHeight > lineHeight * lines + 1;
        const tooWide = lines === 1 && el.scrollWidth > el.clientWidth + 1;
        return tooTall || tooWide;
      };

      while (size > minFont && tooBig()) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
    };

    fit();

    const ro = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      if (width !== lastWidth) {
        lastWidth = width;
        fit();
      }
    });
    ro.observe(el);

    document.fonts?.ready.then(fit);

    return () => ro.disconnect();
  }, [text, minFont, lines]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: lines,
        overflow: "hidden",
      }}
    >
      {text}
    </div>
  );
}
