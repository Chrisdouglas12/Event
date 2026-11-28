
"use client";

import { useEffect, useRef } from "react";
import {
  getLandingPerformance,
  whenLandingIntroDone,
} from "@/lib/landing-performance";

type ConferenceClock3DProps = {
  /** Countdown deadline in ms (Date.now() scale). null = hands rest at 12. */
  target: number | null;
  /** Conference name, printed around the top of the dial */
  title: string;
  /** Theme, printed around the bottom of the dial */
  theme: string;
  /** Logo shown in the centre of the dial */
  logoSrc: string;
  className?: string;
};

/**
 * A custom 3D conference clock (three.js).
 *
 *  - Graphite metal case + bezel with a mint lip, lit by a studio environment
 *  - Dial printed with the conference name (top arc) and the theme (bottom arc)
 *  - The logo sits in the centre, the hands turn over it
 *  - The hands show the COUNTDOWN: they sweep backwards as the time runs down
 *    (seconds hand = seconds left, minute hand = minutes left, hour hand = hours left)
 *  - Tilts toward the pointer, sways on its own on touch screens
 *  - Pauses when off-screen; reduced-motion users get no sway
 */


function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  radius: number,
  maxSpan: number,
  weight: number,
  family: string,
  startPx: number,
  minPx: number,
  spacingRatio: number
) {
  for (let px = startPx; px >= minPx; px -= 1) {
    ctx.font = `${weight} ${px}px ${family}`;
    const width = [...text].reduce((sum, ch) => sum + ctx.measureText(ch).width + px * spacingRatio, 0);
    if (width / radius <= maxSpan) return px;
  }
  return minPx;
}

/** theta: 0 = 12 o'clock, clockwise. bottom=true reads upright along the bottom. */
function drawArcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  centerTheta: number,
  font: string,
  spacing: number,
  bottom: boolean
) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) / radius;
  let cum = 0;
  chars.forEach((ch, i) => {
    const mid = (cum + widths[i] / 2) / radius;
    cum += widths[i];
    const theta = bottom ? centerTheta + total / 2 - mid : centerTheta - total / 2 + mid;
    ctx.save();
    ctx.translate(cx + radius * Math.sin(theta), cy - radius * Math.cos(theta));
    ctx.rotate(bottom ? theta + Math.PI : theta);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

function makeFaceCanvas(title: string, theme: string) {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;

  // Deep navy dial
  const bg = ctx.createRadialGradient(cx, cy, 40, cx, cy, 512);
  bg.addColorStop(0, "#1d2740");
  bg.addColorStop(0.55, "#121a2d");
  bg.addColorStop(1, "#090d18");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Soft mint glow behind the logo
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 270);
  glow.addColorStop(0, "rgba(142,227,214,0.18)");
  glow.addColorStop(1, "rgba(142,227,214,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Text band rings
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  [452, 392].forEach((r) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // 60 ticks, hour ticks in mint
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const long = i % 5 === 0;
    const r1 = 504;
    const r2 = long ? 458 : 484;
    ctx.lineWidth = long ? 7 : 3;
    ctx.strokeStyle = long ? "#8EE3D6" : "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.moveTo(cx + r1 * Math.sin(a), cy - r1 * Math.cos(a));
    ctx.lineTo(cx + r2 * Math.sin(a), cy - r2 * Math.cos(a));
    ctx.stroke();
  }

  const family = '"Montserrat", "Inter", system-ui, sans-serif';

  // Conference name along the top arc
  const t1 = title.toUpperCase();
  const px1 = fitFont(ctx, t1, 404, 2.7, 800, family, 44, 22, 0.14);
  ctx.fillStyle = "#EAF1F5";
  drawArcText(ctx, t1, cx, cy, 404, 0, `800 ${px1}px ${family}`, px1 * 0.14, false);

  // Theme along the bottom arc (reads upright)
  const t2 = theme.toUpperCase();
  const px2 = fitFont(ctx, t2, 444, 2.5, 700, family, 36, 16, 0.1);
  ctx.fillStyle = "#8EE3D6";
  drawArcText(ctx, t2, cx, cy, 444, Math.PI, `700 ${px2}px ${family}`, px2 * 0.1, true);

  // Diamonds at 3 and 9 o'clock separate the two texts
  ctx.fillStyle = "#8EE3D6";
  [cx - 424, cx + 424].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, cy - 12);
    ctx.lineTo(x + 9, cy);
    ctx.lineTo(x, cy + 12);
    ctx.lineTo(x - 9, cy);
    ctx.closePath();
    ctx.fill();
  });

  return c;
}

