"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import {
  createFallbackModel,
  createModelInstance,
  loadTravelModel,
} from "@/lib/travel-models";

/**
 * Earth with two orbits of flags, as in the sketch:
 *  - eq1: a vertical orbit (over the poles)
 *  - eq2: a wide, slightly tilted horizontal orbit
 *
 * - Earth centred, equator is a straight horizontal line through the middle
 * - Flags connect seamlessly into one continuous belt
 * - Both rings rotate as ONE rigid body
 * - Background features moving constellations and starfields
 *
 * DESKTOP LAYOUT: the globe always stays on the camera axis and is moved on
 * screen with a camera "lens shift" (setViewOffset) instead of moving it in 3D.
 * Moving a sphere sideways under a perspective camera stretches it into an
 * oval; the lens shift keeps it a perfect circle. The globe is centred in the
 * free space between the screen edge and the hero text column
 * ([data-hero-content]), so the gap to the screen edge equals the gap to the boxes.
 * `desktopLift` nudges the globe upward in pixels on desktop only. With
 * `shrinkOnScroll`, the globe keeps shrinking over the full page like a drone
 * rising, instead of only reacting to the first viewport.
 *
 * The background is intentionally a single flat navy field (#0E1020): the
 * WebGL canvas is transparent and no photo/gradient layers sit behind it.
 */

