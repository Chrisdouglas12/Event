"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Earth with two orbits of flags, as in the sketch:
 *  - eq1: a vertical orbit (over the poles)
 *  - eq2: a wide, slightly tilted horizontal orbit
 *
 * FIXED:
 * - Earth CENTERED, equator na straight horizontal line for middle (no bent)
 * - Earth dey rotate like real earth: slow, steady, west -> east
 * - Flags dey STRAIGHT, no wobble. Both rings dey rotate as ONE, same speed, same direction.
 */
export function HeroBackground() {
  const hostRef = useRef<HTMLDivElement>(null);
  // Dev-only label so you can see texture loading without DevTools
  const [status, setStatus] = useState("");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const { FLAGS, makeFlagTexture, makeFallbackEarth } = await import("./flag-textures");
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
      // FIX 1: No bent. Camera dey look straight at equator.
      // Before: 0.4 - na why globe dey bend. Now: 0
      const BASE_TILT = 0;
      world.rotation.x = BASE_TILT;
      scene.add(world);

      // ---------- Lights ----------
      scene.add(new THREE.AmbientLight(0xffffff, 1.0));
      const sun = new THREE.DirectionalLight(0xffffff, 2.0);
      sun.position.set(4, 3, 6);
      scene.add(sun);

      // ---------- Earth ----------
      const earthTilt = new THREE.Group();
      // FIX 1b: No axial bent, equator stays CENTERED and horizontal.
      // Before: 0.41 (23.5°) - na why equator shift. Now: 0
      earthTilt.rotation.z = 0;
      world.add(earthTilt);

      const earthMat = new THREE.MeshStandardMaterial({
        map: makeFallbackEarth(THREE),
        roughness: 0.85,
        metalness: 0,
      });
      const earth = new THREE.Mesh(new THREE.SphereGeometry(2, 96, 96), earthMat);
      earthTilt.add(earth);

      // Real Earth photo: your own file first, then CDNs that allow cross-origin use.
      const sources = [
        "/textures/earth.jpg",
        "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg",
        "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/textures/planets/earth_atmos_2048.jpg",
        "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
      ];
      const labels = ["local file", "jsdelivr 1", "jsdelivr 2", "unpkg"];
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin("anonymous");
      const tryLoad = (i: number) => {
        if (disposed) return;
        if (i >= sources.length) {
          setStatus("Earth: all sources failed, using placeholder");
          return;
        }
        setStatus(`Earth: loading (${labels[i]})...`);
        loader.load(
          sources[i],
          (tex) => {
            if (disposed) return;
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 8;
            earthMat.map = tex;
            earthMat.needsUpdate = true;
            setStatus(`Earth: loaded (${labels[i]})`);
          },
          undefined,
          () => tryLoad(i + 1)
        );
      };
      tryLoad(0);

      // Atmosphere glow
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(2.22, 48, 48),
        new THREE.ShaderMaterial({
          transparent: true,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          vertexShader: `
            varying vec3 vN;
            void main(){
              vN = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
          fragmentShader: `
            varying vec3 vN;
            void main(){
              float i = pow(0.74 - dot(vN, vec3(0.0, 0.0, 1.0)), 3.5);
              gl_FragColor = vec4(0.45, 0.8, 1.0, 1.0) * i;
            }`,
        })
      );
      world.add(atmosphere);

      // ---------- Stars ----------
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

      // ---------- The two flag orbits ----------
      // FIX 3: Both rings SAME speed, SAME direction = IN ONE ACCORD, as one.
      // Before: 0.14 and -0.12 (opposite) - na why dem dey fight each other.
      // Now: both 0.08, same direction.
      const rings = [
        // eq1: vertical, seen as a narrow ellipse running over the poles
        { r: 2.75, rot: [0, 0.55, Math.PI / 2 + 0.12], speed: 0.08, count: 22 },
        // eq2: wide horizontal orbit, rising slightly to the right
        { r: 3.1, rot: [0, 0, 0.3], speed: 0.08, count: 26 },
      ];

      const spinners: { g: InstanceType<typeof THREE.Group>; speed: number }[] = [];
      const textures: InstanceType<typeof THREE.Texture>[] = [];

      rings.forEach((ring, ri) => {
        const tiltGroup = new THREE.Group();
        tiltGroup.rotation.set(ring.rot[0], ring.rot[1], ring.rot[2]);
        world.add(tiltGroup);

        const spinner = new THREE.Group();
        tiltGroup.add(spinner);
        spinners.push({ g: spinner, speed: ring.speed });

        // thin orbit line
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

        // flags sized so neighbours nearly touch, forming a continuous belt
        const w = ((2 * Math.PI * ring.r) / ring.count) * 0.94;
        const h = w * 0.62;

        for (let i = 0; i < ring.count; i++) {
          const def = FLAGS[(i + ri * 11) % FLAGS.length];
          const tex = makeFlagTexture(THREE, def);
          textures.push(tex);

          // FIX 2: Plane with NO extra segments. Before: PlaneGeometry(w, h, 10, 6)
          // na those segments allow the wobble. Now: 1x1, flag na STRAIGHT rigid card.
          const geo = new THREE.PlaneGeometry(w, h, 1, 1);
          const mesh = new THREE.Mesh(
            geo,
            new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false })
          );

          // sits on the orbit line, faces outward, width runs along the orbit
          const a = (i / ring.count) * Math.PI * 2;
          const anchor = new THREE.Group();
          anchor.position.set(Math.cos(a) * ring.r, 0, Math.sin(a) * ring.r);
          anchor.rotation.y = Math.PI / 2 - a;
          anchor.add(mesh);
          spinner.add(anchor);

          // FIX 2b: No more flagItems / phase / per-flag sin wobble.
          // Flags no dey move individually again. Only the spinner group moves.
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
        const FIT = 7.2; // outer orbit diameter plus flag size

        if (w >= 1024) {
          const s = Math.min((vh * 0.95) / FIT, (vw * 0.52) / FIT);
          world.scale.setScalar(s);
          world.position.set(-vw * 0.24, 0, 0);
        } else {
          const s = Math.min((vw * 0.98) / FIT, (vh * 0.98) / FIT);
          world.scale.setScalar(s);
          // FIX 1c: Centered. Equator for middle of globe.
          world.position.set(0, 0, 0);
        }
      };
      layout();
      const ro = new ResizeObserver(layout);
      ro.observe(host);

      // ---------- Pointer parallax ----------
      const pointer = { x: 0, y: 0 };
      const onPointer = (e: PointerEvent) => {
        pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
        pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      window.addEventListener("pointermove", onPointer, { passive: true });

      // ---------- Loop ----------
      const clock = new THREE.Clock();
      let raf = 0;
      let inView = true;
      let tabVisible = !document.hidden;
      const motion = reduceMotion ? 0.2 : 1;

      const frame = () => {
        raf = 0;
        if (disposed) return;
        const dt = Math.min(clock.getDelta(), 0.05) * motion;

        // FIX 2c: LIKE REAL EARTH - slow, steady.
        // Before: dt * 0.2 - too fast, e dey rush.
        // Now: dt * 0.05 - one full turn in ~2 mins, calm like real earth.
        earth.rotation.y += dt * 0.05;
        atmosphere.rotation.y += dt * 0.02;
        stars.rotation.y += dt * 0.005;

        // Rings rotate as ONE rigid body - no per-flag movement
        spinners.forEach((r) => (r.g.rotation.y += dt * r.speed));

        // FIX 2d: DELETED the wobble loop completely.
        // No more: arr[i+2] = Math.sin(...) * 0.04

        // Gentle parallax only - no bent. Keep X at 0, Y small.
        world.rotation.x += (BASE_TILT + pointer.y * 0.05 - world.rotation.x) * 0.04;
        world.rotation.y += (pointer.x * 0.08 - world.rotation.y) * 0.04;

        renderer.render(scene, camera);
        schedule();
      };
      const schedule = () => {
        if (!raf && inView && tabVisible && !disposed) raf = requestAnimationFrame(frame);
      };

      const io = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) {
          clock.getDelta();
          schedule();
        }
      });
      io.observe(host);

      const onVis = () => {
        tabVisible = !document.hidden;
        if (tabVisible) {
          clock.getDelta();
          schedule();
        }
      };
      document.addEventListener("visibilitychange", onVis);

      schedule();

      cleanup = () => {
        cancelAnimationFrame(raf);
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
      setStatus("3D scene failed to start");
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      <div ref={hostRef} className="absolute inset-x-0 top-0 h-[360px] sm:h-[460px] lg:inset-0 lg:h-auto" />
      <div className="absolute inset-x-0 top-[270px] sm:top-[370px] h-[100px] bg-gradient-to-b from-transparent to-[#0E1020] lg:hidden" />
      <div className="hidden lg:block absolute inset-0 bg-gradient-to-l from-[#0E1020]/90 via-[#0E1020]/35 to-transparent" />
      {/* Shown only while running `npm run dev`; delete once the Earth loads fine */}
      {process.env.NODE_ENV !== "production" && status ? (
        <div className="absolute left-3 top-3 rounded bg-black/40 px-2 py-1 text-[10px] text-white/60">{status}</div>
      ) : null}
    </div>
  );
}