"use client";

import { useEffect, useRef } from "react";

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

// ---------- dial drawing helpers ----------

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

/** Soft radial sprite used for the orbiting logo beacon and second-hand head. */
function makeGlowCanvas() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.32, "rgba(255,255,255,0.3)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
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

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      try {
        const THREE = await import("three");
        if (disposed) return;
        await (document.fonts?.ready ?? Promise.resolve());
        if (disposed) return;

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.domElement.style.cssText =
          "display:block;width:100%;height:100%;touch-action:pan-y";
        host.appendChild(renderer.domElement);

        const glowTex = new THREE.CanvasTexture(makeGlowCanvas());
        glowTex.colorSpace = THREE.SRGBColorSpace;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
        camera.position.set(0, 0, 5.2);

        // ---------- Studio lighting (reflections for the metal) ----------
        let pmrem: InstanceType<typeof THREE.PMREMGenerator> | null = null;
        let envTex: InstanceType<typeof THREE.Texture> | null = null;
        try {
          const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
          pmrem = new THREE.PMREMGenerator(renderer);
          const envScene = new RoomEnvironment();
          envTex = pmrem.fromScene(envScene, 0.04).texture;
          scene.environment = envTex;
          (scene as unknown as { environmentIntensity: number }).environmentIntensity = 0.9;
        } catch (err) {
          console.warn("[ConferenceClock3D] environment lighting skipped:", err);
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

        // ---------- Case + bezel ----------
        const graphite = new THREE.MeshStandardMaterial({ color: 0x2b2f37, metalness: 0.85, roughness: 0.4 });
        const graphiteLight = new THREE.MeshStandardMaterial({ color: 0x59606b, metalness: 0.9, roughness: 0.28 });
        const mint = new THREE.MeshBasicMaterial({ color: 0x8ee3d6 });

        // The case sits BEHIND the dial: its front face is at z = 0.08, the dial at z = 0.1.
        const caseGeo = new THREE.CylinderGeometry(1.09, 1.12, 0.2, 96, 1);
        caseGeo.rotateX(Math.PI / 2);
        const caseMesh = new THREE.Mesh(caseGeo, graphite);
        caseMesh.position.z = -0.02;
        clock.add(caseMesh);

        const bezel = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.085, 28, 160), graphiteLight);
        bezel.position.z = 0.1;
        clock.add(bezel);

        const lip = new THREE.Mesh(new THREE.TorusGeometry(0.915, 0.012, 12, 160), mint);
        lip.position.z = 0.11;
        clock.add(lip);

