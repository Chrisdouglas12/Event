"use client";

import { useEffect, useRef } from "react";
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
 * - A 3D campground photo sits far behind everything as a depth backdrop:
 *   navy-graded, vignetted, slowly drifting and parallaxing with the pointer
 */
export function HeroBackground({ align = "left" }: { align?: "left" | "right" }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const [
        THREE,
        { FLAGS, makeFlagGeometry, makeFlagTexture, makeFallbackEarth, makeSunTexture },
      ] = await Promise.all([
        import("three"),
        import("./flag-textures"),
      ]);
      if (disposed) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const highEnd =
        window.innerWidth >= 1024 && (navigator.hardwareConcurrency ?? 8) > 4 && !reduceMotion;

      const renderer = new THREE.WebGLRenderer({
        antialias: highEnd,
        alpha: true,
        powerPreference: "high-performance",
      });
      // Desktop gets a sharper globe; phones and low-core PCs stay cheap.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, highEnd ? 1.5 : 1));
      renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.z = 9;

      const world = new THREE.Group();
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
      world.add(earthTilt);

      const earthMat = new THREE.MeshStandardMaterial({
        map: makeFallbackEarth(THREE),
        roughness: 0.85,
        metalness: 0,
      });
      const earth = new THREE.Mesh(new THREE.SphereGeometry(2, 96, 64), earthMat);
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
            tex.anisotropy = 16;
            earthMat.map = tex;
            earthMat.needsUpdate = true;
          },
          undefined,
          () => tryLoad(i + 1)
        );
      };
      tryLoad(0);

      // Atmosphere glow
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(2.18, 64, 48),
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

      // ---------- Heavenly sun glow behind the globe ----------
      const sunTex = makeSunTexture(THREE);
      const sunGlow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: sunTex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0.9,
        })
      );
      sunGlow.position.set(0, 0.2, -2.6);
      sunGlow.scale.set(9.5, 9.5, 1);
      sunGlow.renderOrder = -5;
      world.add(sunGlow);

      // ---------- HOREMOW brand accent ----------
      let logoTex: InstanceType<typeof THREE.Texture> | null = null;
      const logoMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const logoPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), logoMat);
      logoPlane.position.set(-2.95, 2.15, -1.2);
      logoPlane.scale.set(1.5, 1.5, 1);
      logoPlane.visible = false;
      world.add(logoPlane);
      new THREE.TextureLoader().load(
        "/images/horemow_logo.png",
        (tex) => {
          if (disposed) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          logoTex = tex;
          logoMat.map = tex;
          logoMat.needsUpdate = true;
          logoPlane.visible = true;
        },
        undefined,
        () => {}
      );

      // Airliners circle above the globe. They are loaded from a local GLB and
      // share the scene lights, so they feel part of the same 3D world.
      const heroAircraftGroup = new THREE.Group();
      world.add(heroAircraftGroup);
      const heroAircraft: {
        group: InstanceType<typeof THREE.Group>;
        angle: number;
        radius: number;
        speed: number;
        height: number;
      }[] = [];

      // ---------- Campground backdrop (3D plane far behind the globe) ----------
      const BACKDROP_Z = -14;
      let imgAspect = 1.5;
      let backdropTex: InstanceType<typeof THREE.Texture> | null = null;

      const backdropMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uMap: { value: null as InstanceType<typeof THREE.Texture> | null },
          uScale: { value: new THREE.Vector2(1, 1) },
          uOffset: { value: new THREE.Vector2(0, 0) },
          uTime: { value: 0 },
          uOpacity: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec2 vNdc;
          void main(){
            vUv = uv;
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            vNdc = p.xy / p.w;
            gl_Position = p;
          }`,
        fragmentShader: `
          uniform sampler2D uMap;
          uniform vec2 uScale;
          uniform vec2 uOffset;
          uniform float uTime;
          uniform float uOpacity;
          varying vec2 vUv;
          varying vec2 vNdc;
          void main(){
            // slow cinematic drift
            vec2 drift = vec2(sin(uTime * 0.05), cos(uTime * 0.04)) * 0.012;
            vec2 uv = vUv * uScale + uOffset + drift;
            vec3 c = texture2D(uMap, uv).rgb;

            // navy colour grade: blend the photo with a blue-tinted mono version
            float l = dot(c, vec3(0.299, 0.587, 0.114));
            vec3 tinted = vec3(l) * vec3(0.42, 0.62, 1.0) * 1.05;
            vec3 col = mix(c * 0.75, tinted, 0.55) * 0.8;

            // screen-space fades so it melts into the dark blue background
            float vig = 1.0 - smoothstep(0.55, 1.35, length(vNdc * vec2(0.85, 1.0)));
            float bottom = smoothstep(-1.0, -0.2, vNdc.y);
            float top = smoothstep(1.05, 0.7, vNdc.y);

            float a = uOpacity * 0.6 * vig * bottom * top;
            gl_FragColor = vec4(col, a);
          }`,
      });
      const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), backdropMat);
      backdrop.position.z = BACKDROP_Z;
      backdrop.renderOrder = -10; // draw first, everything else sits in front
      backdrop.visible = false; // shown once the image has loaded
      scene.add(backdrop);

      // ---------- Constellations & Stars ----------
      // Background Starfield
      const starCount = 300;
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
      // Using count logic so they form a perfect, connected ring
      const rings = [
        { r: 2.3, rot: [0, 0.55, Math.PI / 2 + 0.12], speed: 0.08, count: 18 },
        { r: 2.62, rot: [0, 0, 0.3], speed: 0.08, count: 22 },
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

        if (w >= 1024) {
          if (w >= 1440) {
            const s = Math.min((vh * 0.95) / FIT, (vw * 0.42) / FIT);
            world.scale.setScalar(s);
            world.position.set((align === "right" ? 1 : -1) * vw * 0.30, vh * 0.055, 0);
          } else {
            const s = Math.min((vh * 0.92) / FIT, (vw * 0.4) / FIT);
            world.scale.setScalar(s);
            world.position.set((align === "right" ? 1 : -1) * vw * 0.28, vh * 0.055, 0);
          }
        } else {
          const s = Math.min((vw * 0.98) / FIT, (vh * 0.98) / FIT);
          world.scale.setScalar(s);
          world.position.set(0, 0, 0);
        }

        // Backdrop: 30% larger than the view at its depth (room for parallax),
        // with "cover" UVs so the photo is never stretched.
        const dFar = camera.position.z - BACKDROP_Z;
        const vhF = 2 * Math.tan((camera.fov * Math.PI) / 360) * dFar;
        const vwF = vhF * camera.aspect;
        backdrop.scale.set(vwF * 1.3, vhF * 1.3, 1);

        let sx = 1;
        let sy = 1;
        if (imgAspect > camera.aspect) sx = camera.aspect / imgAspect;
        else sy = imgAspect / camera.aspect;
        sx *= 0.94;
        sy *= 0.94;
        backdropMat.uniforms.uScale.value.set(sx, sy);
        backdropMat.uniforms.uOffset.value.set((1 - sx) / 2, (1 - sy) / 2);
      };
      layout();
      const ro = new ResizeObserver(layout);
      ro.observe(host);

      // Load the campground photo (public/images/campground_2.jpg)
      // NB: no colorSpace set on purpose, the shader grades raw sRGB values.
      new THREE.TextureLoader().load(
        "/images/campground_2.jpg",
        (tex) => {
          if (disposed) {
            tex.dispose();
            return;
          }
          tex.anisotropy = 4;
          backdropTex = tex;
          backdropMat.uniforms.uMap.value = tex;
          imgAspect = tex.image.width / tex.image.height;
          backdrop.visible = true;
          layout();
        },
        undefined,
        (err) => console.warn("[HeroBackground] campground image failed to load:", err)
      );

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
      // Plain clock instead of THREE.Timer: fewer API assumptions, no type issues.
      let last = performance.now();
      let elapsed = 0;
      let raf = 0;
      let inView = true;
      let tabVisible = !document.hidden;
      const motion = reduceMotion ? 0.2 : 1;

      const frame = (timestamp?: number) => {
        raf = 0;
        if (disposed) return;
        const now = timestamp ?? performance.now();
        const delta = Math.min((now - last) / 1000, 0.05);
        last = now;
        elapsed += delta;
        const dt = delta * motion;
        const t = elapsed;

        earth.rotation.y += dt * 0.05;
        atmosphere.rotation.y += dt * 0.02;
        stars.rotation.y += dt * 0.005;
        sunGlow.material.rotation += dt * 0.01;
        if (logoPlane.visible) {
          logoPlane.rotation.z = Math.sin(t * 0.25) * 0.035;
          logoPlane.position.y = 2.15 + Math.sin(t * 0.35) * 0.08;
        }

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

        // Backdrop: fade in and drift gently with the pointer (no scroll parallax)
        const u = backdropMat.uniforms;
        u.uTime.value = t * motion;
        if (backdropTex) u.uOpacity.value = Math.min(1, u.uOpacity.value + dt * 0.7);
        backdrop.position.x += (-pointer.x * 0.7 - backdrop.position.x) * 0.03;
        backdrop.position.y += (pointer.y * 0.4 - backdrop.position.y) * 0.03;
        backdrop.rotation.y += (pointer.x * 0.05 - backdrop.rotation.y) * 0.03;
        backdrop.rotation.x += (-pointer.y * 0.03 - backdrop.rotation.x) * 0.03;

        renderer.render(scene, camera);
        schedule();
      };
      const schedule = () => {
        if (!raf && inView && tabVisible && !disposed) raf = requestAnimationFrame(frame);
      };

      const io = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) {
          last = performance.now();
          schedule();
        }
      });
      io.observe(host);

      const onVis = () => {
        tabVisible = !document.hidden;
        if (tabVisible) {
          last = performance.now();
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
        backdropTex?.dispose();
        earthMat.map?.dispose();
        sunTex.dispose();
        logoTex?.dispose();
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
  }, []);

  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      {/* Preload the real textures and hero airliner before JS asks for them. */}
      <link rel="preload" as="image" href="/textures/earth.jpg" />
      <link rel="preload" as="image" href="/images/campground_2.jpg" />
      <link rel="preload" as="fetch" href="/models/airliner.glb" crossOrigin="anonymous" />

      <div className="absolute inset-x-0 top-0 h-[360px] sm:h-[460px] lg:inset-0 lg:h-auto">
        <div ref={hostRef} className="absolute inset-0" />
      </div>
      <div className="absolute inset-x-0 top-[270px] sm:top-[370px] h-[100px] bg-gradient-to-b from-transparent to-[#0E1020] lg:hidden" />
      <div className="hidden lg:block absolute inset-0 bg-gradient-to-l from-[#0E1020]/90 via-[#0E1020]/35 to-transparent" />
    </div>
  );
}
