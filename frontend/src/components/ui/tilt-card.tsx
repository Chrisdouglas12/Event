"use client";

import { useEffect, useRef, type ReactNode } from "react";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  /** Maximum rotation in degrees. */
  intensity?: number;
};

/**
 * Subtle pointer-driven 3D tilt. The rect is measured once per hover, and the
 * transform is eased on rAF straight to the DOM node — no React renders, no
 * CSS transition restarting on every pointer move, and no touch-device work.
 */
export function TiltCard({ children, className = "", intensity = 6 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Sections inside the joined panel use 0 intensity: skip listeners entirely.
    if (intensity <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;

    let frame = 0;
    let rect: DOMRect | null = null;
    let hovering = false;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const tick = () => {
      currentX += (targetX - currentX) * 0.14;
      currentY += (targetY - currentY) * 0.14;
      el.style.transform = `rotateX(${currentX.toFixed(2)}deg) rotateY(${currentY.toFixed(2)}deg) translateZ(0)`;

      if (Math.abs(targetX - currentX) > 0.01 || Math.abs(targetY - currentY) > 0.01) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
        if (!hovering) el.style.willChange = "";
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onEnter = () => {
      hovering = true;
      rect = el.getBoundingClientRect();
      el.style.willChange = "transform";
      schedule();
    };

    const onMove = (event: PointerEvent) => {
      if (!rect) rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      targetX = -py * intensity;
      targetY = px * intensity;
      schedule();
    };

    const onLeave = () => {
      hovering = false;
      rect = null;
      targetX = 0;
      targetY = 0;
      schedule();
    };

    const invalidateRect = () => {
      rect = null;
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", invalidateRect, { passive: true });

    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", invalidateRect);
      if (frame) cancelAnimationFrame(frame);
      el.style.transform = "";
      el.style.willChange = "";
    };
  }, [intensity]);

  return (
    <div ref={ref} className={`depth-card ${className}`}>
      {children}
    </div>
  );
}