<<<<<<< HEAD
        // Orbital rings around the case, echoing the globe and scroll trace.
        const orbitMaterial = new THREE.MeshBasicMaterial({
          color: 0x8ee3d6,
          transparent: true,
          opacity: 0.34,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const orbitA = new THREE.Mesh(
          new THREE.TorusGeometry(1.2, 0.007, 10, 180),
          orbitMaterial
        );
        orbitA.rotation.x = Math.PI / 2.5;
        clock.add(orbitA);
        const orbitB = new THREE.Mesh(
          new THREE.TorusGeometry(1.28, 0.005, 10, 180),
          orbitMaterial
        );
        orbitB.rotation.set(0.4, 0.8, Math.PI / 3);
        clock.add(orbitB);

        // ---------- Countdown progress ring ----------
        // One instanced draw call lights 60 physical ticks as seconds run down.
        const tickLitColor = new THREE.Color(0x8ee3d6);
        const tickDimColor = new THREE.Color(0x3a4657);
        const progressTicks = new THREE.InstancedMesh(
          new THREE.BoxGeometry(0.014, 0.07, 0.014),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.92 }),
          60
        );
        const tickMatrix = new THREE.Matrix4();
        for (let i = 0; i < 60; i += 1) {
          const angle = (i / 60) * Math.PI * 2;
          tickMatrix.makeRotationZ(-angle);
          tickMatrix.setPosition(
            Math.sin(angle) * 1.34,
            Math.cos(angle) * 1.34,
            0.035
          );
          progressTicks.setMatrixAt(i, tickMatrix);
          progressTicks.setColorAt(i, tickDimColor);
        }
        progressTicks.instanceMatrix.needsUpdate = true;
        if (progressTicks.instanceColor) progressTicks.instanceColor.needsUpdate = true;
        clock.add(progressTicks);

        const progressHead = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTex,
            color: 0x8ee3d6,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        progressHead.scale.set(0.2, 0.2, 1);
        progressHead.visible = false;
        clock.add(progressHead);

        // ---------- HOREMOW logo orbit ----------
        // The image wordmark rides a tilted 3D track above the dial with its
        // own beacon, so the clock reads as a branded countdown showcase.
        const logoOrbit = new THREE.Group();
        logoOrbit.rotation.x = -0.62;
        clock.add(logoOrbit);

        logoOrbit.add(
          new THREE.Mesh(
            new THREE.TorusGeometry(1.44, 0.004, 8, 180),
            new THREE.MeshBasicMaterial({
              color: 0x8ee3d6,
              transparent: true,
              opacity: 0.22,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            })
          )
        );

        const orbitLogoMat = new THREE.SpriteMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        const orbitLogo = new THREE.Sprite(orbitLogoMat);
        orbitLogo.visible = false;
        logoOrbit.add(orbitLogo);

        const orbitBeacon = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTex,
            color: 0x8ee3d6,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        orbitBeacon.scale.set(0.3, 0.3, 1);
        orbitBeacon.visible = false;
        logoOrbit.add(orbitBeacon);

        // Pulse ring fires on pointer/touch interaction.
        const pulseMat = new THREE.MeshBasicMaterial({
          color: 0x8ee3d6,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const pulseRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.04, 0.01, 8, 120),
          pulseMat
        );
        pulseRing.visible = false;
        clock.add(pulseRing);
        let pulseProgress = 1;

