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

/**
 * One continuous journey spine through the landing page.
 *
 * Desktop: a compact glowing rail lives in the 40px content gutter, with
 * waypoint ticks and short connectors reaching toward the inset content.
 * Mobile: the same journey becomes an edge-to-edge progress line under the
 * header. Both are pointer-events-none and driven by the shared progress
 * provider, so they add no competing scroll listeners.
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
      {/* Desktop journey rail, sized to sit inside the 40px desktop gutter. */}
      <aside
        aria-hidden
        className="pointer-events-none fixed bottom-6 left-0 top-[72px] z-[40] hidden w-10 lg:block"
      >
        <div className="relative h-full">
          <div className="absolute inset-y-5 left-[18px] w-px overflow-visible bg-white/10">
            <div
              ref={trailRef}
              className="trace-trail absolute inset-x-0 top-0 w-full"
              style={{ height: "0%" }}
            />

            {nodes.map((node) => {
              const active = node.label === activeLabel;
              return (
                <div
                  key={node.id}
                  className={`trace-node absolute left-1/2 -translate-x-1/2 -translate-y-1/2 ${
                    active ? "is-active" : ""
                  }`}
                  style={{ top: `${node.progress * 100}%` }}
                >
                  <span className="trace-connector" />
                  <span className="trace-node-dot block h-2 w-2 rounded-full border border-[#8EE3D6]/70 bg-[#07101E] shadow-[0_0_12px_rgba(142,227,214,0.45)]" />
                  <span className="trace-node-label whitespace-nowrap">
                    {node.label}
                  </span>
                </div>
              );
            })}

            <div
              ref={carRef}
              className="trace-car absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
              style={{ top: "0%" }}
            >
              <span className="trace-car-glow absolute inset-[-10px] rounded-full" />
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-[#8EE3D6]/70 bg-[#0E1020] text-[#8EE3D6] shadow-[0_0_26px_rgba(142,227,214,0.55)]">
                <CarFront className="h-3.5 w-3.5" strokeWidth={1.8} />
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile/tablet progress trace: edge to edge, with the same waypoints. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-[60px] z-[40] h-8 lg:hidden"
      >
        <div className="absolute inset-x-0 top-3 h-px bg-white/15">
          <div
            ref={mobileTrailRef}
            className="trace-trail h-full bg-[#8EE3D6]"
            style={{ width: "0%" }}
          />
          {nodes.map((node) => (
            <span
              key={`mobile-${node.id}`}
              className={`trace-mobile-node ${node.label === activeLabel ? "is-active" : ""}`}
              style={{ left: mobilePos(node.progress) }}
            />
          ))}
        </div>

        <div
          ref={mobileCarRef}
          className="trace-car-mobile absolute top-[1px] left-0 -translate-x-1/2"
          style={{ left: mobilePos(0) }}
        >
          <span className="relative flex h-5 w-5 items-center justify-center rounded-full border border-[#8EE3D6]/70 bg-[#0E1020] text-[#8EE3D6] shadow-[0_0_16px_rgba(142,227,214,0.5)]">
            <CarFront className="h-2.5 w-2.5" strokeWidth={2} />
          </span>
        </div>

        <span
          ref={mobileLabelRef}
          className="trace-mobile-label absolute right-3 top-[18px]"
        >
          Hero
        </span>
      </div>
    </>
  );
}
