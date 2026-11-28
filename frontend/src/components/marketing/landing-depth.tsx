"use client";

import { useEffect, useRef } from "react";
import type * as Three from "three";
import { journeyControls } from "@/components/marketing/journey-controls";
import {
  getLandingPerformance,
  whenLandingIntroDone,
} from "@/lib/landing-performance";
import {
  createFallbackModel,
  createModelInstance,
  loadTravelModel,
  type TravelModelKind,
} from "@/lib/travel-models";

/**
 * One persistent WebGL layer behind the whole landing page.
 *
 * The page is navy from hero to footer. As each section enters the viewport,
 * this layer eases into a travel "chapter": aircraft over the hero/why section,
 * cars on a road through the people sections, and ships on a sea lane around
 * the CTA/about sections. All motion uses the same damped scroll value and one
 * clock, so vehicles, route guides and the camera stay in time. Scrolling down
 * also lifts the camera like a rising drone, shrinking the whole scene; scrolling
 * up brings it back to normal size.
 */

type SceneName = "hero" | "air" | "road" | "sea" | "arrival";

type Formation = {
  x: number;
  y: number;
  scale: number;
  tilt: number;
  spread: number;
  spin: number;
};

type Vehicle = {
  group: Three.Group;
  scene: SceneName;
  span: number;
  y: number;
  z: number;
  size: number;
  speed: number;
  phase: number;
  wobble: number;
  reverse: boolean;
};

type Guide = {
  scene: SceneName;
  materials: Three.LineDashedMaterial[];
};

type JourneyWaypoint = {
  group: Three.Group;
  ring: Three.Mesh;
  core: Three.Mesh;
  tick: Three.Mesh;
  progress: number;
};

type CameraShot = {
  /** Extra distance from the scene; positive pulls the virtual camera back. */
  pullback: number;
  rise: number;
  lookX: number;
  lookY: number;
  roll: number;
};

const SCENES: SceneName[] = ["hero", "air", "road", "sea", "arrival"];

const FORMATIONS: Formation[] = [
  { x: -4.2, y: 1.1, scale: 0.85, tilt: 0.12, spread: 0.85, spin: 0.12 },
  { x: 3.8, y: 0.3, scale: 1.05, tilt: -0.35, spread: 1.15, spin: 0.2 },
  { x: 0.2, y: 0.4, scale: 1.25, tilt: 0.55, spread: 1.35, spin: 0.28 },
  { x: -2.8, y: -0.2, scale: 1.1, tilt: 0.9, spread: 1.6, spin: 0.36 },
  { x: 3.0, y: 0.2, scale: 0.95, tilt: -0.2, spread: 1.05, spin: 0.18 },
  { x: -3.4, y: 0.3, scale: 1.15, tilt: 0.42, spread: 1.25, spin: 0.24 },
  { x: 0, y: 0.1, scale: 1.0, tilt: 0.05, spread: 1.5, spin: 0.15 },
];

const STAR_LAYERS = [
  { count: 220, rMin: 32, rMax: 52, size: 0.12, opacity: 0.36, depth: 0.08, speed: 0.006 },
  { count: 180, rMin: 19, rMax: 32, size: 0.18, opacity: 0.42, depth: 0.18, speed: -0.01 },
  { count: 100, rMin: 10, rMax: 17, size: 0.28, opacity: 0.52, depth: 0.32, speed: 0.016 },
];

const VEHICLE_LANES: {
  kind: TravelModelKind;
  scene: SceneName;
  count: number;
  y: number;
  z: number;
  size: number;
  speed: number;
  wobble: number;
  reverse?: boolean;
}[] = [
  { kind: "aircraft", scene: "air", count: 3, y: 2.4, z: -1.5, size: 2.5, speed: 0.045, wobble: 0.24 },
  { kind: "car", scene: "road", count: 4, y: -1.9, z: 2.4, size: 1.35, speed: 0.085, wobble: 0.02 },
  { kind: "ship", scene: "sea", count: 4, y: -2.2, z: -1.2, size: 2.4, speed: 0.035, wobble: 0.12 },
  { kind: "ship", scene: "sea", count: 2, y: -1.55, z: 0.4, size: 1.7, speed: 0.052, wobble: 0.09, reverse: true },
  { kind: "aircraft", scene: "arrival", count: 2, y: 1.2, z: 0.5, size: 2.2, speed: 0.05, wobble: 0.2, reverse: true },
];