// Visual radius of the globe + rings, in world units (outer ring 2.44 + flag depth)
const R_VIS = 2.55;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function HeroBackground({
  align = "left",
  desktopLift = 0,
  mobileLift = 0,
  shrinkOnScroll = false,
  richAtmosphere = false,
}: {
  align?: "left" | "right";
  desktopLift?: number;
  /** Pixel shift on small screens. Negative moves the globe down. */
  mobileLift?: number;
  shrinkOnScroll?: boolean;
  /** Extra galaxy/nebula depth. Off on the landing hero, which has its own scene. */
  richAtmosphere?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const [THREE, { FLAGS, makeFlagGeometry, makeFlagTexture, makeFallbackEarth }] = await Promise.all([
        import("three"),
        import("./flag-textures"),
      ]);
      if (disposed) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.z = 9;

      const world = new THREE.Group();
      const BASE_TILT = 0;
      world.rotation.x = BASE_TILT;
      scene.add(world);

      // Scroll motion lives on its own group so it never fights the responsive
      // layout applied to `world` by layout().
      const worldScroll = new THREE.Group();
      world.add(worldScroll);

      // ---------- Lights ----------
      scene.add(new THREE.AmbientLight(0xffffff, 1.0));
      const sun = new THREE.DirectionalLight(0xffffff, 2.0);
      sun.position.set(4, 3, 6);
      scene.add(sun);

      // ---------- Earth ----------
      const earthTilt = new THREE.Group();
      worldScroll.add(earthTilt);

      const earthMat = new THREE.MeshStandardMaterial({
        map: makeFallbackEarth(THREE),
        roughness: 0.85,
        metalness: 0,
      });
      const earth = new THREE.Mesh(new THREE.SphereGeometry(2, 96, 96), earthMat);
      earthTilt.add(earth);

      const sources = [
        "/textures/earth.jpg",
        "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg",
        "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/textures/planets/earth_atmos_2048.jpg",
        "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
      ];
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin("anonymous");
      const tryLoad = (i: number) => {
        if (disposed) return;
        if (i >= sources.length) return;
        loader.load(
          sources[i],
          (tex) => {
            if (disposed) return;
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 8;
            earthMat.map = tex;
            earthMat.needsUpdate = true;
          },
          undefined,
          () => tryLoad(i + 1)
        );
      };
      tryLoad(0);

      // Atmosphere: a tight blue rim plus a wider mint halo, so the globe sits
      // inside a visible sphere of light instead of ending at a hard edge.
      const atmosphereMat = new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: {
          uGlow: { value: 1 },
          uColor: { value: new THREE.Color(0x73ccff) },
        },
        vertexShader: `
          varying vec3 vN;
          void main(){
            vN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform float uGlow;
          uniform vec3 uColor;
          varying vec3 vN;
          void main(){
            float facing = dot(vN, vec3(0.0, 0.0, 1.0));
            float rim = pow(max(0.0, 0.78 - facing), 3.0);
            float haze = pow(max(0.0, 1.0 - abs(facing)), 6.0) * 0.22;
            gl_FragColor = vec4(uColor, 1.0) * (rim + haze) * uGlow;
          }`,
      });
      const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(2.22, 64, 64), atmosphereMat);
      worldScroll.add(atmosphere);

      let outerAtmosphere: InstanceType<typeof THREE.Mesh> | null = null;
      let galaxy: InstanceType<typeof THREE.Points> | null = null;
      let nebulaGroup: InstanceType<typeof THREE.Group> | null = null;
      if (richAtmosphere) {
        const outerAtmosphereMat = atmosphereMat.clone();
        outerAtmosphereMat.uniforms = THREE.UniformsUtils.clone(atmosphereMat.uniforms);
        outerAtmosphereMat.uniforms.uGlow.value = 0.16;
        outerAtmosphereMat.uniforms.uColor.value = new THREE.Color(0x7ff0d2);
        outerAtmosphere = new THREE.Mesh(new THREE.SphereGeometry(2.78, 64, 64), outerAtmosphereMat);
        worldScroll.add(outerAtmosphere);
      }

      // Airliners circle above the globe. They are loaded from a local GLB and
      // share the scene lights, so they feel part of the same 3D world.
      const heroAircraftGroup = new THREE.Group();
      worldScroll.add(heroAircraftGroup);
      const heroAircraft: {
        group: InstanceType<typeof THREE.Group>;
        angle: number;
        radius: number;
        speed: number;
        height: number;
      }[] = [];

      // ---------- Constellations & Stars ----------
      // Background Starfield
      const starCount = 800;
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const r = 18 + Math.random() * 22;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
        starPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
        starPos[i * 3 + 2] = r * Math.cos(ph);
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      const stars = new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.65, depthWrite: false })
      );
      scene.add(stars);

      // Heavenly bodies flying around (Constellations)
      const shootingStars: { mesh: InstanceType<typeof THREE.Mesh>, speed: number, offset: number }[] = [];
      const starShape = new THREE.SphereGeometry(0.04, 4, 4);
      const starMat = new THREE.MeshBasicMaterial({ color: 0x8EE3D6 }); // Mint color

      for (let i = 0; i < 12; i++) {
        const mesh = new THREE.Mesh(starShape, starMat);
        scene.add(mesh);
        shootingStars.push({
          mesh,
          speed: 0.5 + Math.random() * 0.5,
          offset: Math.random() * Math.PI * 2,
        });
      }

      // ---------- The two flag orbits ----------
      // Tightened: both rings now hug the Earth (radius 2) more closely.
      // Counts keep each flag about the same size as before, so the belts stay
      // continuous with no gaps.
      const rings = [
        { r: 2.18, rot: [0, 0.55, Math.PI / 2 + 0.12], speed: 0.08, count: 17 },
        { r: 2.44, rot: [0, 0, 0.3], speed: 0.08, count: 20 },
      ];

      const spinners: { g: InstanceType<typeof THREE.Group>; speed: number }[] = [];
      const textures: InstanceType<typeof THREE.Texture>[] = [];

      // ---------- Galaxy dust & nebula atmosphere (registration only) ----------
      if (richAtmosphere) {
        const galaxyCount = 560;
        const galaxyPos = new Float32Array(galaxyCount * 3);
        const galaxyColors = new Float32Array(galaxyCount * 3);
        const galaxyPalette = [
          new THREE.Color(0x8ee3d6),
          new THREE.Color(0xa8ceff),
          new THREE.Color(0xffffff),
          new THREE.Color(0xd7b7ff),
        ];
        for (let i = 0; i < galaxyCount; i++) {
          const r = 3.1 + Math.random() * 3.4;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          galaxyPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
          galaxyPos[i * 3 + 1] = r * Math.cos(phi) * 0.7;
          galaxyPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
          const c = galaxyPalette[i % galaxyPalette.length];
          galaxyColors[i * 3] = c.r;
          galaxyColors[i * 3 + 1] = c.g;
          galaxyColors[i * 3 + 2] = c.b;
        }
        const galaxyGeo = new THREE.BufferGeometry();
        galaxyGeo.setAttribute("position", new THREE.BufferAttribute(galaxyPos, 3));
        galaxyGeo.setAttribute("color", new THREE.BufferAttribute(galaxyColors, 3));
        galaxy = new THREE.Points(
          galaxyGeo,
          new THREE.PointsMaterial({
            size: 0.07,
            vertexColors: true,
            transparent: true,
            opacity: 0.28,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
          })
        );
        worldScroll.add(galaxy);

        // Soft nebula puffs give the sphere a deeper, cloudy atmosphere.
        const glowCanvas = document.createElement("canvas");
        glowCanvas.width = glowCanvas.height = 128;
        const glowCtx = glowCanvas.getContext("2d");
        if (glowCtx) {
          const grad = glowCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
          grad.addColorStop(0, "rgba(255,255,255,0.75)");
          grad.addColorStop(0.35, "rgba(255,255,255,0.22)");
          grad.addColorStop(1, "rgba(255,255,255,0)");
          glowCtx.fillStyle = grad;
          glowCtx.fillRect(0, 0, 128, 128);
          const glowTex = new THREE.CanvasTexture(glowCanvas);
          textures.push(glowTex);

          nebulaGroup = new THREE.Group();
          worldScroll.add(nebulaGroup);
          [
            { color: 0x63e6c9, x: -2.6, y: 1.4, z: -2.2, scale: 3.2 },
            { color: 0x6aa9ff, x: 2.8, y: -1.2, z: -2.8, scale: 3.8 },
            { color: 0xb48cff, x: 0.6, y: 2.6, z: -3.4, scale: 2.9 },
          ].forEach((puff) => {
            const sprite = new THREE.Sprite(
              new THREE.SpriteMaterial({
                map: glowTex,
                color: puff.color,
                transparent: true,
                opacity: 0.05,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
              })
            );
            sprite.position.set(puff.x, puff.y, puff.z);
            sprite.scale.set(puff.scale, puff.scale, 1);
            nebulaGroup?.add(sprite);
          });
        }
      }

      rings.forEach((ring, ri) => {
        const tiltGroup = new THREE.Group();
        tiltGroup.rotation.set(ring.rot[0], ring.rot[1], ring.rot[2]);
        worldScroll.add(tiltGroup);

        const spinner = new THREE.Group();
        tiltGroup.add(spinner);
        spinners.push({ g: spinner, speed: ring.speed });

        // Orbit line
        const pts: InstanceType<typeof THREE.Vector3>[] = [];
        for (let i = 0; i <= 180; i++) {
          const a = (i / 180) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * ring.r, 0, Math.sin(a) * ring.r));
        }
        tiltGroup.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0x8ee3d6, transparent: true, opacity: 0.4 })
          )
        );

        // Continuous belt calculation
        // By increasing the width factor to 1.0 (or slightly more to overlap), they touch seamlessly.
        const w = ((2 * Math.PI * ring.r) / ring.count) * 1.01;
        const h = w * 0.62;

        for (let i = 0; i < ring.count; i++) {
          const def = FLAGS[(i + ri * 11) % FLAGS.length];
          const tex = makeFlagTexture(THREE, def);
          textures.push(tex);

          // BoxGeometry gives every face proper 0..1 UVs, so the complete flag
          // artwork is shown on the front and back (without mirroring the back).
          const geo = makeFlagGeometry(THREE, w, h);

          const flagFace = new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.48,
            metalness: 0.04,
            emissive: new THREE.Color(0x0d1f38),
            emissiveIntensity: 0.12,
          });
          const flagEdge = new THREE.MeshStandardMaterial({
            color: 0x102f4d,
            roughness: 0.38,
            metalness: 0.12,
          });
          // BoxGeometry material order: +x, -x, +y, -y, +z, -z.
          // The large +z/-z faces carry the artwork; the rest are the edge.
          const mesh = new THREE.Mesh(geo, [
            flagEdge,
            flagEdge,
            flagEdge,
            flagEdge,
            flagFace,
            flagFace,
          ]);

          const a = (i / ring.count) * Math.PI * 2;
          const anchor = new THREE.Group();
          anchor.position.set(Math.cos(a) * ring.r, 0, Math.sin(a) * ring.r);
          anchor.rotation.y = Math.PI / 2 - a;
          anchor.add(mesh);
          spinner.add(anchor);
        }
      });

      // ---------- Layout ----------
      const layout = () => {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();

        const vh = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
        const vw = vh * camera.aspect;
        const FIT = 6.2;

        // NDC position of the globe centre on screen (0,0 = screen centre)
        let ndcX = 0;
        let ndcY = 0;
        const poster = posterRef.current;

        if (w >= 1024) {
          // Free space between the screen edge and the hero text column
          const hostRect = host.getBoundingClientRect();
          const content = host
            .closest("section")
            ?.querySelector<HTMLElement>("[data-hero-content]");

          let freeLeft = align === "right" ? w * 0.5 : 0;
          let freeRight = align === "right" ? w : w * 0.5;
          if (content) {
            const r = content.getBoundingClientRect();
            if (align === "right") {
              freeLeft = r.right - hostRect.left;
              freeRight = w;
            } else {
              freeLeft = 0;
              freeRight = r.left - hostRect.left;
            }
          }

          const freeW = Math.max(240, freeRight - freeLeft);
          // Equal gap on both sides of the globe (screen edge <-> globe <-> boxes)
          const gap = Math.min(80, Math.max(28, freeW * 0.07));
          const diameter = Math.max(200, Math.min(freeW - gap * 2, h * 0.86));

          const cx = (freeLeft + freeRight) / 2;
          const cy = h * 0.485 - desktopLift;

          const pxPerUnit = h / vh;
          const s = diameter / (2 * R_VIS * pxPerUnit);
          world.scale.setScalar(s);
          world.position.set(0, 0, 0);

          // Lens shift: the globe stays on the camera axis (perfect circle),
          // the image window moves instead.
          camera.setViewOffset(w, h, w / 2 - cx, h / 2 - cy, w, h);

          ndcX = (cx - w / 2) / (w / 2);
          ndcY = (h / 2 - cy) / (h / 2);

          if (atmosphereMat.uniforms.uGlow) atmosphereMat.uniforms.uGlow.value = 0.7;

          // Keep the CSS poster (shown before WebGL is ready) on the same spot
          if (poster) {
            const earthPx = 4 * s * pxPerUnit;
            poster.style.left = `${cx}px`;
            poster.style.top = `${cy}px`;
            poster.style.width = `${earthPx}px`;
            poster.style.height = `${earthPx}px`;
          }
        } else {
          camera.clearViewOffset();
          const s = Math.min((vw * 0.98) / FIT, (vh * 0.98) / FIT);
          world.scale.setScalar(s);
          // Small screens have no lens shift, so move the world itself.
          world.position.set(0, mobileLift / Math.max(1, h / vh), 0);
          if (atmosphereMat.uniforms.uGlow) atmosphereMat.uniforms.uGlow.value = 1;

          if (poster) {
            poster.style.left = "";
            poster.style.top = "";
            poster.style.width = "";
            poster.style.height = "";
          }
        }
      };
      layout();
      const ro = new ResizeObserver(layout);
      ro.observe(host);

      // ---------- Realistic hero aircraft ----------
      (async () => {
        let source: InstanceType<typeof THREE.Object3D>;
        try {
          source = await loadTravelModel(THREE, "aircraft");
        } catch (error) {
          console.warn("[HeroBackground] aircraft model unavailable, using fallback:", error);
          source = createFallbackModel(THREE, "aircraft");
        }
        if (disposed) return;

        [
          { radius: 3.1, speed: 0.11, height: 1.2, heading: 0 },
          { radius: 3.7, speed: -0.085, height: 1.75, heading: Math.PI },
        ].forEach((cfg, i) => {
          const plane = createModelInstance(THREE, source, 1.25);
          plane.rotation.y += cfg.heading;
          heroAircraftGroup.add(plane);
          heroAircraft.push({
            group: plane,
            angle: i * Math.PI * 0.85,
            radius: cfg.radius,
            speed: cfg.speed,
            height: cfg.height,
          });
        });
      })();

      // ---------- Pointer parallax ----------
      const pointer = { x: 0, y: 0 };
      const onPointer = (e: PointerEvent) => {
        pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
        pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      window.addEventListener("pointermove", onPointer, { passive: true });

      // ---------- Loop ----------
      const timer = new THREE.Timer();
      timer.connect(document);
      let raf = 0;
      let inView = true;
      let tabVisible = !document.hidden;
      let posterHidden = false;
      const motion = reduceMotion ? 0.2 : 1;

      const frame = (timestamp?: number) => {
        raf = 0;
        if (disposed) return;
        timer.update(timestamp);
        const dt = Math.min(timer.getDelta(), 0.05) * motion;
        const t = timer.getElapsed();

        earth.rotation.y += dt * 0.05;
        atmosphere.rotation.y += dt * 0.02;
        if (outerAtmosphere) outerAtmosphere.rotation.y -= dt * 0.012;
        if (galaxy) {
          galaxy.rotation.y -= dt * 0.009;
          galaxy.rotation.x = Math.sin(t * 0.05) * 0.08;
        }
        if (nebulaGroup) nebulaGroup.rotation.y += dt * 0.004;
        stars.rotation.y += dt * 0.005;

        // Animate heavenly bodies in an arc
        shootingStars.forEach((star, i) => {
          const angle = t * star.speed + star.offset;
          const radius = 6 + (i % 3) * 2;
          star.mesh.position.x = Math.cos(angle) * radius;
          star.mesh.position.y = Math.sin(angle) * radius * 0.6;
          star.mesh.position.z = Math.sin(angle) * 2 - 2; // slight depth
        });

        // Rotate rings together as one
        spinners.forEach((r) => (r.g.rotation.y += dt * r.speed));

        // Airliners follow gentle orbits around the globe.
        heroAircraft.forEach((plane) => {
          plane.angle += dt * plane.speed;
          plane.group.position.set(
            Math.cos(plane.angle) * plane.radius,
            plane.height + Math.sin(plane.angle * 1.6) * 0.35,
            Math.sin(plane.angle) * plane.radius * 0.45
          );
          plane.group.rotation.z = Math.cos(plane.angle) * 0.1;
        });

        world.rotation.x += (BASE_TILT + pointer.y * 0.05 - world.rotation.x) * 0.04;
        world.rotation.y += (pointer.x * 0.08 - world.rotation.y) * 0.04;

        // Scroll: the globe settles back into the page as the next section
        // arrives. On the registration page it is fixed, so the shrink is tied
        // to the full document height to keep the drone-ascent feel throughout.
        const scrollT = shrinkOnScroll
          ? clamp01(window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight))
          : clamp01(window.scrollY / Math.max(1, window.innerHeight));
        worldScroll.scale.setScalar(1 - scrollT * (shrinkOnScroll ? 0.42 : 0.22));
        worldScroll.position.set(0, -scrollT * (shrinkOnScroll ? 3.4 : 1.4), -scrollT * 2.5);
        worldScroll.rotation.z = scrollT * (shrinkOnScroll ? 0.28 : 0.18);
        stars.position.y = -scrollT * (shrinkOnScroll ? 2.6 : 1.5);

        renderer.render(scene, camera);
        if (!posterHidden && posterRef.current) {
          posterHidden = true;
          posterRef.current.style.opacity = "0";
        }
        schedule();
      };
      const schedule = () => {
        if (!raf && inView && tabVisible && !disposed) raf = requestAnimationFrame(frame);
      };

      const io = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) {
          timer.reset();
          schedule();
        }
      });
      io.observe(host);

      const onVis = () => {
        tabVisible = !document.hidden;
        if (tabVisible) {
          timer.reset();
          schedule();
        }
      };
      document.addEventListener("visibilitychange", onVis);

      schedule();

      cleanup = () => {
        cancelAnimationFrame(raf);
        timer.dispose();
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onPointer);
        document.removeEventListener("visibilitychange", onVis);
        scene.traverse((o) => {
          const m = o as InstanceType<typeof THREE.Mesh>;
          m.geometry?.dispose?.();
          const mat = m.material as InstanceType<typeof THREE.Material> | InstanceType<typeof THREE.Material>[] | undefined;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose?.();
        });
        textures.forEach((t) => t.dispose());
        earthMat.map?.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch((err) => {
      console.warn("[HeroBackground] 3D scene disabled:", err);
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [align, desktopLift, mobileLift, shrinkOnScroll, richAtmosphere]);

  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      {/* Preload the poster texture and hero airliner before JS asks for them. */}
      <link rel="preload" as="image" href="/textures/earth.jpg" />
      <link rel="preload" as="fetch" href="/models/airliner.glb" crossOrigin="anonymous" />

      <div className="absolute inset-x-0 top-0 h-[360px] sm:h-[460px] lg:inset-0 lg:h-auto">
        <div
          ref={posterRef}
          className="globe-poster absolute left-1/2 top-1/2 h-[min(70vw,290px)] w-[min(70vw,290px)] -translate-x-1/2 -translate-y-1/2 lg:left-[22%] lg:top-[52%] lg:h-[min(22vw,320px)] lg:w-[min(22vw,320px)]"
          style={{ translate: mobileLift ? `0 ${-mobileLift}px` : undefined } as CSSProperties}
        />
        <div ref={hostRef} className="absolute inset-0" />
      </div>
    </div>
  );
}