"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import { FitTwoLines } from "@/components/marketing/fit-two-lines";
import { LANDING_THEME } from "@/config/landing-theme";
import { SITE_CONFIG } from "@/config/site";

type ThreeModule = typeof import("three");

type HeroTitleStageProps = {
  titleTop?: string;
  titleBottom?: string;
  theme: string;
  logoSrc?: string;
};

const BOARD_W = 4.9;
const BOARD_H = 2.5;
const GAP = 0.1;
const SLAB_H = (BOARD_H - GAP) / 2;
const SLANT = 0.62;
const DEPTH = 0.18;

// Glass-plaque fallback carried over from the landing redesign. The 3D stage
// fades in over it once WebGL is ready, so no visual or accessibility detail is
// lost on reduced-motion / save-data devices.
const TOP_OUTER = ["14px 0", "100% 0", "calc(100% - var(--s)) 100%", "0 100%", "0 14px"];
const TOP_INNER = [
  "14.6px 1.5px",
  "calc(100% - 3px) 1.5px",
  "calc(100% - var(--s) - 0.75px) calc(100% - 1.5px)",
  "1.5px calc(100% - 1.5px)",
  "1.5px 14.6px",
];
const BOT_OUTER = ["0 0", "calc(100% - var(--s)) 0", "100% 100%", "14px 100%", "0 calc(100% - 14px)"];
const BOT_INNER = [
  "1.5px 1.5px",
  "calc(100% - var(--s) - 0.75px) 1.5px",
  "calc(100% - 3px) calc(100% - 1.5px)",
  "14.6px calc(100% - 1.5px)",
  "1.5px calc(100% - 14.6px)",
];
const shape = (outer: string[]) => `polygon(${outer.join(", ")})`;
const ring = (outer: string[], inner: string[]) =>
  `polygon(evenodd, ${outer.join(", ")}, ${inner.join(", ")})`;

const HB_CSS = `
.hb-wrap{position:relative;filter:drop-shadow(0 18px 40px rgba(0,0,0,.35)) drop-shadow(0 0 28px rgba(142,227,214,.10))}
.hb-plate{position:relative;overflow:hidden;-webkit-backdrop-filter:blur(14px) saturate(1.2);backdrop-filter:blur(14px) saturate(1.2)}
.hb-top{background:linear-gradient(120deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,.07) 55%,rgba(142,227,214,.12) 100%)}
.hb-bot{background:linear-gradient(120deg,rgba(142,227,214,.34) 0%,rgba(142,227,214,.18) 55%,rgba(79,209,192,.12) 100%)}
.hb-border{position:absolute;inset:0;z-index:3;pointer-events:none}
.hb-border-top{background:linear-gradient(135deg,rgba(255,255,255,.8),rgba(142,227,214,.4) 45%,rgba(255,255,255,.08))}
.hb-border-bot{background:linear-gradient(135deg,rgba(142,227,214,.95),rgba(142,227,214,.4) 50%,rgba(255,255,255,.1))}
.hb-sweep{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(100deg,transparent 38%,rgba(255,255,255,.2) 50%,transparent 62%);background-size:250% 100%;background-position:160% 0;animation:hb-sweep 7s ease-in-out infinite}
.hb-bot .hb-sweep{animation-delay:.9s}
@keyframes hb-sweep{0%,55%{background-position:160% 0}100%{background-position:-60% 0}}
.hb-spot{position:absolute;inset:0;z-index:1;pointer-events:none;opacity:0;transition:opacity .4s ease;background:radial-gradient(260px circle at var(--hx,70%) var(--hy,30%),rgba(142,227,214,.24),transparent 65%)}
.hb-wrap:hover .hb-spot{opacity:1}
.hb-bar{position:absolute;left:0;top:0;bottom:0;width:3px;z-index:2;background:linear-gradient(180deg,#8EE3D6,rgba(142,227,214,0))}
.hb-medal{position:absolute;z-index:30;top:50%;transform:translateY(-50%);width:calc(var(--s) * 1.15);height:calc(var(--s) * 1.15);right:calc(var(--s) * -0.075)}
.hb-medal-glow{position:absolute;inset:-35%;border-radius:9999px;pointer-events:none;background:radial-gradient(closest-side,rgba(142,227,214,.4),transparent 70%);animation:hb-breathe 4s ease-in-out infinite}
.hb-medal-ring{position:absolute;inset:0;border-radius:9999px;background:conic-gradient(from 0deg,#8EE3D6,transparent 35%,#4FD1C0 60%,transparent 85%,#8EE3D6);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 2px),#000 calc(100% - 2px));mask:radial-gradient(farthest-side,transparent calc(100% - 2px),#000 calc(100% - 2px));animation:hb-spin 6s linear infinite}
.hb-medal-orbit{position:absolute;inset:-5px;animation:hb-spin 9s linear infinite reverse}
.hb-medal-dot{position:absolute;left:50%;top:0;width:5px;height:5px;margin-left:-2.5px;border-radius:9999px;background:#8EE3D6;box-shadow:0 0 8px 2px rgba(142,227,214,.7)}
.hb-medal-core{position:absolute;inset:4px;border-radius:9999px;background:#0E1020;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12),0 0 18px rgba(142,227,214,.35)}
@keyframes hb-spin{to{transform:rotate(360deg)}}
@keyframes hb-breathe{0%,100%{transform:scale(.92);opacity:.7}50%{transform:scale(1.08);opacity:1}}
@media (prefers-reduced-motion:reduce){.hb-sweep,.hb-medal-ring,.hb-medal-orbit,.hb-medal-glow{animation:none}}
`;

