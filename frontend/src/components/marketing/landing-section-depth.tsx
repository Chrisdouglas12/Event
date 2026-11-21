"use client";

import { useEffect } from "react";
import * as THREE from "three";

/**
 * Landing-only depth pass driven by three.js, using the same virtual camera
 * idea as the globe. Each card/section is projected through a PerspectiveCamera
 * as it moves away from the viewport; the resulting scale and tilt are written
 * as CSS variables so the compositor still owns the transform.
 *
 * Elements stay at normal size while in view, keep zooming out after they
 * leave (no fixed floor), and zoom back in as they return.
 */
export function LandingSectionDepth() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 8;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const point = new THREE.Vector3();
    const topPoint = new THREE.Vector3();
    const bottomPoint = new THREE.Vector3();
    const pointer = new THREE.Vector2(0, 0);

    let raf = 0;
    let targets: HTMLElement[] = [];

    const projectedScale = (z: number) => {
      topPoint.set(0, 0.5, z).project(camera);
      bottomPoint.set(0, -0.5, z).project(camera);
      point.set(0, 0.5, 0).project(camera);
      const base = Math.abs(point.y * 2);
      return base > 0 ? Math.abs(topPoint.y - bottomPoint.y) / base : 1;
    };

    const apply = () => {
      raf = 0;
      const vh = Math.max(1, window.innerHeight);

      targets.forEach((el) => {
        const rect = el.getBoundingClientRect();
        let distance = 0;

        if (rect.top >= vh) distance = (rect.top - vh) / vh;
        else if (rect.bottom <= 0) distance = -rect.bottom / vh;

        // A virtual three.js depth: farther away as the element leaves.
        const z = -distance * 5;
        const rawScale = projectedScale(z);
        const strength = el.classList.contains("landing-card") ? 0.45 : 1;
        const scale = Math.max(0.02, 1 + (rawScale - 1) * strength);

        // Same pointer parallax language as the globe, kept very subtle.
        const tiltX = THREE.MathUtils.clamp(-pointer.y * 3 * strength, -4, 4);
        const tiltY = THREE.MathUtils.clamp(pointer.x * 4 * strength, -5, 5);

        el.style.setProperty("--section-scale", scale.toFixed(3));
        el.style.setProperty("--section-rotate-x", `${tiltX.toFixed(2)}deg`);
        el.style.setProperty("--section-rotate-y", `${tiltY.toFixed(2)}deg`);
      });
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(apply);
    };

    const measure = () => {
      targets = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".landing-navy [data-enter], .landing-navy [data-depth], .landing-navy .landing-card"
        )
      );
      schedule();
    };

    const onPointer = (event: PointerEvent) => {
      pointer.set(
        (event.clientX / window.innerWidth - 0.5) * 2,
        (event.clientY / window.innerHeight - 0.5) * 2
      );
      schedule();
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    const bodyRO = new ResizeObserver(measure);
    bodyRO.observe(document.body);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("load", measure);
      bodyRO.disconnect();
      targets.forEach((el) => {
        el.style.removeProperty("--section-scale");
        el.style.removeProperty("--section-rotate-x");
        el.style.removeProperty("--section-rotate-y");
      });
    };
  }, []);

  return null;
}
