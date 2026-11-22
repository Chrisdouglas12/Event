"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export function SplashScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState<"scanning" | "verified" | "hidden">(
    "scanning"
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    camera.position.set(3, 2.5, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Central 3D structure
    const geometry = new THREE.IcosahedronGeometry(1.15, 2);

    const material = new THREE.MeshBasicMaterial({
      color: "#00A651",
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    });

    const core = new THREE.Mesh(geometry, material);
    scene.add(core);

    // Inner crystal
    const crystal = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.65, 1),
      new THREE.MeshBasicMaterial({
        color: "#D9FFE9",
        transparent: true,
        opacity: 0.12,
        wireframe: false,
      })
    );

    scene.add(crystal);

    // Rotating orbital rings
    const rings: THREE.Mesh[] = [];

    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.55 + i * 0.18, 0.009, 8, 120),
        new THREE.MeshBasicMaterial({
          color: i === 1 ? "#00A651" : "#8CFFD0",
          transparent: true,
          opacity: 0.55,
        })
      );

      ring.rotation.x = Math.PI / 2 + i * 0.5;
      ring.rotation.y = i * 0.8;

      scene.add(ring);
      rings.push(ring);
    }

    // Scanning beam
    const scanMaterial = new THREE.MeshBasicMaterial({
      color: "#00FF83",
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
    });

    const scanBeam = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 0.035),
      scanMaterial
    );

    scene.add(scanBeam);

    // Scanning light line
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 0.008),
      new THREE.MeshBasicMaterial({
        color: "#A6FFCA",
        transparent: true,
        opacity: 0.9,
      })
    );

    scene.add(line);

    // Floating particles
    const particleCount = 180;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 9;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: "#73EBA9",
        size: 0.018,
        transparent: true,
        opacity: 0.65,
      })
    );

    scene.add(particles);

    let animationFrame = 0;
    let running = true;
    const clock = new THREE.Clock();

    function animate() {
      if (!running) return;

      animationFrame = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      core.rotation.x = elapsed * 0.25;
      core.rotation.y = elapsed * 0.4;

      crystal.rotation.x = -elapsed * 0.3;
      crystal.rotation.y = elapsed * 0.25;

      rings.forEach((ring, index) => {
        ring.rotation.z = elapsed * (0.25 + index * 0.12);
        ring.rotation.x = Math.PI / 2 + Math.sin(elapsed * 0.4 + index) * 0.3;
      });

      // Scanning motion
      const scanPosition = Math.sin(elapsed * 1.7) * 1.35;

      scanBeam.position.set(0, scanPosition, 0);
      line.position.set(0, scanPosition, 0.01);

      particles.rotation.y = elapsed * 0.025;
      particles.rotation.x = elapsed * 0.015;

      renderer.render(scene, camera);
    }

    animate();

    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", resize);

    // Verification sequence
    const verifyTimer = window.setTimeout(() => {
      setStage("verified");
    }, 2100);

    const hideTimer = window.setTimeout(() => {
      setStage("hidden");
    }, 3200);

    const removeTimer = window.setTimeout(() => {
      setStage("hidden");
    }, 3900);

    return () => {
      running = false;

      cancelAnimationFrame(animationFrame);

      window.removeEventListener("resize", resize);

      clearTimeout(verifyTimer);
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();

          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          materials.forEach((m) => m.dispose());
        }
      });

      renderer.dispose();
    };
  }, []);

  if (stage === "hidden") return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#050D18] transition-opacity duration-700 ${
        stage === "hidden" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
      />

      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,166,81,0.10),transparent_55%)]" />

      {/* Branding */}
      <div className="pointer-events-none absolute top-[17%] z-10 text-center">
        <h1 className="text-3xl font-bold tracking-[0.28em] text-white">
          IHGC <span className="text-[#00A651]">2026</span>
        </h1>

        <p className="mt-3 text-[10px] tracking-[0.38em] text-white/40">
          PREPARING YOUR EXPERIENCE
        </p>
      </div>

      {/* Verification status */}
      <div className="absolute bottom-[18%] z-10 flex flex-col items-center">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-500 ${
            stage === "verified"
              ? "scale-100 border-[#00A651] bg-[#00A651] shadow-[0_0_40px_rgba(0,166,81,0.45)]"
              : "scale-90 border-white/20 bg-white/5"
          }`}
        >
          {stage === "verified" ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-7 w-7 text-white"
            >
              <path
                d="M5 12.5L10 17L19 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-[#00A651]" />
          )}
        </div>

        <p className="mt-5 text-xs font-semibold tracking-[0.25em] text-white">
          {stage === "verified" ? "VERIFIED" : "SCANNING"}
        </p>

        <p className="mt-2 text-[10px] tracking-wider text-white/40">
          {stage === "verified"
            ? "Your experience is ready"
            : "Initializing your experience..."}
        </p>
      </div>
    </div>
  );
}