"use client";

import { useEffect, useRef } from "react";
import type * as Three from "three";

/**
 * One persistent WebGL layer for the whole landing page.
 *
 * Everything is driven by a single damped scroll value and one clock, so the
 * starfields, orbit rings, particles and camera move together instead of each
 * section running its own parallax on a different timeline.
 *
 * - Three star layers at different distances give real depth.
 * - As each section enters, the formation eases into the next "chapter".
 * - The palette/blend mode follows the section tone (mint on navy, deep teal
 *   on light sections) and fades out over the hero globe and the footer.
 */

type Formation = {
  x: number;
  y: number;
  scale: number;
  tilt: number;
  spread: number;
  spin: number;
};

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
  { count: 420, rMin: 32, rMax: 52, size: 0.12, opacity: 0.42, depth: 0.08, speed: 0.008 },
  { count: 320, rMin: 19, rMax: 32, size: 0.18, opacity: 0.5, depth: 0.18, speed: -0.014 },
  { count: 180, rMin: 10, rMax: 17, size: 0.28, opacity: 0.6, depth: 0.32, speed: 0.022 },
];

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

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 140);
      camera.position.set(0, 0, 12);
      scene.add(camera);

      const root = new THREE.Group();
      scene.add(root);

      // Materials tracked so opacity and palette can be animated together.
      type TrackedMaterial = Three.PointsMaterial | Three.MeshBasicMaterial;
      const tracked: { mat: TrackedMaterial; base: number }[] = [];
      let additive = true;

      const track = <T extends TrackedMaterial>(mat: T, base: number): T => {
        mat.transparent = true;
        mat.depthWrite = false;
        mat.blending = THREE.AdditiveBlending;
        mat.opacity = base;
        tracked.push({ mat, base });
        return mat;
      };

      // ---------- Depth layers ----------
      const starLayers: { points: Three.Points; depth: number; speed: number }[] = [];
      STAR_LAYERS.forEach((cfg) => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(shellPoints(cfg.count, cfg.rMin, cfg.rMax), 3));
        const mat = track(
          new THREE.PointsMaterial({ color: 0x8ee3d6, size: cfg.size, sizeAttenuation: true, opacity: cfg.opacity }),
          cfg.opacity
        );
        const points = new THREE.Points(geo, mat);
        scene.add(points);
        starLayers.push({ points, depth: cfg.depth, speed: cfg.speed });
      });

      // ---------- Core formation ----------
      const core = new THREE.Group();
      root.add(core);

      const shellMat = track(
        new THREE.MeshBasicMaterial({ color: 0x8ee3d6, wireframe: true, opacity: 0.32 }),
        0.32
      );
      core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 1), shellMat));

      const innerMat = track(new THREE.MeshBasicMaterial({ color: 0x0e7a6e, opacity: 0.16 }), 0.16);
      core.add(new THREE.Mesh(new THREE.SphereGeometry(1.55, 32, 32), innerMat));

      const rings: Three.Mesh[] = [];
      [
        { r: 2.9, tilt: 0.35, tube: 0.012, opacity: 0.32 },
        { r: 3.7, tilt: -0.55, tube: 0.01, opacity: 0.26 },
        { r: 4.5, tilt: 1.1, tube: 0.008, opacity: 0.18 },
      ].forEach((cfg) => {
        const mat = track(new THREE.MeshBasicMaterial({ color: 0x8ee3d6, opacity: cfg.opacity }), cfg.opacity);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(cfg.r, cfg.tube, 6, 140), mat);
        ring.rotation.set(cfg.tilt, 0, cfg.tilt * 0.4);
        core.add(ring);
        rings.push(ring);
      });

      const nodeGeo = new THREE.SphereGeometry(0.055, 8, 8);
      for (let i = 0; i < 18; i++) {
        const mat = track(new THREE.MeshBasicMaterial({ color: 0x8ee3d6, opacity: 0.72 }), 0.72);
        const node = new THREE.Mesh(nodeGeo, mat);
        const angle = (i / 18) * Math.PI * 2;
        const radius = i % 2 ? 2.9 : 3.7;
        node.position.set(Math.cos(angle) * radius, Math.sin(angle * 2) * 0.35, Math.sin(angle) * radius);
        core.add(node);
      }

      // ---------- Ambient particles that expand as you scroll ----------
      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute("position", new THREE.BufferAttribute(shellPoints(650, 5, 13), 3));
      const particleMat = track(
        new THREE.PointsMaterial({ color: 0x8ee3d6, size: 0.09, sizeAttenuation: true, opacity: 0.5 }),
        0.5
      );
      const particles = new THREE.Points(particleGeo, particleMat);
      root.add(particles);

      // ---------- Scroll + section state ----------
      let sections: HTMLElement[] = [];
      let sectionCount = 1;
      let targetProgress = 0;
      let progress = 0;
      let lightTarget = 0;
      let light = 0;

      const measure = () => {
        sections = Array.from(document.querySelectorAll<HTMLElement>("section"));
        sectionCount = Math.max(1, sections.length);
      };

      const readScroll = () => {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        targetProgress = clamp01(window.scrollY / max);

        const marker = window.innerHeight * 0.45;
        let index = 0;
        for (let i = 0; i < sections.length; i++) {
          const rect = sections[i].getBoundingClientRect();
          if (rect.top <= marker && rect.bottom > marker) {
            index = i;
            break;
          }
          if (rect.top <= marker) index = i;
        }

        const style = getComputedStyle(sections[index] || document.body);
        const bg = style.backgroundColor;
        const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        let luminance = 1; // transparent backgrounds fall back to the light page base
        if (match) {
          const alpha = match[4] === undefined ? 1 : Number(match[4]);
          if (alpha > 0) {
            luminance =
              (Number(match[1]) * 0.299 + Number(match[2]) * 0.587 + Number(match[3]) * 0.114) / 255;
          }
        }
        lightTarget = luminance > 0.45 ? 1 : 0;
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
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize);
      window.addEventListener("pointermove", onPointer, { passive: true });

      const darkColor = new THREE.Color(0x8ee3d6);
      const lightColor = new THREE.Color(0x0e5f57);
      const currentColor = darkColor.clone();

      // ---------- Loop ----------
      const timer = new THREE.Timer();
      timer.connect(document);
      let raf = 0;
      let tabVisible = !document.hidden;

      const update = (time: number, step: number, damp: (k: number) => number) => {
        progress = mix(progress, targetProgress, damp(6));
        light = mix(light, lightTarget, damp(4));

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

        starLayers.forEach((layer) => {
          layer.points.rotation.y += step * layer.speed;
          layer.points.rotation.z += step * layer.speed * 0.3;
          layer.points.position.y = mix(layer.points.position.y, progress * layer.depth * 4, damp(3));
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

        camera.position.z = mix(camera.position.z, 12 - progress * 3.2, damp(2));
        camera.position.x = mix(camera.position.x, Math.sin(progress * Math.PI * 2.4) * 2.2, damp(2));
        camera.position.y = mix(
          camera.position.y,
          Math.cos(progress * Math.PI * 1.7) * 0.9 + pointer.y * 0.3,
          damp(2)
        );
        camera.lookAt(0, 0, 0);

        currentColor.copy(darkColor).lerp(lightColor, light);
        const envelope =
          smooth((progress - 0.02) / 0.1) *
          (1 - smooth((progress - 0.93) / 0.07)) *
          (1 - light * 0.45);

        tracked.forEach(({ mat, base }) => {
          mat.color.copy(currentColor);
          mat.opacity = base * envelope;
        });

        const wantAdditive = light < 0.5;
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
        timer.update(timestamp);
        const dt = Math.min(timer.getDelta(), 0.05);
        const step = reduceMotion ? 0 : dt;
        update(timer.getElapsed(), step, (k) => (reduceMotion ? 1 : Math.min(1, step * k)));
        renderer.render(scene, camera);
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

      // Draw the initial state before the first scroll happens.
      update(0, 0, () => 1);
      renderer.render(scene, camera);
      schedule();

      cleanup = () => {
        if (scrollRaf) cancelAnimationFrame(scrollRaf);
        cancelAnimationFrame(raf);
        timer.dispose();
        ro.disconnect();
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pointermove", onPointer);
        document.removeEventListener("visibilitychange", onVisibility);
        scene.traverse((obj) => {
          const mesh = obj as Three.Mesh;
          mesh.geometry?.dispose?.();
          const mat = mesh.material as Three.Material | Three.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
        });
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
    <div aria-hidden className="pointer-events-none fixed inset-0 z-30">
      <div ref={hostRef} className="h-full w-full" />
    </div>
  );
}
