"use client";

import { useEffect, useRef, useState } from "react";
import { CarFront, MapPin } from "lucide-react";
import {
  useLandingProgress,
  type TraceNode,
} from "@/components/marketing/landing-progress";
import { LANDING_THEME } from "@/config/landing-theme";

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

/**
 * A single, continuous journey spine through the whole landing page.
 *
 * Desktop: a glowing route rail with a car that follows scroll progress and
 * lights up each section waypoint.
 * Mobile: the same idea compressed into a progress line under the header.
 *
 * It is pointer-events-none and driven by the shared LandingProgressProvider,
 * so it adds no competing scroll listener and never blocks interaction.
 */
export function ScrollTrace() {
  const { subscribe } = useLandingProgress();
  const [nodes, setNodes] = useState<TraceNode[]>([]);
  const nodesRef = useRef<TraceNode[]>([]);

  const carRef = useRef<HTMLDivElement>(null);
  const mobileCarRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const mobileTrailRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const sceneRef = useRef<HTMLSpanElement>(null);

  useEffect(
    () =>
      subscribe((snapshot) => {
        const percent = `${(snapshot.progress * 100).toFixed(3)}%`;

        if (carRef.current) carRef.current.style.top = percent;
        if (trailRef.current) trailRef.current.style.height = percent;
        if (mobileTrailRef.current) mobileTrailRef.current.style.width = percent;
        if (mobileCarRef.current) {
          mobileCarRef.current.style.left = `calc(12px + (100% - 24px) * ${snapshot.progress.toFixed(5)})`;
        }
        if (labelRef.current) labelRef.current.textContent = snapshot.activeLabel;
        if (sceneRef.current) sceneRef.current.textContent = snapshot.activeScene;

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
        aria-hidden
        className="pointer-events-none fixed bottom-6 left-3 top-[72px] z-[40] hidden w-[190px] xl:block"
      >
        <div className="relative h-full">
          <div className="absolute inset-y-5 left-[18px] w-px overflow-hidden bg-white/10">
            <div
              ref={trailRef}
              className="trace-trail absolute inset-x-0 top-0 w-full"
              style={{ height: "0%" }}
            />

            {nodes.map((node) => (
              <div
                key={node.id}
                className="trace-node absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ top: `${node.progress * 100}%` }}
              >
                <span className="trace-node-dot block h-2 w-2 rounded-full border border-[#8EE3D6]/70 bg-[#07101E] shadow-[0_0_12px_rgba(142,227,214,0.45)]" />
                <span className="absolute left-4 top-1/2 w-max -translate-y-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                  {node.label}
                </span>
              </div>
            ))}

            <div
              ref={carRef}
              className="trace-car absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
              style={{ top: "0%" }}
            >
              <span className="trace-car-glow absolute inset-[-10px] rounded-full" />
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[#8EE3D6]/70 bg-[#0E1020] text-[#8EE3D6] shadow-[0_0_26px_rgba(142,227,214,0.55)]">
                <CarFront className="h-4 w-4" strokeWidth={1.8} />
              </span>
            </div>
          </div>

          <div className="absolute left-[52px] top-1/2 -translate-y-1/2 rounded-[4px] border border-white/10 bg-[#07101E]/70 px-3 py-2 backdrop-blur-sm">
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-[#8EE3D6]/70">
              <MapPin className="h-3 w-3" strokeWidth={1.8} />
              {LANDING_THEME.copy.traceLabel}
            </span>
            <span
              ref={labelRef}
              className="mt-1 block text-xs font-bold uppercase tracking-wider text-white"
            >
              Hero
            </span>
            <span
              ref={sceneRef}
              className="mt-0.5 block text-[9px] uppercase tracking-[0.2em] text-white/35"
            >
              hero
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile/tablet progress trace */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-[60px] z-[40] h-7 xl:hidden"
      >
        <div className="absolute inset-x-3 top-3 h-px bg-white/15">
          <div
            ref={mobileTrailRef}
            className="trace-trail h-full bg-[#8EE3D6]"
            style={{ width: "0%" }}
          />
        </div>
        <div
          ref={mobileCarRef}
          className="absolute top-[1px] left-3"
          style={{ left: "12px" }}
        >
          <span className="relative flex h-5 w-5 items-center justify-center rounded-full border border-[#8EE3D6]/70 bg-[#0E1020] text-[#8EE3D6] shadow-[0_0_16px_rgba(142,227,214,0.5)]">
            <CarFront className="h-2.5 w-2.5" strokeWidth={2} />
          </span>
        </div>
      </div>
    </>
  );
}
