"use client";

import { useEffect, useRef, useState } from "react";
import { CarFront } from "lucide-react";
import {
  useLandingProgress,
  type TraceNode,
} from "@/components/marketing/landing-progress";

function sameNodes(a: TraceNode[], b: TraceNode[]) {
  return (
    a.length === b.length &&
    a.every(
      (node, i) =>
        node.id === b[i].id &&
        node.label === b[i].label &&
        node.progress === b[i].progress &&
        node.scene === b[i].scene
    )
  );
}

const mobilePos = (progress: number) =>
  `calc(8px + (100% - 16px) * ${progress.toFixed(5)})`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Interactive journey tracker.
 * - Drag the car (desktop vertical / mobile horizontal) to scrub the page
 * - Tap / click any waypoint dot to jump to that section
 * - Still follows scroll automatically when you are not dragging
 */
export function ScrollTrace() {
  const { subscribe } = useLandingProgress();
  const [nodes, setNodes] = useState<TraceNode[]>([]);
  const [activeLabel, setActiveLabel] = useState("Hero");
  const nodesRef = useRef<TraceNode[]>([]);
  const activeRef = useRef("Hero");

  const carRef = useRef<HTMLDivElement>(null);
  const mobileCarRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const mobileTrailRef = useRef<HTMLDivElement>(null);
  const mobileLabelRef = useRef<HTMLSpanElement>(null);

  // Track / rail refs for drag math
  const desktopRailRef = useRef<HTMLDivElement>(null);
  const mobileRailRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<"desktop" | "mobile" | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // ---- Scroll helpers ----
  const scrollToProgress = (progress: number) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    window.scrollTo({ top: progress * max, behavior: "auto" });
  };

  const scrollToNode = (node: TraceNode) => {
    // Try to find real section first — more accurate than progress math
    const el =
      document.getElementById(node.id) ||
      document.querySelector(`[data-scene="${node.scene}"]`) ||
      document.querySelector(`[data-trace="${node.id}"]`);

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: node.progress * max, behavior: "smooth" });
    }
  };

  // ---- Drag handlers ----
  const handleDesktopPointerMove = (e: PointerEvent) => {
    if (draggingRef.current !== "desktop" || !desktopRailRef.current) return;
    const rect = desktopRailRef.current.getBoundingClientRect();
    const p = clamp01((e.clientY - rect.top) / rect.height);
    scrollToProgress(p);
  };

  const handleMobilePointerMove = (e: PointerEvent) => {
    if (draggingRef.current !== "mobile" || !mobileRailRef.current) return;
    const rect = mobileRailRef.current.getBoundingClientRect();
    const p = clamp01((e.clientX - rect.left) / rect.width);
    scrollToProgress(p);
  };

  const stopDragging = () => {
    if (draggingRef.current) {
      draggingRef.current = null;
      setIsDragging(false);
      document.body.style.cursor = "";
    }
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (draggingRef.current === "desktop") handleDesktopPointerMove(e);
      if (draggingRef.current === "mobile") handleMobilePointerMove(e);
    };
    const onUp = () => stopDragging();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () =>
      subscribe((snapshot) => {
        const percent = `${(snapshot.progress * 100).toFixed(3)}%`;

        if (carRef.current) carRef.current.style.top = percent;
        if (trailRef.current) trailRef.current.style.height = percent;
        if (mobileTrailRef.current) mobileTrailRef.current.style.width = percent;
        if (mobileCarRef.current) {
          mobileCarRef.current.style.left = mobilePos(snapshot.progress);
        }
        if (mobileLabelRef.current) {
          mobileLabelRef.current.textContent = snapshot.activeLabel;
        }

        if (snapshot.activeLabel !== activeRef.current) {
          activeRef.current = snapshot.activeLabel;
          setActiveLabel(snapshot.activeLabel);
        }

        if (!sameNodes(nodesRef.current, snapshot.nodes)) {
          nodesRef.current = snapshot.nodes;
          setNodes(snapshot.nodes);
        }
      }),
    [subscribe]
  );

  return (
    <>
      {/* Desktop journey rail */}
      <aside
        aria-label="Page journey tracker - drag car or tap a stop"
        className="fixed bottom-6 left-0 top-[72px] z-[40] hidden w-10 lg:block"
      >
        <div className="relative h-full">
          {/* Rail - clickable anywhere to jump */}
          <div
            ref={desktopRailRef}
            onPointerDown={(e) => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const p = clamp01((e.clientY - rect.top) / rect.height);
              scrollToProgress(p);
            }}
            className="absolute inset-y-5 left-[18px] w-6 -translate-x-1/2 cursor-pointer touch-none"
          >
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/10">
              <div
                ref={trailRef}
                className="trace-trail absolute inset-x-0 top-0 w-full"
                style={{ height: "0%" }}
              />
            </div>

            {/* Waypoint dots - TAP TO JUMP */}
            {nodes.map((node) => {
              const active = node.label === activeLabel;
              return (
                <button
                  key={node.id}
                  type="button"
                  title={`Go to ${node.label}`}
                  aria-label={`Go to ${node.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToNode(node);
                  }}
                  className={`trace-node group absolute left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer ${
                    active ? "is-active" : ""
                  }`}
                  style={{ top: `${node.progress * 100}%` }}
                >
                  <span className="trace-connector" />
                  <span className="trace-node-dot block h-3 w-3 rounded-full border border-[#8EE3D6]/70 bg-[#07101E] shadow-[0_0_12px_rgba(142,227,214,0.45)] transition group-hover:scale-125 group-active:scale-150" />
                  <span className="trace-node-label whitespace-nowrap">
                    {node.label}
                  </span>
                </button>
              );
            })}

            {/* DRAGGABLE CAR */}
            <div
              ref={carRef}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                draggingRef.current = "desktop";
                setIsDragging(true);
                document.body.style.cursor = "grabbing";
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              }}
              className={`trace-car absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 touch-none select-none ${
                isDragging ? "cursor-grabbing scale-110" : "cursor-grab"
              }`}
              style={{ top: "0%" }}
            >
              <span className="trace-car-glow absolute inset-[-10px] rounded-full" />
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[#8EE3D6]/70 bg-[#0E1020] text-[#8EE3D6] shadow-[0_0_26px_rgba(142,227,214,0.55)] active:scale-110">
                <CarFront className="h-4 w-4" strokeWidth={1.8} />
              </span>
              {/* Hint */}
              <span className="pointer-events-none absolute left-full top-1/2 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/70 opacity-0 transition group-hover:opacity-100 lg:block">
                Drag me
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile/tablet progress trace */}
      <div
        aria-label="Page journey tracker - drag car or tap a stop"
        className="fixed inset-x-0 top-[60px] z-[40] h-10 lg:hidden"
      >
        <div
          ref={mobileRailRef}
          onPointerDown={(e) => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const p = clamp01((e.clientX - rect.left) / rect.width);
            scrollToProgress(p);
          }}
          className="absolute inset-x-0 top-3 h-6 cursor-pointer touch-none"
        >
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/15">
            <div
              ref={mobileTrailRef}
              className="trace-trail h-full bg-[#8EE3D6]"
              style={{ width: "0%" }}
            />
          </div>

          {nodes.map((node) => (
            <button
              key={`mobile-${node.id}`}
              type="button"
              title={`Go to ${node.label}`}
              aria-label={`Go to ${node.label}`}
              onClick={(e) => {
                e.stopPropagation();
                scrollToNode(node);
              }}
              className={`trace-mobile-node absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border border-[#8EE3D6]/70 bg-[#07101E] ${
                node.label === activeLabel ? "is-active scale-125" : ""
              }`}
              style={{ left: mobilePos(node.progress) }}
            />
          ))}
        </div>

        {/* DRAGGABLE CAR - MOBILE */}
        <div
          ref={mobileCarRef}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            draggingRef.current = "mobile";
            setIsDragging(true);
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          className={`trace-car-mobile absolute top-[1px] left-0 -translate-x-1/2 touch-none select-none ${
            isDragging ? "cursor-grabbing scale-110" : "cursor-grab"
          }`}
          style={{ left: mobilePos(0) }}
        >
          <span className="relative flex h-6 w-6 items-center justify-center rounded-full border border-[#8EE3D6]/70 bg-[#0E1020] text-[#8EE3D6] shadow-[0_0_16px_rgba(142,227,214,0.5)]">
            <CarFront className="h-3 w-3" strokeWidth={2} />
          </span>
        </div>

        <span
          ref={mobileLabelRef}
          className="trace-mobile-label pointer-events-none absolute right-3 top-[22px]"
        >
          Hero
        </span>
      </div>
    </>
  );
}