function makeGlareCanvas() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 256, 256);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.4, "rgba(255,255,255,0)");
  g.addColorStop(0.5, "rgba(255,255,255,0.3)");
  g.addColorStop(0.6, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return c;
}

export function ConferenceClock3D({ target, title, theme, logoSrc, className = "" }: ConferenceClock3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<number | null>(target);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const perf = getLandingPerformance();
    if (!perf.clockWebgl) {
      fallbackRef.current?.classList.add("cc-static-clock");
      return;
    }

    let disposed = false;
    let cleanup = () => {};

    // Preload the clock chunks while the splash plays. Building the scene
    // behind the overlay removes the post-intro loading pause; only the first
    // frame is held back until the intro hands control to the page.
    const introReady = whenLandingIntroDone();
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    const threeReady = import("three");
    const roomEnvironmentReady = import("three/examples/jsm/environments/RoomEnvironment.js")
      .catch((err) => {
        console.warn("[ConferenceClock3D] environment lighting skipped:", err);
        return null;
      });

    (async () => {
      try {
        const [THREE, roomEnvironmentModule] = await Promise.all([
          threeReady,
          roomEnvironmentReady,
        ]);
        if (disposed) return;

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, perf.maxDpr));
        renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
        host.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
        camera.position.set(0, 0, 5.2);

        let pmrem: InstanceType<typeof THREE.PMREMGenerator> | null = null;
        let envTex: InstanceType<typeof THREE.Texture> | null = null;
        if (roomEnvironmentModule) {
          try {
            pmrem = new THREE.PMREMGenerator(renderer);
            const envScene = new roomEnvironmentModule.RoomEnvironment();
            envTex = pmrem.fromScene(envScene, 0.04).texture;
            scene.environment = envTex;
            (scene as unknown as { environmentIntensity: number }).environmentIntensity = 1;
          } catch (err) {
            console.warn("[ConferenceClock3D] environment lighting skipped:", err);
          }
        }
        scene.add(new THREE.AmbientLight(0xffffff, 0.45));
        const key = new THREE.DirectionalLight(0xffffff, 2.0);
        key.position.set(3, 4, 5);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x8ee3d6, 1.4);
        rim.position.set(-4, -2, 3);
        scene.add(rim);

        const clock = new THREE.Group();
        scene.add(clock);

        const graphite = new THREE.MeshStandardMaterial({
          color: 0x2b2f37,
          metalness: 0.85,
          roughness: 0.4,
        });
        const graphiteLight = new THREE.MeshStandardMaterial({
          color: 0x59606b,
          metalness: 0.9,
          roughness: 0.28,
        });
        const mint = new THREE.MeshBasicMaterial({ color: 0x8ee3d6 });

        // The case sits BEHIND the dial: its front face is at z = 0.08, the dial at z = 0.1.
        const caseGeo = new THREE.CylinderGeometry(1.09, 1.12, 0.2, 96, 1);
        caseGeo.rotateX(Math.PI / 2);
        const caseMesh = new THREE.Mesh(caseGeo, graphite);
        caseMesh.position.z = -0.02;
        clock.add(caseMesh);

        const bezel = new THREE.Mesh(
          new THREE.TorusGeometry(1.0, 0.085, 28, 160),
          graphiteLight
        );
        bezel.position.z = 0.1;
        clock.add(bezel);

        const lip = new THREE.Mesh(new THREE.TorusGeometry(0.915, 0.012, 12, 160), mint);
        lip.position.z = 0.11;
        clock.add(lip);

        const faceTex = new THREE.CanvasTexture(makeFaceCanvas(title, theme));
        faceTex.colorSpace = THREE.SRGBColorSpace;
        faceTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        // Draw with the fonts available now, then sharpen the dial when the
        // webfonts settle. Font loading no longer holds up the 3D clock.
        void fontsReady.then(() => {
          if (disposed) return;
          faceTex.image = makeFaceCanvas(title, theme);
          faceTex.needsUpdate = true;
        });
        const face = new THREE.Mesh(
          new THREE.CircleGeometry(0.92, 128),
          new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.85, metalness: 0 })
        );
        face.position.z = 0.1;
        clock.add(face);

        // Logo in the centre
        const logoBack = new THREE.Mesh(
          new THREE.CircleGeometry(0.36, 64),
          new THREE.MeshStandardMaterial({ color: 0x0b0f1a, roughness: 0.7 })
        );
        logoBack.position.z = 0.102;
        clock.add(logoBack);

        const logoMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
        const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), logoMat);
        logo.position.z = 0.104;
        clock.add(logo);

        const logoRing = new THREE.Mesh(new THREE.TorusGeometry(0.365, 0.008, 10, 96), mint);
        logoRing.position.z = 0.105;
        clock.add(logoRing);

        let logoTex: InstanceType<typeof THREE.Texture> | null = null;
        new THREE.TextureLoader().load(
          logoSrc,
          (tex) => {
            if (disposed) {
              tex.dispose();
              return;
            }
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
            logoTex = tex;
            const img = tex.image as { width: number; height: number };
            const aspect = img && img.height ? img.width / img.height : 1;
            logo.scale.set(aspect > 1 ? 1 : aspect, aspect > 1 ? 1 / aspect : 1, 1);
            logoMat.map = tex;
            logoMat.opacity = 1;
            logoMat.needsUpdate = true;
          },
          undefined,
          (err) => console.warn("[ConferenceClock3D] logo failed to load:", err)
        );

        const handMat = new THREE.MeshStandardMaterial({ color: 0xe8eef2, metalness: 0.9, roughness: 0.22 });
        const secMat = new THREE.MeshStandardMaterial({
          color: 0x8ee3d6,
          emissive: 0x2a8a7f,
          emissiveIntensity: 0.6,
          metalness: 0.5,
          roughness: 0.35,
        });
        const makeHand = (w: number, len: number, tail: number, mat: InstanceType<typeof THREE.Material>, z: number) => {
          const geo = new THREE.BoxGeometry(w, len, 0.018);
          geo.translate(0, len / 2 - tail, 0);
          const pivot = new THREE.Group();
          pivot.position.z = z;
          pivot.add(new THREE.Mesh(geo, mat));
          clock.add(pivot);
          return pivot;
        };
        const hourHand = makeHand(0.07, 0.46, 0.08, handMat, 0.13);
        const minuteHand = makeHand(0.05, 0.74, 0.1, handMat, 0.145);
        const secondHand = makeHand(0.018, 0.86, 0.2, secMat, 0.16);

        const capGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.05, 32);
        capGeo.rotateX(Math.PI / 2);
        const cap = new THREE.Mesh(capGeo, graphiteLight);
        cap.position.z = 0.17;
        clock.add(cap);
        const capDotGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.06, 24);
        capDotGeo.rotateX(Math.PI / 2);
        const capDot = new THREE.Mesh(capDotGeo, mint);
        capDot.position.z = 0.175;
        clock.add(capDot);

        const glass = new THREE.Mesh(
          new THREE.CircleGeometry(0.93, 128),
          new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.07,
            roughness: 0.05,
            metalness: 0,
            clearcoat: 1,
            clearcoatRoughness: 0.05,
            depthWrite: false,
          })
        );
        glass.position.z = 0.2;
        clock.add(glass);

        const glareTex = new THREE.CanvasTexture(makeGlareCanvas());
        const glare = new THREE.Mesh(
          new THREE.CircleGeometry(0.93, 128),
          new THREE.MeshBasicMaterial({
            map: glareTex,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0.6,
          })
        );
        glare.position.z = 0.205;
        clock.add(glare);

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

        const pointer = { x: 0, y: 0 };
        let hasPointer = false;
        const onPointer = (e: PointerEvent) => {
          if (e.pointerType === "touch") return;
          hasPointer = true;
          pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
          pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
        };
        if (perf.pointerEffects) {
          window.addEventListener("pointermove", onPointer, { passive: true });
        }

        let raf = 0;
        let inView = true;
        let tabVisible = !document.hidden;
        let introDone = false;
        let firstFrame = true;
        let lastFrame = 0;
        const frameInterval = 1000 / perf.fps;
        const TAU = Math.PI * 2;

        const frame = (timestamp = 0) => {
          raf = 0;
          if (disposed) return;
          if (timestamp && timestamp - lastFrame < frameInterval) {
            schedule();
            return;
          }
          lastFrame = timestamp || performance.now();
          const t = performance.now() / 1000;

          // Hands = time left. They turn backwards as the countdown runs down.
          const tgt = targetRef.current;
          const rem = tgt === null ? 0 : Math.max(0, tgt - Date.now());
          const secF = (rem % 60000) / 1000;
          const minF = (rem % 3600000) / 60000;
          const hourF = (rem % 43200000) / 3600000;
          secondHand.rotation.z = -(secF / 60) * TAU;
          minuteHand.rotation.z = -(minF / 60) * TAU;
          hourHand.rotation.z = -(hourF / 12) * TAU;

          // Tilt toward the pointer, or sway on its own
          const sway = reduceMotion ? 0 : 1;
          const ty = (hasPointer ? pointer.x * 0.45 : Math.sin(t * 0.7) * 0.28) * sway;
          const tx = (hasPointer ? pointer.y * 0.32 : Math.cos(t * 0.5) * 0.14) * sway;
          clock.rotation.y += (ty - clock.rotation.y) * 0.07;
          clock.rotation.x += (tx - clock.rotation.x) * 0.07;
          clock.position.y = Math.sin(t * 1.1) * 0.03 * sway;

          // Highlight slides across the glass as it tilts
          glareTex.offset.x = clock.rotation.y * 0.35;
          glareTex.offset.y = -clock.rotation.x * 0.3;

          renderer.render(scene, camera);

          if (firstFrame) {
            firstFrame = false;
            if (fallbackRef.current) fallbackRef.current.style.opacity = "0";
          }
          schedule();
        };
        const schedule = () => {
          if (!raf && introDone && inView && tabVisible && !disposed) raf = requestAnimationFrame(frame);
        };

        const io = new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting;
          if (inView) schedule();
        });
        io.observe(host);

        const onVis = () => {
          tabVisible = !document.hidden;
          if (tabVisible) schedule();
        };
        document.addEventListener("visibilitychange", onVis);

        // If the GPU drops the context, bring back the static clock face so
        // the countdown never disappears mid-scroll on a low-end device.
        const onContextLost = (event: Event) => {
          event.preventDefault();
          cancelAnimationFrame(raf);
          raf = 0;
          firstFrame = true;
          if (fallbackRef.current) fallbackRef.current.style.opacity = "";
        };
        const onContextRestored = () => schedule();
        renderer.domElement.addEventListener("webglcontextlost", onContextLost);
        renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

        cleanup = () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          io.disconnect();
          if (perf.pointerEffects) window.removeEventListener("pointermove", onPointer);
          document.removeEventListener("visibilitychange", onVis);
          renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
          renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);
          scene.traverse((o) => {
            const m = o as InstanceType<typeof THREE.Mesh>;
            m.geometry?.dispose?.();
            const mat = m.material as InstanceType<typeof THREE.Material> | InstanceType<typeof THREE.Material>[] | undefined;
            if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
            else mat?.dispose?.();
          });
          faceTex.dispose();
          glareTex.dispose();
          logoTex?.dispose();
          envTex?.dispose();
          pmrem?.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };

        await introReady;
        if (disposed) return;
        introDone = true;
        schedule();
      } catch (err) {
        console.warn("[ConferenceClock3D] 3D clock disabled:", err);
      }
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [title, theme, logoSrc]);

  return (
    <div className={`relative ${className}`} aria-hidden>
      {/* Fallback until WebGL is ready, or permanently if unavailable. */}
      <div
        ref={fallbackRef}
        className="absolute inset-[14%] rounded-full bg-contain bg-center bg-no-repeat transition-opacity duration-500"
        style={{ backgroundImage: `url(${logoSrc})` }}
      />
      <div ref={hostRef} className="absolute inset-0" />
    </div>
  );
}