=======
>>>>>>> dcb5da2 (save my local changes)
        // ---------- Dial ----------
        const faceTex = new THREE.CanvasTexture(makeFaceCanvas(title, theme));
        faceTex.colorSpace = THREE.SRGBColorSpace;
        faceTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
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

        const logoHaloMat = new THREE.MeshBasicMaterial({
          color: 0x8ee3d6,
          transparent: true,
          opacity: 0.36,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const logoHalo = new THREE.Mesh(
          new THREE.TorusGeometry(0.35, 0.006, 8, 96),
          logoHaloMat
        );
        logoHalo.position.z = 0.106;
        clock.add(logoHalo);

        let logoTex: InstanceType<typeof THREE.Texture> | null = null;
        new THREE.TextureLoader().load(
          logoSrc,
          (tex) => {
            if (disposed) {
              tex.dispose();
              return;
            }
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 4;
            logoTex = tex;
            const img = tex.image as { width: number; height: number };
            const aspect = img && img.height ? img.width / img.height : 1;
            logo.scale.set(aspect > 1 ? 1 : aspect, aspect > 1 ? 1 / aspect : 1, 1);
            logoMat.map = tex;
            logoMat.opacity = 1;
            logoMat.needsUpdate = true;

            // Reuse the same image for the orbiting brand badge.
            const orbitWidth = 0.46;
            orbitLogo.scale.set(orbitWidth, orbitWidth / aspect, 1);
            orbitLogoMat.map = tex;
            orbitLogoMat.opacity = 1;
            orbitLogoMat.needsUpdate = true;
            orbitLogo.visible = true;
            orbitBeacon.visible = true;
          },
          undefined,
          (err) => console.warn("[ConferenceClock3D] logo failed to load:", err)
        );

        // ---------- Hands ----------
        const handMat = new THREE.MeshStandardMaterial({ color: 0xe8eef2, metalness: 0.8, roughness: 0.3 });
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

        // ---------- Glass + moving highlight ----------
        const glass = new THREE.Mesh(
          new THREE.CircleGeometry(0.93, 96),
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
          new THREE.CircleGeometry(0.93, 96),
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

        // ---------- Size ----------
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

        // ---------- Pointer ----------
        // Local pointer/touch interaction: hover tilts, drag spins the dial,
        // and a tap/click sends a mint pulse through the case.
        const pointer = { x: 0, y: 0 };
        const drag = { x: 0, y: 0, lastX: 0, lastY: 0 };
        let hasPointer = false;
        let dragging = false;

        const readPointer = (e: PointerEvent) => {
          const rect = host.getBoundingClientRect();
          pointer.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
          pointer.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
          hasPointer = true;
        };
        const onPointerEnter = (e: PointerEvent) => readPointer(e);
        const onPointerMove = (e: PointerEvent) => {
          readPointer(e);
          if (!dragging) return;
          drag.x = Math.max(-0.7, Math.min(0.7, drag.x + (e.clientX - drag.lastX) * 0.006));
          // Touch keeps vertical scrolling, so only mouse/pen rotate on Y.
          if (e.pointerType !== "touch") {
            drag.y = Math.max(-0.45, Math.min(0.45, drag.y + (e.clientY - drag.lastY) * 0.006));
          }
          drag.lastX = e.clientX;
          drag.lastY = e.clientY;
        };
        const onPointerDown = (e: PointerEvent) => {
          readPointer(e);
          dragging = true;
          drag.lastX = e.clientX;
          drag.lastY = e.clientY;
          pulseProgress = 0;
          try {
            host.setPointerCapture(e.pointerId);
          } catch {
            // Pointer capture is a progressive enhancement.
          }
        };
        const onPointerUp = (e: PointerEvent) => {
          dragging = false;
          try {
            host.releasePointerCapture(e.pointerId);
          } catch {
            // Ignore when the pointer was never captured.
          }
        };
        const onPointerLeave = () => {
          if (!dragging) hasPointer = false;
        };

        host.addEventListener("pointerenter", onPointerEnter);
        host.addEventListener("pointermove", onPointerMove, { passive: true });
        host.addEventListener("pointerdown", onPointerDown);
        host.addEventListener("pointerup", onPointerUp);
        host.addEventListener("pointercancel", onPointerUp);
        host.addEventListener("pointerleave", onPointerLeave);

        // ---------- Loop ----------
        let raf = 0;
        let inView = true;
        let tabVisible = !document.hidden;
        let firstFrame = true;
<<<<<<< HEAD
        let lastRender = 0;
        let lastFrameAt = performance.now();
        let lastLitTicks = -1;
        const frameInterval = 1000 / LANDING_THEME.motion.webglFps;
=======
>>>>>>> dcb5da2 (save my local changes)
        const TAU = Math.PI * 2;

        const frame = () => {
          raf = 0;
          if (disposed) return;
<<<<<<< HEAD
          const nowMs = performance.now();
          if (nowMs - lastRender < frameInterval) {
            schedule();
            return;
          }
          const delta = Math.min(0.05, (nowMs - lastFrameAt) / 1000);
          lastFrameAt = nowMs;
          lastRender = nowMs;
          const t = nowMs / 1000;
=======
          const t = performance.now() / 1000;
>>>>>>> dcb5da2 (save my local changes)

          // Hands = time left. They turn backwards as the countdown runs down.
          const tgt = targetRef.current;
          const rem = tgt === null ? 0 : Math.max(0, tgt - Date.now());
          const secF = (rem % 60000) / 1000;
          const minF = (rem % 3600000) / 60000;
          const hourF = (rem % 43200000) / 3600000;
          secondHand.rotation.z = -(secF / 60) * TAU;
          minuteHand.rotation.z = -(minF / 60) * TAU;
          hourHand.rotation.z = -(hourF / 12) * TAU;

          // Light the countdown ticks from twelve o'clock to the live second.
          const litTicks = tgt === null ? 0 : Math.ceil(secF);
          if (litTicks !== lastLitTicks) {
            lastLitTicks = litTicks;
            for (let i = 0; i < 60; i += 1) {
              progressTicks.setColorAt(i, i < litTicks ? tickLitColor : tickDimColor);
            }
            if (progressTicks.instanceColor) {
              progressTicks.instanceColor.needsUpdate = true;
            }
          }
          const secondAngle = (secF / 60) * TAU;
          progressHead.position.set(
            Math.sin(secondAngle) * 1.34,
            Math.cos(secondAngle) * 1.34,
            0.11
          );
          progressHead.visible = tgt !== null && rem > 0;

          // Tilt toward the pointer, sway when idle, and keep drag momentum.
          const sway = reduceMotion ? 0 : 1;
          const ty =
            (hasPointer ? pointer.x * 0.4 : Math.sin(t * 0.7) * 0.24) * sway + drag.x;
          const tx =
            (hasPointer ? pointer.y * 0.27 : Math.cos(t * 0.5) * 0.13) * sway + drag.y;
          clock.rotation.y += (ty - clock.rotation.y) * 0.08;
          clock.rotation.x += (tx - clock.rotation.x) * 0.08;
          if (!dragging) {
            drag.x *= 0.9;
            drag.y *= 0.9;
          }
          clock.position.y = Math.sin(t * 1.1) * 0.03 * sway;

<<<<<<< HEAD
          // Orbital rings and the HOREMOW badge keep the showcase alive.
          orbitA.rotation.z = t * 0.16;
          orbitB.rotation.z = -t * 0.11;
          logoOrbit.rotation.z = t * 0.24;
          const logoAngle = t * 0.85;
          orbitLogo.position.set(
            Math.cos(logoAngle) * 1.44,
            Math.sin(logoAngle) * 1.44,
            0
          );
          orbitBeacon.position.copy(orbitLogo.position);
          orbitBeacon.position.z = -0.01;
          const haloPulse = 1 + Math.sin(t * 2.1) * 0.07;
          logoHalo.scale.setScalar(haloPulse);
          logoHaloMat.opacity = 0.3 + Math.sin(t * 2.1) * 0.11;

          if (pulseProgress < 1) {
            pulseProgress = Math.min(1, pulseProgress + delta * 1.45);
            pulseRing.visible = true;
            pulseRing.scale.setScalar(1 + pulseProgress * 0.72);
            pulseMat.opacity = (1 - pulseProgress) * 0.65;
          } else {
            pulseRing.visible = false;
          }

=======
>>>>>>> dcb5da2 (save my local changes)
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
          if (!raf && inView && tabVisible && !disposed) raf = requestAnimationFrame(frame);
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

        schedule();

        cleanup = () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          io.disconnect();
          host.removeEventListener("pointerenter", onPointerEnter);
          host.removeEventListener("pointermove", onPointerMove);
          host.removeEventListener("pointerdown", onPointerDown);
          host.removeEventListener("pointerup", onPointerUp);
          host.removeEventListener("pointercancel", onPointerUp);
          host.removeEventListener("pointerleave", onPointerLeave);
          document.removeEventListener("visibilitychange", onVis);
          scene.traverse((o) => {
            const m = o as InstanceType<typeof THREE.Mesh>;
            m.geometry?.dispose?.();
            const mat = m.material as InstanceType<typeof THREE.Material> | InstanceType<typeof THREE.Material>[] | undefined;
            if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
            else mat?.dispose?.();
          });
          faceTex.dispose();
          glareTex.dispose();
          glowTex.dispose();
          logoTex?.dispose();
          envTex?.dispose();
          pmrem?.dispose();
          renderer.forceContextLoss();
          renderer.dispose();
          renderer.domElement.remove();
        };
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
      {/* Shown until the first 3D frame (or forever if WebGL is unavailable) */}
      <div
        ref={fallbackRef}
        className="absolute inset-[14%] rounded-full bg-contain bg-center bg-no-repeat transition-opacity duration-500"
        style={{ backgroundImage: `url(${logoSrc})` }}
      />
      <div ref={hostRef} className="absolute inset-0" />
    </div>
  );
}