const SCENE_CAMERA: Record<SceneName, { x: number; y: number; z: number }> = {
  hero: { x: 0, y: 0, z: 13 },
  air: { x: 1.2, y: 1.3, z: 12 },
  road: { x: -1.1, y: -0.9, z: 10.5 },
  sea: { x: 1.4, y: -1.2, z: 12.5 },
  arrival: { x: 0, y: 0.7, z: 11.5 },
};

// Scrolling down lifts the virtual drone: the camera pulls back and rises, so
// every 3D element shrinks and slips behind. Scrolling up restores the altitude.
const DRONE_ASCENT = { z: 8.5, y: 2.4, lookY: 0.6 };

// Each chapter gets its own restrained camera framing. These values are mixed
// by the same damped scene weights as the vehicles, so the view settles into a
// section instead of snapping when the active marker changes.
const CAMERA_SHOTS: Record<SceneName, CameraShot> = {
  hero: { pullback: 0, rise: 0, lookX: 0, lookY: 0, roll: 0 },
  air: { pullback: -0.55, rise: 0.12, lookX: 0.16, lookY: 0.06, roll: -0.012 },
  road: { pullback: 0.5, rise: -0.08, lookX: -0.14, lookY: -0.05, roll: 0.016 },
  sea: { pullback: -0.35, rise: 0.16, lookX: 0.1, lookY: -0.08, roll: -0.014 },
  arrival: { pullback: 0.25, rise: 0.04, lookX: 0, lookY: 0.09, roll: 0.008 },
};

// The journey filament is a finite 3D ribbon. Its local Y runs from +2 down to
// -9; shifting it by `progress * span - top` keeps the current section centred
// no matter how long the document becomes.
const JOURNEY_SPAN = 11;
const JOURNEY_TOP = 2;

const SCENE_WAYPOINT_COLOR: Record<SceneName, number> = {
  hero: 0x8ee3d6,
  air: 0xb8f4e9,
  road: 0x8ee3d6,
  sea: 0x7fb6d9,
  arrival: 0xe6fff8,
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function shellPoints(count: number, rMin: number, rMax: number): Float32Array {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = rMin + Math.random() * (rMax - rMin);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    arr[i * 3 + 2] = r * Math.cos(phi);
  }
  return arr;
}