/** Fit a single line into a fixed canvas width without clipping. */
function fitCanvasFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  minPx: number,
  weight: number,
  family: string
) {
  for (let px = startPx; px >= minPx; px -= 2) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return px;
  }
  return minPx;
}

/** Greedy word wrap; the caller shrinks the font until it fits `maxLines`. */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function makeTopTexture(
  THREE: ThreeModule,
  titleTop: string,
  titleBottom: string
) {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 360;
  const ctx = canvas.getContext("2d")!;
  const family = '"Montserrat", "Inter", system-ui, sans-serif';

  ctx.textBaseline = "middle";
  const topSize = fitCanvasFont(ctx, titleTop.toUpperCase(), 1210, 104, 58, 800, family);
  ctx.font = `800 ${topSize}px ${family}`;
  ctx.fillStyle = "#0B0D14";
  ctx.fillText(titleTop.toUpperCase(), 46, 112);

  const bottomSize = fitCanvasFont(ctx, titleBottom.toUpperCase(), 1180, 74, 42, 700, family);
  ctx.font = `700 ${bottomSize}px ${family}`;
  ctx.fillStyle = "#0E7A6E";
  ctx.fillText(titleBottom.toUpperCase(), 46, 244);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeThemeTexture(THREE: ThreeModule, theme: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 360;
  const ctx = canvas.getContext("2d")!;
  const family = '"Montserrat", "Inter", system-ui, sans-serif';

  ctx.fillStyle = "rgba(11,13,20,0.62)";
  ctx.font = `800 42px ${family}`;
  ctx.textBaseline = "middle";
  ctx.fillText("CONFERENCE THEME", 46, 54);

  let size = 66;
  let lines: string[] = [];
  for (; size >= 34; size -= 2) {
    ctx.font = `700 ${size}px ${family}`;
    lines = wrapCanvasText(ctx, `\u201C${theme}\u201D`, 1220, 2);
    if (lines.length <= 2) break;
  }

  ctx.font = `700 ${size}px ${family}`;
  ctx.fillStyle = "#0B0D14";
  const startY = lines.length === 1 ? 196 : 154;
  lines.forEach((line, index) => {
    ctx.fillText(line, 46, startY + index * (size * 1.18));
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeGlowTexture(THREE: ThreeModule) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255,255,255,0.85)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.28)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Extruded slab shapes keep the familiar white/mint headline cards, but give
 * them real bevels, layered depth and an orbiting mint marker instead of the
 * old flat clipped divs.
 */
function makeSlabShape(THREE: ThreeModule, top: boolean) {
  const halfW = BOARD_W / 2;
  const halfH = SLAB_H / 2;
  const shape = new THREE.Shape();

  shape.moveTo(-halfW, -halfH);
  if (top) {
    shape.lineTo(halfW - SLANT, -halfH);
    shape.lineTo(halfW, halfH);
  } else {
    shape.lineTo(halfW, -halfH);
    shape.lineTo(halfW - SLANT, halfH);
  }
  shape.lineTo(-halfW, halfH);
  shape.closePath();
  return shape;
}

function makeTriangleShape(THREE: ThreeModule) {
  const halfW = BOARD_W / 2;
  const halfH = BOARD_H / 2;
  const shape = new THREE.Shape();
  shape.moveTo(halfW - SLANT + 0.03, 0);
  shape.lineTo(halfW - 0.03, halfH + 0.03);
  shape.lineTo(halfW - 0.03, -halfH - 0.03);
  shape.closePath();
  return shape;
}

function extrudeShape(THREE: ThreeModule, shape: InstanceType<ThreeModule["Shape"]>) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.022,
    bevelSegments: 3,
    curveSegments: 4,
  });
  geometry.translate(0, 0, -DEPTH / 2);
  return geometry;
}

