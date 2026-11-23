"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Move3d } from "lucide-react";
import { journeyControls } from "@/components/marketing/journey-controls";
import {
  useOptionalLandingProgress,
  type LandingProgressSnapshot,
} from "@/components/marketing/landing-progress";
import { getLandingPerformance } from "@/lib/landing-performance";

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  yaw: number;
  pitch: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const degrees = (value: number) => `${Math.round(value * 45)}°`;

/**
 * Small edge grip that lets the visitor orbit the WebGL journey filament.
 *
 * It never renders scroll state: progress is written straight to the HUD DOM,
 * and the yaw/pitch live in journeyControls so LandingDepth can read them once
 * per frame. The optional progress provider keeps this usable in the SPA,
 * where no LandingProgressProvider is mounted.
 */
export function JourneyHandle() {
  const progressApi = useOptionalLandingProgress();

  const hostRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const sceneRef = useRef<HTMLSpanElement>(null);
  const meterRef = useRef<HTMLSpanElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    // The grip only controls the WebGL filament. On low-power tiers CSS hides
    // it and the flat trace handles progress instead.
    if (!getLandingPerformance().journeyWebgl) return;

    const apply = (snapshot: LandingProgressSnapshot) => {
      if (meterRef.current) {
        meterRef.current.style.transform = `scaleX(${snapshot.progress.toFixed(5)})`;
      }
      if (labelRef.current) labelRef.current.textContent = snapshot.activeLabel;
      if (sceneRef.current) sceneRef.current.textContent = snapshot.activeScene;
    };

    if (progressApi) return progressApi.subscribe(apply);

    // SPA fallback: one rAF-throttled scroll listener, no React re-renders.
    let frame = 0;
    const measure = () => {
      frame = 0;
      const doc = document.documentElement;
      const viewport = window.innerHeight || 1;
      const maxScroll = Math.max(1, doc.scrollHeight - viewport);
      const scrollY = Math.max(0, window.scrollY || doc.scrollTop || 0);
      const marker = scrollY + viewport * 0.42;

      let activeLabel = "Hero";
      let activeScene = "hero";
      const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-trace-node]"))
        .map((element) => ({
          element,
          top: element.getBoundingClientRect().top + scrollY,
        }))
        .sort((a, b) => a.top - b.top);

      nodes.forEach(({ element, top }) => {
        if (top > marker) return;
        activeLabel = element.dataset.traceLabel || "Waypoint";
        activeScene = element.dataset.scene || "road";
      });

      apply({
        progress: clamp01(scrollY / maxScroll),
        scrollY,
        viewport,
        docHeight: maxScroll + viewport,
        activeScene,
        activeLabel,
        nodes: [],
      });
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("load", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("load", schedule);
    };
  }, [progressApi]);

  useEffect(() => {
    const sync = () => {
      const { yaw, pitch, dragging } = journeyControls.get();
      if (readoutRef.current) {
        readoutRef.current.textContent = `${degrees(yaw)} / ${degrees(pitch)}`;
      }
      if (hostRef.current) {
        hostRef.current.dataset.dragging = String(dragging);
      }
    };

    sync();
    return journeyControls.subscribe(sync);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();

    const current = journeyControls.get();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      yaw: current.yaw,
      pitch: current.pitch,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    journeyControls.setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const yawRange = Math.min(320, Math.max(160, window.innerWidth * 0.45));
    const pitchRange = Math.min(280, Math.max(140, window.innerHeight * 0.45));

    journeyControls.setYawPitch(
      drag.yaw + (event.clientX - drag.startX) / yawRange,
      drag.pitch - (event.clientY - drag.startY) / pitchRange
    );
  };

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    journeyControls.setDragging(false);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 0.2 : 0.08;
    switch (event.key) {
      case "ArrowLeft":
        journeyControls.nudge(-step, 0);
        break;
      case "ArrowRight":
        journeyControls.nudge(step, 0);
        break;
      case "ArrowUp":
        journeyControls.nudge(0, step);
        break;
      case "ArrowDown":
        journeyControls.nudge(0, -step);
        break;
      case "Home":
        journeyControls.reset();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div ref={hostRef} className="journey-handle" data-dragging="false">
      <div className="journey-handle__panel" aria-hidden="true">
        <span className="journey-handle__eyebrow">Journey view</span>
        <span ref={labelRef} className="journey-handle__label">
          Hero
        </span>
        <span ref={sceneRef} className="journey-handle__scene">
          hero
        </span>
        <span className="journey-handle__meter">
          <span ref={meterRef} />
        </span>
        <span ref={readoutRef} className="journey-handle__readout">
          0° / 0°
        </span>
      </div>

      <button
        type="button"
        className="journey-handle__grip"
        aria-label="Drag to orbit the 3D journey. Use arrow keys to orbit, Home to reset."
        title="Drag to orbit the journey"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={onKeyDown}
        onDoubleClick={() => journeyControls.reset()}
      >
        <Move3d className="h-4 w-4" strokeWidth={1.8} aria-hidden />
      </button>

      <span className="journey-handle__hint" aria-hidden="true">
        Drag to orbit
      </span>
    </div>
  );
}