export function LandingDepth() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const perf = getLandingPerformance();
    // Low-power devices keep the static backdrop; this persistent WebGL layer
    // is the most expensive thing on the page, so it is the first to go.
    if (!perf.journeyWebgl) return;

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      await whenLandingIntroDone();
      const THREE = await import("three");
      if (disposed) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, perf.maxDpr));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 140);
      camera.position.set(0, 0, 13);
      scene.add(camera);

      scene.add(new THREE.HemisphereLight(0xd7fff8, 0x07101e, 1.5));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
      keyLight.position.set(6, 7, 8);
      scene.add(keyLight);
      const rimLight = new THREE.DirectionalLight(0x8ee3d6, 1.2);
      rimLight.position.set(-7, -2, -4);
      scene.add(rimLight);

      const root = new THREE.Group();
      scene.add(root);

      // Materials tracked so opacity/palette can be animated together.
      const tracked: { mat: Three.Material; base: number; scene?: SceneName }[] = [];
      let additive = true;

      const track = <T extends Three.Material>(mat: T, base: number, group?: SceneName): T => {
        mat.transparent = true;
        mat.depthWrite = false;
        mat.blending = THREE.AdditiveBlending;
        mat.opacity = base;
        tracked.push({ mat, base, scene: group });
        return mat;
      };

      const starLayers: {
        points: Three.Points;
        lines: Three.LineSegments;
        depth: number;
        speed: number;
      }[] = [];
      STAR_LAYERS.forEach((cfg) => {
        const count = Math.max(1, Math.round(cfg.count * perf.density));
        const positions = shellPoints(count, cfg.rMin, cfg.rMax);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const mat = track(
          new THREE.PointsMaterial({ color: 0x8ee3d6, size: cfg.size, sizeAttenuation: true, opacity: cfg.opacity }),
          cfg.opacity
        );
        const points = new THREE.Points(geo, mat);
        scene.add(points);

        // Link nearby stars into drifting constellations. Each segment comes from
        // the same shell, so the lines travel with their own star layer.
        const vertices: number[] = [];
        const used = new Set<number>();
        const maxSegments = Math.floor(count * 0.18);
        const maxDistance = Math.max(2.5, (cfg.rMax - cfg.rMin) * 0.55);
        let segments = 0;

        for (let i = 0; i < count && segments < maxSegments; i++) {
          if (used.has(i)) continue;
          let nearest = -1;
          let bestDistanceSq = maxDistance * maxDistance;

          for (let j = 0; j < count; j++) {
            if (j === i || used.has(j)) continue;
            const dx = positions[i * 3] - positions[j * 3];
            const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
            const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
            const distanceSq = dx * dx + dy * dy + dz * dz;
            if (distanceSq < bestDistanceSq) {
              bestDistanceSq = distanceSq;
              nearest = j;
            }
          }

          if (nearest < 0) continue;
          vertices.push(
            positions[i * 3],
            positions[i * 3 + 1],
            positions[i * 3 + 2],
            positions[nearest * 3],
            positions[nearest * 3 + 1],
            positions[nearest * 3 + 2]
          );
          used.add(i);
          used.add(nearest);
          segments += 1;
        }

        const linkGeo = new THREE.BufferGeometry();
        linkGeo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        const linkMat = track(
          new THREE.LineBasicMaterial({ color: 0x8ee3d6, opacity: cfg.opacity * 0.5 }),
          cfg.opacity * 0.5
        );
        const lines = new THREE.LineSegments(linkGeo, linkMat);
        scene.add(lines);
        starLayers.push({ points, lines, depth: cfg.depth, speed: cfg.speed });
      });

      const core = new THREE.Group();
      root.add(core);

      const shellMat = track(
        new THREE.MeshBasicMaterial({ color: 0x8ee3d6, wireframe: true, opacity: 0.22 }),
        0.22
      );
      core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 1), shellMat));

      const innerMat = track(new THREE.MeshBasicMaterial({ color: 0x0e7a6e, opacity: 0.12 }), 0.12);
      core.add(new THREE.Mesh(new THREE.SphereGeometry(1.55, 32, 32), innerMat));

      const rings: Three.Mesh[] = [];
      [
        { r: 2.9, tilt: 0.35, tube: 0.012, opacity: 0.26 },
        { r: 3.7, tilt: -0.55, tube: 0.01, opacity: 0.2 },
        { r: 4.5, tilt: 1.1, tube: 0.008, opacity: 0.14 },
      ].forEach((cfg) => {
        const mat = track(new THREE.MeshBasicMaterial({ color: 0x8ee3d6, opacity: cfg.opacity }), cfg.opacity);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(cfg.r, cfg.tube, 6, 140), mat);
        ring.rotation.set(cfg.tilt, 0, cfg.tilt * 0.4);
        core.add(ring);
        rings.push(ring);
      });

      const nodeGeo = new THREE.SphereGeometry(0.055, 8, 8);
      for (let i = 0; i < 18; i++) {
        const mat = track(new THREE.MeshBasicMaterial({ color: 0x8ee3d6, opacity: 0.6 }), 0.6);
        const node = new THREE.Mesh(nodeGeo, mat);
        const angle = (i / 18) * Math.PI * 2;
        const radius = i % 2 ? 2.9 : 3.7;
        node.position.set(Math.cos(angle) * radius, Math.sin(angle * 2) * 0.35, Math.sin(angle) * radius);
        core.add(node);
      }

      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute(
        "position",
        new THREE.BufferAttribute(shellPoints(Math.round(360 * perf.density), 5, 13), 3)
      );
      const particleMat = track(
        new THREE.PointsMaterial({ color: 0x8ee3d6, size: 0.09, sizeAttenuation: true, opacity: 0.42 }),
        0.42
      );
      const particles = new THREE.Points(particleGeo, particleMat);
      root.add(particles);

      const makeRoute = (
        sceneName: SceneName,
        y: number,
        z: number,
        color: number,
        opacity: number,
        wave = 0
      ): Guide => {
        const group = new THREE.Group();
        const materials: Three.LineDashedMaterial[] = [];
        for (let lane = 0; lane < 3; lane++) {
          const points: Three.Vector3[] = [];
          for (let i = 0; i <= 140; i++) {
            const t = i / 140;
            const x = mix(-12, 12, t);
            const yy = y + lane * 0.32 + Math.sin(t * Math.PI * 4 + lane) * wave;
            points.push(new THREE.Vector3(x, yy, z + lane * 0.4));
          }
          const geo = new THREE.BufferGeometry().setFromPoints(points);
          const mat = track(
            new THREE.LineDashedMaterial({
              color,
              dashSize: 0.38,
              gapSize: 0.3,
              opacity,
              transparent: true,
              depthWrite: false,
            }),
            opacity,
            sceneName
          );
          const line = new THREE.Line(geo, mat);
          line.computeLineDistances();
          group.add(line);
          materials.push(mat);
        }
        root.add(group);
        return { scene: sceneName, materials };
      };

      const guides: Guide[] = [
        makeRoute("air", 2.4, -1.5, 0x8ee3d6, 0.3, 0.35),
        makeRoute("road", -2.1, 2.4, 0x8ee3d6, 0.26),
        makeRoute("sea", -2.4, -1.2, 0x7fb6d9, 0.28, 0.16),
        makeRoute("arrival", 1.2, 0.5, 0x8ee3d6, 0.22, 0.25),
      ];

      // A single ribbon threads every section waypoint. Scrolling moves the
      // ribbon through the virtual camera; dragging the edge grip orbits it.
      const journey = new THREE.Group();
      root.add(journey);

      const journeyPoints: Three.Vector3[] = [];
      for (let i = 0; i <= 120; i++) {
        const t = i / 120;
        journeyPoints.push(
          new THREE.Vector3(
            Math.sin(t * Math.PI * 3.1) * 1.35 + Math.sin(t * Math.PI * 7.3) * 0.22,
            JOURNEY_TOP - t * JOURNEY_SPAN,
            -0.35 + Math.cos(t * Math.PI * 2.6) * 0.85
          )
        );
      }
      const journeyCurve = new THREE.CatmullRomCurve3(journeyPoints);

      const filamentGlowMat = track(
        new THREE.MeshBasicMaterial({ color: 0x8ee3d6, opacity: 0.08 }),
        0.08
      );
      const filamentCoreMat = track(
        new THREE.MeshBasicMaterial({ color: 0x8ee3d6, opacity: 0.46 }),
        0.46
      );
      journey.add(
        new THREE.Mesh(new THREE.TubeGeometry(journeyCurve, 200, 0.055, 6, false), filamentGlowMat)
      );
      journey.add(
        new THREE.Mesh(new THREE.TubeGeometry(journeyCurve, 200, 0.014, 6, false), filamentCoreMat)
      );

      const railPoints = journeyPoints.map(
        (point) => new THREE.Vector3(point.x + 0.58, point.y, point.z - 0.42)
      );
      const filamentRailMat = track(
        new THREE.LineBasicMaterial({ color: 0x7fb6d9, opacity: 0.14 }),
        0.14
      );
      journey.add(
        new THREE.Line(new THREE.BufferGeometry().setFromPoints(railPoints), filamentRailMat)
      );

      const pulseMat = track(
        new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.85 }),
        0.85
      );
      const pulseHaloMat = track(
        new THREE.MeshBasicMaterial({ color: 0x8ee3d6, opacity: 0.16 }),
        0.16
      );
      const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), pulseMat);
      const pulseHalo = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), pulseHaloMat);
      journey.add(pulse, pulseHalo);

      const waypointRingGeo = new THREE.TorusGeometry(0.16, 0.012, 6, 28);
      const waypointCoreGeo = new THREE.SphereGeometry(0.05, 10, 10);
      const waypointTickGeo = new THREE.BoxGeometry(0.42, 0.008, 0.008);
      const journeyWaypoints: JourneyWaypoint[] = [];

      for (let i = 0; i < 14; i++) {
        const group = new THREE.Group();
        group.visible = false;

        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x8ee3d6,
          opacity: 0.4,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const coreMat = new THREE.MeshBasicMaterial({
          color: 0x8ee3d6,
          opacity: 0.75,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const tickMat = new THREE.MeshBasicMaterial({
          color: 0x8ee3d6,
          opacity: 0.24,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });

        const ring = new THREE.Mesh(waypointRingGeo, ringMat);
        const core = new THREE.Mesh(waypointCoreGeo, coreMat);
        const tick = new THREE.Mesh(waypointTickGeo, tickMat);
        tick.position.x = 0.3;
        group.add(ring, core, tick);
        journey.add(group);
        journeyWaypoints.push({ group, ring, core, tick, progress: 0 });
      }

      const waypointColor = new THREE.Color();

      // Cache section offsets and document height instead of reading layout on
      // every scroll frame. getBoundingClientRect()/scrollHeight in a scroll
      // handler forces synchronous layout and is the usual cause of jank.
      let sectionMarks: { top: number; height: number; name: SceneName }[] = [];
      let sectionCount = 1;
      let maxScroll = 1;
      let targetProgress = 0;
      let progress = 0;
      let sectionProgress = 0;
      let sectionPulse = 0;
      let cameraRoll = 0;
      let activeScene: SceneName = "hero";
      const sceneWeights: Record<SceneName, number> = {
        hero: 1,
        air: 0,
        road: 0,
        sea: 0,
        arrival: 0,
      };

      const measure = () => {
        const sections = Array.from(document.querySelectorAll<HTMLElement>("section"));
        sectionCount = Math.max(1, sections.length);
        const pageY = window.scrollY;
        sectionMarks = sections.map((section) => {
          const declared = section.dataset.scene as SceneName | undefined;
          return {
            top: section.getBoundingClientRect().top + pageY,
            height: Math.max(1, section.offsetHeight),
            name: declared && SCENES.includes(declared) ? declared : "hero",
          };
        });
        maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

        // Place the 3D waypoints on the same document positions as the flat
        // scroll trace so both layers describe one continuous journey.
        const traceNodes = Array.from(
          document.querySelectorAll<HTMLElement>("[data-trace-node]")
        )
          .map((element) => ({
            top: element.getBoundingClientRect().top + pageY,
            scene: element.dataset.scene as SceneName | undefined,
          }))
          .sort((a, b) => a.top - b.top);

        journeyWaypoints.forEach((waypoint, index) => {
          const node = traceNodes[index];
          waypoint.group.visible = Boolean(node);
          if (!node) return;

          waypoint.progress = clamp01(node.top / maxScroll);
          waypoint.group.position.copy(journeyCurve.getPoint(waypoint.progress));

          const scene = node.scene && SCENES.includes(node.scene) ? node.scene : "road";
          waypointColor.setHex(SCENE_WAYPOINT_COLOR[scene]);
          (waypoint.ring.material as Three.MeshBasicMaterial).color.copy(waypointColor);
          (waypoint.core.material as Three.MeshBasicMaterial).color.copy(waypointColor);
          (waypoint.tick.material as Three.MeshBasicMaterial).color.copy(waypointColor);
        });
      };

      const readScroll = () => {
        targetProgress = clamp01(window.scrollY / maxScroll);
        const marker = window.scrollY + window.innerHeight * 0.45;
        let index = 0;
        for (let i = 0; i < sectionMarks.length; i++) {
          if (sectionMarks[i].top > marker) break;
          index = i;
        }
        const active = sectionMarks[index];
        activeScene = active?.name ?? "hero";
        sectionProgress = active
          ? clamp01((window.scrollY - active.top) / active.height)
          : 0;
      };

      measure();
      readScroll();

      const pointer = { x: 0, y: 0 };
      const onPointer = (e: PointerEvent) => {
        pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
        pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
      };

      let scrollRaf = 0;
      const onScroll = () => {
        if (scrollRaf) return;
        scrollRaf = requestAnimationFrame(() => {
          scrollRaf = 0;
          readScroll();
        });
      };
      const onResize = () => {
        layout();
        measure();
        readScroll();
      };

      const layout = () => {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      layout();

      const ro = new ResizeObserver(layout);
      ro.observe(host);

      const onLoad = () => {
        if (disposed) return;
        measure();
        readScroll();
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize);
      if (perf.pointerEffects) {
        window.addEventListener("pointermove", onPointer, { passive: true });
      }
      window.addEventListener("load", onLoad);
      document.fonts?.ready.then(onLoad).catch(() => {});
      // Re-measure when deferred sections get their real size after render.
      const bodyRO = new ResizeObserver(onLoad);
      bodyRO.observe(document.body);

      const vehicles: Vehicle[] = [];
      const modelSources: Three.Object3D[] = [];

      VEHICLE_LANES.forEach((lane, laneIndex) => {
        for (let i = 0; i < lane.count; i++) {
          const group = new THREE.Group();
          group.visible = false;
          root.add(group);
          vehicles.push({
            group,
            scene: lane.scene,
            span: 11.5,
            y: lane.y + (i % 2) * 0.18,
            z: lane.z + i * 0.22,
            size: lane.size,
            speed: lane.speed,
            phase: (i / lane.count + laneIndex * 0.13) % 1,
            wobble: lane.wobble,
            reverse: Boolean(lane.reverse),
          });
        }
      });

      const loadVehicles = async () => {
        const kinds = Array.from(new Set(VEHICLE_LANES.map((lane) => lane.kind)));
        const results = await Promise.all(
          kinds.map(async (kind) => {
            try {
              return [kind, await loadTravelModel(THREE, kind)] as const;
            } catch (error) {
              console.warn(`[LandingDepth] ${kind} model unavailable, using fallback:`, error);
              return [kind, createFallbackModel(THREE, kind)] as const;
            }
          })
        );

        if (disposed) return;
        const sources = new Map<TravelModelKind, Three.Object3D>();
        results.forEach(([kind, source]) => {
          sources.set(kind, source);
          modelSources.push(source);
        });

        VEHICLE_LANES.forEach((lane) => {
          const source = sources.get(lane.kind);
          if (!source) return;
          vehicles
            .filter((vehicle) => vehicle.scene === lane.scene && Math.abs(vehicle.size - lane.size) < 0.01)
            .forEach((vehicle) => {
              const model = createModelInstance(THREE, source, lane.size);
              if (vehicle.reverse) model.rotation.y += Math.PI;
              vehicle.group.add(model);
            });
        });
      };

      void loadVehicles();

      const darkColor = new THREE.Color(0x8ee3d6);
      const lightColor = new THREE.Color(0x0e5f57);
      const currentColor = darkColor.clone();

      const timer = new THREE.Timer();
      timer.connect(document);
      let raf = 0;
      let tabVisible = !document.hidden;

      let lastRender = 0;
      let sceneEnvelope = 1;
      const renderInterval = 1000 / perf.fps;

      const update = (time: number, step: number, damp: (k: number) => number) => {
        progress = mix(progress, targetProgress, damp(6));
        SCENES.forEach((name) => {
          const target = name === activeScene ? 1 : 0;
          sceneWeights[name] = mix(sceneWeights[name], target, damp(4));
        });

        const chapter = progress * (sectionCount - 1);
        const index = Math.floor(chapter);
        const blend = smooth(chapter - index);
        const a = FORMATIONS[index % FORMATIONS.length];
        const b = FORMATIONS[(index + 1) % FORMATIONS.length];

        const targetX = mix(a.x, b.x, blend);
        const targetY = mix(a.y, b.y, blend);
        const targetScale = mix(a.scale, b.scale, blend);
        const targetTilt = mix(a.tilt, b.tilt, blend);
        const targetSpread = mix(a.spread, b.spread, blend) * (1 + progress * 0.35);
        const spin = mix(a.spin, b.spin, blend);

        const altitude = smooth(progress);
        // A soft in/out pulse inside each section gives the camera a sense of
        // travelling with the reader without adding another scroll listener.
        sectionPulse = mix(sectionPulse, Math.sin(sectionProgress * Math.PI), damp(2.5));
        // Stay visible across the landing sections and fade only near the footer.
        const envelope = 1 - smooth((progress - 0.94) / 0.06);
        sceneEnvelope = envelope;
        renderer.domElement.style.opacity = String(Math.min(1, envelope * 2));
        if (envelope <= 0.01) return;
        const controls = journeyControls.get();

        starLayers.forEach((layer) => {
          layer.points.rotation.y += step * layer.speed;
          layer.points.rotation.z += step * layer.speed * 0.3;
          layer.points.position.y = mix(
            layer.points.position.y,
            -altitude * layer.depth * 4,
            damp(3)
          );

          // Constellations ride their star shell, with a slight independent
          // drift so the line work feels alive instead of glued on.
          layer.lines.rotation.copy(layer.points.rotation);
          layer.lines.rotation.y += Math.sin(time * 0.2 + layer.depth * 8) * 0.08;
          layer.lines.position.copy(layer.points.position);
        });

        core.position.x = mix(core.position.x, targetX, damp(3));
        core.position.y = mix(core.position.y, targetY, damp(3));
        core.scale.setScalar(mix(core.scale.x, targetScale, damp(3)));
        core.rotation.y += step * spin;
        core.rotation.x = mix(core.rotation.x, targetTilt + pointer.y * 0.06, damp(2.5));
        core.rotation.z = Math.sin(time * 0.15) * 0.08 + pointer.x * 0.04;

        rings.forEach((ring, i) => {
          ring.rotation.z += step * (0.1 + i * 0.05);
          ring.rotation.x += step * 0.04;
        });

        particles.rotation.y -= step * 0.06;
        particles.rotation.x += step * 0.02;
        particles.scale.setScalar(mix(particles.scale.x, targetSpread, damp(2.5)));

        // The filament is the 3D counterpart of the flat scroll trace: the
        // current section stays centred while the ribbon slides through view.
        journey.position.y = mix(
          journey.position.y,
          progress * JOURNEY_SPAN - JOURNEY_TOP,
          damp(5)
        );
        journey.rotation.y = mix(journey.rotation.y, controls.yaw * 0.42, damp(4));
        journey.rotation.x = mix(journey.rotation.x, controls.pitch * 0.3, damp(4));
        journey.rotation.z = Math.sin(time * 0.16) * 0.035 + controls.yaw * 0.05;
        journey.scale.setScalar(mix(journey.scale.x, controls.dragging ? 1.08 : 1, damp(4)));

        const pulsePoint = journeyCurve.getPoint(progress);
        pulse.position.copy(pulsePoint);
        pulseHalo.position.copy(pulsePoint);
        pulseHalo.scale.setScalar(
          1 + Math.sin(time * 3) * 0.18 + (controls.dragging ? 0.25 : 0)
        );

        // Vehicles share one clock; scroll nudges them forward and selects the
        // lane, but never restarts an individual animation timeline.
        vehicles.forEach((vehicle) => {
          const weight = sceneWeights[vehicle.scene];
          vehicle.group.visible = weight > 0.015;
          if (!vehicle.group.visible) return;

          const travel =
            (((time * vehicle.speed + vehicle.phase + progress * 0.22) % 1) + 1) % 1;
          const x = mix(-vehicle.span, vehicle.span, travel) * (vehicle.reverse ? -1 : 1);
          vehicle.group.position.x = mix(vehicle.group.position.x, x, damp(12));
          vehicle.group.position.y = mix(
            vehicle.group.position.y,
            vehicle.y + Math.sin(travel * Math.PI * 2 + vehicle.phase * 6) * vehicle.wobble,
            damp(8)
          );
          vehicle.group.position.z = mix(vehicle.group.position.z, vehicle.z, damp(6));
          vehicle.group.rotation.z = Math.cos(travel * Math.PI * 2) * 0.06 * vehicle.wobble * 8;

          const scale = Math.max(0.001, weight);
          vehicle.group.scale.setScalar(scale);
        });

        const camTarget = SCENES.reduce(
          (acc, name) => {
            const cfg = SCENE_CAMERA[name];
            const shot = CAMERA_SHOTS[name];
            const w = sceneWeights[name];
            acc.x += cfg.x * w;
            acc.y += cfg.y * w;
            acc.z += cfg.z * w;
            acc.pullback += shot.pullback * w;
            acc.rise += shot.rise * w;
            acc.lookX += shot.lookX * w;
            acc.lookY += shot.lookY * w;
            acc.roll += shot.roll * w;
            return acc;
          },
          { x: 0, y: 0, z: 0, pullback: 0, rise: 0, lookX: 0, lookY: 0, roll: 0 }
        );
        camera.position.x = mix(
          camera.position.x,
          camTarget.x + camTarget.lookX * 0.45 + pointer.x * 0.35 + controls.yaw * 0.55,
          damp(2)
        );
        camera.position.y = mix(
          camera.position.y,
          camTarget.y +
            camTarget.rise +
            sectionPulse * 0.12 +
            pointer.y * 0.3 +
            altitude * DRONE_ASCENT.y +
            controls.pitch * 0.4,
          damp(2)
        );
        camera.position.z = mix(
          camera.position.z,
          camTarget.z +
            camTarget.pullback -
            sectionPulse * 0.35 +
            altitude * DRONE_ASCENT.z,
          damp(2)
        );
        camera.lookAt(
          camTarget.lookX + controls.yaw * 0.28,
          camTarget.lookY + altitude * DRONE_ASCENT.lookY + controls.pitch * 0.22,
          0
        );
        // lookAt resets rotation, so keep the gentle roll in its own damped value.
        cameraRoll = mix(
          cameraRoll,
          camTarget.roll + pointer.x * 0.01 + controls.yaw * 0.008,
          damp(2)
        );
        camera.rotation.z = cameraRoll;

        currentColor.copy(darkColor);
        tracked.forEach(({ mat, base, scene }) => {
          const sceneWeight = scene ? sceneWeights[scene] : 1;
          mat.opacity = base * envelope * sceneWeight;
          if (!scene) {
            const colored = mat as Three.MeshBasicMaterial | Three.PointsMaterial;
            colored.color?.copy(currentColor);
          }
        });

        // Waypoint markers brighten as the reader reaches their section, making
        // the connection between sections legible in 3D as well as on the rail.
        journeyWaypoints.forEach((waypoint) => {
          if (!waypoint.group.visible) return;
          const near = 1 - smooth(Math.abs(waypoint.progress - progress) / 0.1);
          const ringMat = waypoint.ring.material as Three.MeshBasicMaterial;
          const coreMat = waypoint.core.material as Three.MeshBasicMaterial;
          const tickMat = waypoint.tick.material as Three.MeshBasicMaterial;

          ringMat.opacity = envelope * (0.16 + near * 0.6);
          coreMat.opacity = envelope * (0.35 + near * 0.6);
          tickMat.opacity = envelope * (0.12 + near * 0.45);
          waypoint.ring.scale.setScalar(
            1 + near * 0.35 + Math.sin(time * 2 + waypoint.progress * 10) * 0.04
          );
          waypoint.core.scale.setScalar(1 + near * 0.5);
          waypoint.group.rotation.z += step * (0.25 + near * 0.5);
        });

        const wantAdditive = true;
        if (wantAdditive !== additive) {
          additive = wantAdditive;
          tracked.forEach(({ mat }) => {
            mat.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
            mat.needsUpdate = true;
          });
        }
      };

      const frame = (timestamp?: number) => {
        raf = 0;
        if (disposed) return;
        if (timestamp && timestamp - lastRender < renderInterval) {
          schedule();
          return;
        }
        lastRender = timestamp || performance.now();

        timer.update(timestamp);
        const dt = Math.min(timer.getDelta(), 0.05);
        const step = reduceMotion ? 0 : dt;
        update(timer.getElapsed(), step, (k) => (reduceMotion ? 1 : Math.min(1, step * k)));
        if (sceneEnvelope > 0.01) renderer.render(scene, camera);
        schedule();
      };
      const schedule = () => {
        if (!raf && tabVisible && !disposed) raf = requestAnimationFrame(frame);
      };

      const onVisibility = () => {
        tabVisible = !document.hidden;
        if (tabVisible) {
          timer.reset();
          schedule();
        }
      };
      document.addEventListener("visibilitychange", onVisibility);

      update(0, 0, () => 1);
      renderer.render(scene, camera);
      schedule();

      cleanup = () => {
        if (scrollRaf) cancelAnimationFrame(scrollRaf);
        cancelAnimationFrame(raf);
        timer.dispose();
        ro.disconnect();
        bodyRO.disconnect();
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("load", onLoad);
        document.removeEventListener("visibilitychange", onVisibility);

        const geometries = new Set<Three.BufferGeometry>();
        const materials = new Set<Three.Material>();
        const collect = (obj: Three.Object3D) => {
          obj.traverse((child) => {
            const mesh = child as Three.Mesh;
            if (mesh.geometry) geometries.add(mesh.geometry);
            const mat = mesh.material as Three.Material | Three.Material[] | undefined;
            if (Array.isArray(mat)) mat.forEach((m) => materials.add(m));
            else if (mat) materials.add(mat);
          });
        };
        scene.traverse(collect);
        modelSources.forEach(collect);
        geometries.forEach((geo) => geo.dispose());
        materials.forEach((mat) => mat.dispose());
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch((err) => {
      console.warn("[LandingDepth] 3D layer disabled:", err);
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[2]">
      <div ref={hostRef} className="h-full w-full" />
    </div>
  );
}