export function HeroTitleStage({
  titleTop = "INTERNATIONAL HOLINESS",
  titleBottom = "GENERAL CONFERENCE 2026",
  theme,
  logoSrc = SITE_CONFIG.logo.src,
}: HeroTitleStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // Pointer spotlight for the glass fallback; the 3D canvas takes over once ready.
  const onPlaqueMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--hx",
      `${(event.clientX - rect.left).toFixed(0)}px`
    );
    event.currentTarget.style.setProperty(
      "--hy",
      `${(event.clientY - rect.top).toFixed(0)}px`
    );
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection?.saveData;
    if (reduceMotion || saveData) return;

    let disposed = false;
    let started = false;
    let cleanup = () => {};

    const start = async () => {
      if (started || disposed) return;
      started = true;

      try {
      const THREE = await import("three");
      if (disposed) return;
      await (document.fonts?.ready ?? Promise.resolve());
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.domElement.style.cssText =
        "display:block;width:100%;height:100%;touch-action:pan-y";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
      camera.position.z = 6;

      scene.add(new THREE.AmbientLight(0xffffff, 1.15));
      const key = new THREE.DirectionalLight(0xffffff, 2.1);
      key.position.set(4, 5, 7);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x8ee3d6, 1.35);
      rim.position.set(-5, -2, 4);
      scene.add(rim);

      const rig = new THREE.Group();
      scene.add(rig);
      const board = new THREE.Group();
      rig.add(board);

      const textures: InstanceType<ThreeModule["Texture"]>[] = [];
      const glowTex = makeGlowTexture(THREE);
      textures.push(glowTex);

      const glowMat = new THREE.SpriteMaterial({
        map: glowTex,
        color: 0x8ee3d6,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glow = new THREE.Sprite(glowMat);
      glow.scale.set(7.4, 4.4, 1);
      glow.position.z = -0.55;
      rig.add(glow);

      // A thin mint trace behind the slabs ties this stage to the scroll trail.
      const traceCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.35, -1.72, -0.28),
        new THREE.Vector3(-1.7, -1.28, -0.2),
        new THREE.Vector3(-0.2, -1.64, -0.24),
        new THREE.Vector3(1.55, -0.92, -0.18),
        new THREE.Vector3(3.2, -1.24, -0.28),
      ]);
      const trace = new THREE.Mesh(
        new THREE.TubeGeometry(traceCurve, 120, 0.006, 6, false),
        new THREE.MeshBasicMaterial({
          color: 0x8ee3d6,
          transparent: true,
          opacity: 0.42,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      rig.add(trace);

      const topZ = 0.11;
      const bottomZ = 0;
      const topY = SLAB_H / 2 + GAP / 2;
      const bottomY = -SLAB_H / 2 - GAP / 2;

      const topGeometry = extrudeShape(THREE, makeSlabShape(THREE, true));
      const bottomGeometry = extrudeShape(THREE, makeSlabShape(THREE, false));
      const triangleGeometry = extrudeShape(THREE, makeTriangleShape(THREE));

      const topSlab = new THREE.Mesh(
        topGeometry,
        new THREE.MeshPhysicalMaterial({
          color: 0xf7fbfa,
          roughness: 0.35,
          metalness: 0.03,
          clearcoat: 0.7,
          clearcoatRoughness: 0.22,
        })
      );
      topSlab.position.set(0, topY, topZ);
      board.add(topSlab);

      const bottomSlab = new THREE.Mesh(
        bottomGeometry,
        new THREE.MeshPhysicalMaterial({
          color: 0x8ee3d6,
          roughness: 0.38,
          metalness: 0.05,
          clearcoat: 0.75,
          clearcoatRoughness: 0.2,
        })
      );
      bottomSlab.position.set(0, bottomY, bottomZ);
      board.add(bottomSlab);

      const marker = new THREE.Mesh(
        triangleGeometry,
        new THREE.MeshPhysicalMaterial({
          color: 0x8ee3d6,
          roughness: 0.3,
          metalness: 0.08,
          clearcoat: 1,
          clearcoatRoughness: 0.15,
        })
      );
      marker.position.z = 0.18;
      board.add(marker);

      const outlinedSlabs = [
        { mesh: topSlab, geometry: topGeometry, color: 0x8ee3d6, opacity: 0.32 },
        { mesh: bottomSlab, geometry: bottomGeometry, color: 0x0e7a6e, opacity: 0.32 },
        { mesh: marker, geometry: triangleGeometry, color: 0x8ee3d6, opacity: 0.65 },
      ];
      outlinedSlabs.forEach(({ mesh, geometry, color, opacity }) => {
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geometry),
          new THREE.LineBasicMaterial({ color, transparent: true, opacity })
        );
        edges.position.copy(mesh.position);
        edges.scale.setScalar(1.002);
        board.add(edges);
      });

      const topTex = makeTopTexture(THREE, titleTop, titleBottom);
      const themeTex = makeThemeTexture(THREE, theme);
      textures.push(topTex, themeTex);
      const textPlaneW = BOARD_W - 1.05;
      const textPlaneH = SLAB_H - 0.12;

      const topText = new THREE.Mesh(
        new THREE.PlaneGeometry(textPlaneW, textPlaneH),
        new THREE.MeshBasicMaterial({
          map: topTex,
          transparent: true,
          depthWrite: false,
        })
      );
      topText.position.set(-0.34, topY, topZ + DEPTH / 2 + 0.02);
      board.add(topText);

      const themeText = new THREE.Mesh(
        new THREE.PlaneGeometry(textPlaneW, textPlaneH),
        new THREE.MeshBasicMaterial({
          map: themeTex,
          transparent: true,
          depthWrite: false,
        })
      );
      themeText.position.set(-0.34, bottomY, bottomZ + DEPTH / 2 + 0.02);
      board.add(themeText);

      // The HOREMOW wordmark is loaded independently so the 3D stage never
      // blocks on the image request. The crisp HTML logo remains the fallback.
      const logoMat = new THREE.SpriteMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const logo = new THREE.Sprite(logoMat);
      logo.position.set(BOARD_W / 2 - SLANT / 2 - 0.02, 0, 0.3);
      logo.scale.set(0.42, 0.14, 1);
      logo.visible = false;
      board.add(logo);

      new THREE.TextureLoader().load(
        logoSrc,
        (logoTex) => {
          if (disposed) {
            logoTex.dispose();
            return;
          }
          logoTex.colorSpace = THREE.SRGBColorSpace;
          textures.push(logoTex);
          const image = logoTex.image as { width: number; height: number };
          const aspect = image && image.height ? image.width / image.height : 3;
          const width = 0.42;
          logo.scale.set(width, width / aspect, 1);
          logoMat.map = logoTex;
          logoMat.opacity = 1;
          logoMat.needsUpdate = true;
          logo.visible = true;
        },
        undefined,
        () => {}
      );

      const sparkPositions = new Float32Array(84 * 3);
      for (let i = 0; i < 84; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 2.75 + Math.random() * 0.85;
        sparkPositions[i * 3] = Math.cos(angle) * radius;
        sparkPositions[i * 3 + 1] = Math.sin(angle) * (1.5 + Math.random() * 0.35);
        sparkPositions[i * 3 + 2] = -0.12 + Math.random() * 0.5;
      }
      const sparkGeometry = new THREE.BufferGeometry();
      sparkGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(sparkPositions, 3)
      );
      const sparks = new THREE.Points(
        sparkGeometry,
        new THREE.PointsMaterial({
          color: 0xbff5eb,
          size: 0.018,
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      board.add(sparks);

      const pulseMat = new THREE.MeshBasicMaterial({
        color: 0x8ee3d6,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const pulse = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.008, 8, 120),
        pulseMat
      );
      pulse.visible = false;
      rig.add(pulse);
      let pulseProgress = 1;

      // ---------- Pointer interaction ----------
      const pointer = { x: 0, y: 0 };
      let hovered = false;
      let pressed = false;

      const readPointer = (event: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        hovered = true;
      };
      const onPointerEnter = (event: PointerEvent) => readPointer(event);
      const onPointerMove = (event: PointerEvent) => readPointer(event);
      const onPointerDown = (event: PointerEvent) => {
        readPointer(event);
        pressed = true;
        pulseProgress = 0;
        try {
          host.setPointerCapture(event.pointerId);
        } catch {
          // Pointer capture is a progressive enhancement.
        }
      };
      const onPointerUp = (event: PointerEvent) => {
        pressed = false;
        try {
          host.releasePointerCapture(event.pointerId);
        } catch {
          // Ignore if the pointer was never captured.
        }
      };
      const onPointerLeave = () => {
        if (!pressed) hovered = false;
      };

      host.addEventListener("pointerenter", onPointerEnter);
      host.addEventListener("pointermove", onPointerMove, { passive: true });
      host.addEventListener("pointerdown", onPointerDown);
      host.addEventListener("pointerup", onPointerUp);
      host.addEventListener("pointercancel", onPointerUp);
      host.addEventListener("pointerleave", onPointerLeave);

      // ---------- Layout ----------
      const layout = () => {
        const width = host.clientWidth || 1;
        const height = host.clientHeight || 1;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        const tan = Math.tan((camera.fov * Math.PI) / 360);
        const heightFit = (BOARD_H + 0.85) / (2 * tan);
        const widthFit = (BOARD_W + 0.85) / (2 * tan * camera.aspect);
        camera.position.z = Math.max(4.8, heightFit, widthFit);
        camera.updateProjectionMatrix();
      };
      layout();
      const resizeObserver = new ResizeObserver(layout);
      resizeObserver.observe(host);

      // ---------- Loop ----------
      let raf = 0;
      let cleaned = false;
      let inView = true;
      let tabVisible = !document.hidden;
      let firstFrame = true;
      let lastRender = 0;
      let lastFrameAt = performance.now();
      let intersectionObserver: IntersectionObserver | null = null;
      let onVisibility: (() => void) | null = null;
      const frameInterval = 1000 / LANDING_THEME.motion.webglFps;

      const stopScene = () => {
        if (cleaned) return;
        cleaned = true;
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        intersectionObserver?.disconnect();
        host.removeEventListener("pointerenter", onPointerEnter);
        host.removeEventListener("pointermove", onPointerMove);
        host.removeEventListener("pointerdown", onPointerDown);
        host.removeEventListener("pointerup", onPointerUp);
        host.removeEventListener("pointercancel", onPointerUp);
        host.removeEventListener("pointerleave", onPointerLeave);
        if (onVisibility) {
          document.removeEventListener("visibilitychange", onVisibility);
        }
        scene.traverse((object) => {
          const mesh = object as InstanceType<ThreeModule["Mesh"]>;
          mesh.geometry?.dispose?.();
          const material = mesh.material as
            | InstanceType<ThreeModule["Material"]>
            | InstanceType<ThreeModule["Material"]>[]
            | undefined;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material?.dispose?.();
        });
        textures.forEach((texture) => texture.dispose());
        renderer.forceContextLoss();
        renderer.dispose();
        renderer.domElement.remove();
      };
      cleanup = stopScene;

      const frame = () => {
        raf = 0;
        if (disposed || cleaned) return;
        const nowMs = performance.now();
        if (nowMs - lastRender < frameInterval) {
          schedule();
          return;
        }
        const delta = Math.min(0.05, (nowMs - lastFrameAt) / 1000);
        lastFrameAt = nowMs;
        lastRender = nowMs;
        const t = nowMs / 1000;

        const targetY = hovered
          ? pointer.x * 0.26
          : Math.sin(t * 0.46) * 0.045;
        const targetX = hovered
          ? pointer.y * 0.17
          : Math.cos(t * 0.38) * 0.03;
        board.rotation.y += (targetY - board.rotation.y) * 0.08;
        board.rotation.x += (targetX - board.rotation.x) * 0.08;
        board.position.y = Math.sin(t * 0.85) * 0.035;
        const targetScale = hovered ? (pressed ? 1.005 : 1.025) : 1;
        board.scale.x += (targetScale - board.scale.x) * 0.08;
        board.scale.y = board.scale.x;
        board.scale.z = board.scale.x;

        topSlab.position.z = topZ + pointer.x * 0.025;
        bottomSlab.position.z = bottomZ - pointer.y * 0.02;
        marker.position.z = 0.18 + Math.sin(t * 1.6) * 0.015;
        glowMat.opacity = 0.18 + Math.sin(t * 1.2) * 0.035;
        sparks.rotation.z = t * 0.022;

        if (pulseProgress < 1) {
          pulseProgress = Math.min(1, pulseProgress + delta * 1.35);
          pulse.visible = true;
          pulse.scale.setScalar(1 + pulseProgress * 1.9);
          pulseMat.opacity = (1 - pulseProgress) * 0.55;
        } else {
          pulse.visible = false;
        }

        renderer.render(scene, camera);

        if (firstFrame) {
          firstFrame = false;
          if (!disposed) setReady(true);
        }
        schedule();
      };
      const schedule = () => {
        if (!raf && inView && tabVisible && !disposed && !cleaned) {
          raf = requestAnimationFrame(frame);
        }
      };

      intersectionObserver = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) schedule();
      });
      intersectionObserver.observe(host);

      onVisibility = () => {
        tabVisible = !document.hidden;
        if (tabVisible) schedule();
      };
      document.addEventListener("visibilitychange", onVisibility);

      schedule();
      } catch (error) {
        console.warn("[HeroTitleStage] 3D headline disabled:", error);
        cleanup();
        host.querySelectorAll("canvas").forEach((canvas) => canvas.remove());
      }
    };

    // Delay the extra canvas until the splash has finished; the HTML headline
    // above stays visible and fully readable in the meantime.
    const onIntroComplete = () => void start();
    if (document.documentElement.dataset.intro === "done") {
      onIntroComplete();
    } else {
      window.addEventListener("ihgc:intro-complete", onIntroComplete, {
        once: true,
      });
    }

    return () => {
      disposed = true;
      window.removeEventListener("ihgc:intro-complete", onIntroComplete);
      cleanup();
    };
  }, [titleTop, titleBottom, theme, logoSrc]);

  return (
    <div
      className="hero-title-stage relative w-full"
      data-webgl={ready ? "ready" : "fallback"}
    >
      <style dangerouslySetInnerHTML={{ __html: HB_CSS }} />

      {/* Semantic glass plaque: visible until WebGL is ready and on reduced motion. */}
      <div
        className="hero-title-fallback hb-wrap relative w-full [--s:44px] sm:[--s:56px]"
        onPointerMove={onPlaqueMove}
      >
        <div className="relative grid grid-rows-2 gap-1 sm:gap-1.5">
          <div className="hero-fade relative" style={{ animationDelay: "0.2s" }}>
            <div
              className="hb-plate hb-top relative flex h-full flex-col justify-center py-4 pl-4 pr-10 sm:py-5 sm:pl-6 sm:pr-14"
              style={{ clipPath: shape(TOP_OUTER) }}
            >
              <span aria-hidden className="hb-bar" />
              <span aria-hidden className="hb-sweep" />
              <span aria-hidden className="hb-spot" />
              <h1 className="relative z-[2] whitespace-nowrap bg-gradient-to-r from-white to-[#CFF5EE] bg-clip-text text-[4.2vw] font-extrabold uppercase leading-[1.1] tracking-tight text-transparent sm:text-3xl">
                {titleTop}
              </h1>
              <h2 className="relative z-[2] mt-0.5 whitespace-nowrap text-[3.2vw] font-bold uppercase leading-[1.2] tracking-wide text-[#8EE3D6] sm:mt-1 sm:text-xl">
                {titleBottom}
              </h2>
            </div>
            <div
              aria-hidden
              className="hb-border hb-border-top"
              style={{ clipPath: ring(TOP_OUTER, TOP_INNER) }}
            />
          </div>

          <div className="hero-fade relative" style={{ animationDelay: "0.5s" }}>
            <div
              className="hb-plate hb-bot relative flex h-full flex-col justify-center py-4 pl-4 sm:py-5 sm:pl-6"
              style={{ clipPath: shape(BOT_OUTER) }}
            >
              <span aria-hidden className="hb-sweep" />
              <span aria-hidden className="hb-spot" />
              <span
                aria-hidden
                className="pointer-events-none absolute -top-3 right-[calc(var(--s)+6px)] select-none font-serif text-[88px] leading-none text-[#8EE3D6]/15 sm:text-[110px]"
              >
                &ldquo;
              </span>
              <span className="relative z-[2] inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8EE3D6] sm:text-sm">
                <span aria-hidden className="h-px w-5 bg-[#8EE3D6]/70" />
                THEME
              </span>
              <FitTwoLines
                text={`\u201C${theme}\u201D`}
                minFont={10}
                className="relative z-[2] mt-1 pr-[calc(var(--s)+8px)] text-[13px] font-extrabold leading-snug tracking-tight text-white sm:mt-1.5 sm:text-xl md:text-2xl"
              />
            </div>
            <div
              aria-hidden
              className="hb-border hb-border-bot"
              style={{ clipPath: ring(BOT_OUTER, BOT_INNER) }}
            />
          </div>

          <div className="hb-medal">
            <span aria-hidden className="hb-medal-glow" />
            <span aria-hidden className="hb-medal-orbit">
              <span className="hb-medal-dot" />
            </span>
            <span aria-hidden className="hb-medal-ring" />
            <div className="hb-medal-core">
              <div className="relative h-full w-full p-[3px]">
                <div className="relative h-full w-full">
                  <Image
                    src={logoSrc}
                    alt={SITE_CONFIG.logo.alt}
                    fill
                    priority
                    fetchPriority="high"
                    sizes="(max-width: 639px) 44px, 56px"
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={hostRef} className="hero-title-canvas absolute inset-0 z-10" aria-hidden />
    </div>
  );
}
