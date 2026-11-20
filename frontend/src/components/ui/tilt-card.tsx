"use client";

import { useEffect, useRef, type ReactNode } from "react";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  /** Maximum rotation in degrees. */
  intensity?: number;
};

/**
 * Subtle pointer-driven 3D tilt for landing-page cards. The transform is
 * applied directly to the DOM node so pointer movement never triggers React
 * renders. Reduced-motion users get the static card.
 */
export function TiltCard({ children, className = "", intensity = 6 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;

    const render = () => {
      frame = 0;
      el.style.transform = `rotateX(${targetX.toFixed(2)}deg) rotateY(${targetY.toFixed(2)}deg) translateZ(0)`;
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      targetX = -py * intensity;
      targetY = px * intensity;
      schedule();
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      schedule();
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [intensity]);

  return (
    <div ref={ref} className={`depth-card ${className}`} style={{ transition: "transform 220ms ease-out" }}>
      {children}
    </div>
  );
}
