import type { ReactNode } from "react";

type ParallaxProps = {
  children: ReactNode;
  /** Parallax intensity: 0.1 subtle, 0.3 moderate, 0.5 strong */
  speed?: number;
  className?: string;
};

/**
 * Lightweight parallax layer. The drift is a CSS view-timeline animation on
 * `transform`, so scrolling never runs JavaScript or forces layout. Browsers
 * without view-timeline support render a completely static layer.
 */
export function Parallax({ children, speed = 0.28, className = "" }: ParallaxProps) {
  const strength =
    speed <= 0.18 ? "parallax-subtle" : speed <= 0.3 ? "parallax-moderate" : "parallax-strong";

  return (
    <div className={`parallax-soft ${strength} ${className}`.trim()}>
      {children}
    </div>
  );
}
