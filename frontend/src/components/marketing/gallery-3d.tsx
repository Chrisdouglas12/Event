"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { RevealText } from "@/components/ui/reveal-text";

const GALLERY_IMAGES = [
  { src: "/gallery/pastor-paul-rika-on-pulpit.jpg", alt: "Pastor Paul Rika preaching at the pulpit" },
  { src: "/gallery/pastor-paul-rika-sitting.jpg", alt: "Pastor Paul Rika seated at the conference" },
  { src: "/gallery/crowed-sitted.jpg", alt: "Conference congregation seated together" },
  { src: "/gallery/water-baptism.jpg", alt: "Water baptism during the conference" },
  { src: "/gallery/altar-call-scene.jpg", alt: "Altar call scene at the conference" },
  { src: "/gallery/mummy-linda-standing-on-pulpit.jpg", alt: "Evangelist Linda Paul Rika standing at the pulpit" },
  { src: "/gallery/book-review-during-conference.jpg", alt: "Book review during the conference" },
  { src: "/gallery/pastor-paul-rika-praying.jpg", alt: "Pastor Paul Rika praying" },
] as const;

const IMAGE_WIDTH = 2048;
const IMAGE_HEIGHT = 1152;
const IMAGE_SIZES = "(max-width: 640px) 82vw, (max-width: 1024px) 52vw, 560px";
const COUNT = GALLERY_IMAGES.length;
const HALF = COUNT / 2;

const G3D_CSS = `
.g3d-root{--p:0;--px:0;--py:0;--mx:72%;--my:26%;--g3d-slant:28px;
  padding-top:calc(var(--g3d-slant) + 3rem);padding-bottom:3.5rem;
  clip-path:polygon(0 var(--g3d-slant),100% 0,100% 100%,0 100%)}
@media (min-width:1024px){.g3d-root{--g3d-slant:56px;padding-top:calc(var(--g3d-slant) + 4rem);padding-bottom:5rem}}

/* ---------- living background ---------- */
.g3d-bg{position:absolute;inset:0;z-index:-1;overflow:hidden;
  background:linear-gradient(180deg,#F7FBFA 0%,#EDF5F3 60%,#E4EFEC 100%)}
.g3d-dots{position:absolute;inset:0;
  background-image:radial-gradient(rgba(14,122,110,.6) 1.1px,transparent 1.7px);
  background-size:22px 22px;
  -webkit-mask-image:radial-gradient(380px circle at var(--mx) var(--my),#000 0%,transparent 70%);
  mask-image:radial-gradient(380px circle at var(--mx) var(--my),#000 0%,transparent 70%)}
.g3d-spot{position:absolute;inset:0;
  background:radial-gradient(520px circle at var(--mx) var(--my),rgba(142,227,214,.4),transparent 65%)}
.g3d-blob{position:absolute;border-radius:9999px;filter:blur(70px);
  transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.g3d-blob-a{width:420px;height:420px;left:-140px;top:-80px;background:rgba(142,227,214,.5);
  transform:translate3d(calc(var(--px) * 40px),calc(var(--p) * -120px + var(--py) * -24px),0)}
.g3d-blob-b{width:360px;height:360px;right:-140px;bottom:6%;background:rgba(14,122,110,.2);
  transform:translate3d(calc(var(--px) * -34px),calc(var(--p) * 110px + var(--py) * 20px),0)}

/* ---------- reveal ---------- */
.g3d-js .g3d-reveal{opacity:0;transform:translate3d(0,32px,0) scale(.98);
  transition:opacity .8s ease,transform .9s cubic-bezier(.2,.8,.2,1);transition-delay:var(--d,0ms)}
.g3d-js .g3d-reveal.g3d-in{opacity:1;transform:none}

/* ---------- stage + panels ---------- */
.g3d-stage{position:relative;height:min(72vw,340px);perspective:1400px;perspective-origin:50% 42%;
  touch-action:pan-y;outline:none}
@media (min-width:640px){.g3d-stage{height:min(52vw,420px)}}
@media (min-width:1024px){.g3d-stage{height:min(38vw,480px)}}

.g3d-panel{position:absolute;left:50%;top:50%;width:min(82vw,560px);
  transform-style:preserve-3d;
  transform:translate(-50%,-50%) translate3d(var(--gx,0%),var(--gy,0),var(--gz,0))
    rotateY(var(--gt,0)) scale(var(--gs,1));
  transition:transform .85s cubic-bezier(.2,.8,.2,1),
             opacity .55s ease,
             filter .55s ease;
  will-change:transform,opacity,filter}

/* Side panels: bigger, brighter, less blur so more photos read clearly */
.g3d-panel.is-side{opacity:.92;filter:blur(0.4px) brightness(.94) saturate(1.02);
  --gs:.92 !important}
.g3d-panel.is-hidden{opacity:.35;filter:blur(3px) brightness(.7) saturate(.9);pointer-events:none}
.g3d-panel.is-front{opacity:1;filter:none;z-index:3}

.g3d-frame{border-radius:6px;overflow:hidden;box-shadow:0 24px 60px rgba(7,16,30,.28);
  transition:box-shadow .5s ease}
.g3d-panel.is-front .g3d-frame{box-shadow:0 30px 80px rgba(7,16,30,.4)}
.g3d-panel.is-side .g3d-frame{box-shadow:0 18px 44px rgba(7,16,30,.22)}

/* Side reflection sheen: reads "photo sitting beside the hero" */
.g3d-sheen{position:absolute;inset:0;pointer-events:none;border-radius:6px;
  background:linear-gradient(115deg,rgba(255,255,255,.18) 0%,transparent 42%);opacity:0;
  transition:opacity .4s ease}
.g3d-panel.is-side .g3d-sheen{opacity:1}

/* ---------- controls ---------- */
.g3d-arrow{position:relative;display:inline-flex;height:44px;width:44px;align-items:center;
  justify-content:center;border-radius:9999px;border:1px solid rgba(213,227,224,.9);
  background:rgba(255,255,255,.85);color:#4B5563;backdrop-filter:blur(8px);
  box-shadow:0 4px 14px rgba(7,16,30,.06);
  transition:transform .2s cubic-bezier(.2,.8,.2,1),background-color .2s ease,
    color .2s ease,border-color .2s ease,box-shadow .2s ease}
.g3d-arrow:hover{transform:translateY(-2px);border-color:#0E7A6E;background:#0E7A6E;
  color:#fff;box-shadow:0 10px 24px rgba(14,122,110,.3)}
.g3d-arrow:active{transform:scale(.94)}
.g3d-arrow:focus-visible{outline:2px solid #0E7A6E;outline-offset:2px}

.g3d-dot{height:8px;border-radius:9999px;border:0;padding:0;width:8px;background:rgba(14,122,110,.28);
  transition:width .35s cubic-bezier(.2,.8,.2,1),background-color .25s ease;cursor:pointer}
.g3d-dot:hover{background:rgba(14,122,110,.5)}
.g3d-dot.is-active{width:26px;background:#0E7A6E}

@media (prefers-reduced-motion:reduce){
  .g3d-js .g3d-reveal{opacity:1;transform:none;transition:none}
  .g3d-panel{transition:none}
}
`;

function relativeOffset(index: number, active: number) {
  let diff = index - active;
  if (diff > HALF) diff -= COUNT;
  if (diff < -HALF) diff += COUNT;
  return diff;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function Gallery3D() {
  const [active, setActive] = useState(0);
  const dragRef = useRef<{ startX: number } | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const goTo = useCallback((index: number) => {
    setActive(((index % COUNT) + COUNT) % COUNT);
  }, []);

  // ---------- Pointer / scroll / reveal (same system as the other sections) ----------
  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveals = Array.from(root.querySelectorAll<HTMLElement>("[data-g3d-reveal]"));

    root.classList.add("g3d-js");

    if (reduce) {
      reveals.forEach((el) => el.classList.add("g3d-in"));
      return () => root.classList.remove("g3d-js");
    }

    const revealIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("g3d-in");
            revealIO.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => revealIO.observe(el));

    let near = true;
    let hovering = false;
    let scrollRaf = 0;
    let pointerRaf = 0;
    let pending: globalThis.PointerEvent | null = null;

    const update = () => {
      scrollRaf = 0;
      if (!near) return;
      const vh = window.innerHeight;
      const rect = root.getBoundingClientRect();
      const p = clamp01((vh - rect.top) / (rect.height + vh));
      root.style.setProperty("--p", p.toFixed(4));

      if (!hovering) {
        const px = Math.sin(p * 7) * 0.6;
        const py = Math.cos(p * 5) * 0.5;
        root.style.setProperty("--px", px.toFixed(3));
        root.style.setProperty("--py", py.toFixed(3));
        root.style.setProperty("--mx", `${(50 + px * 35).toFixed(1)}%`);
        root.style.setProperty("--my", `${(40 + py * 30).toFixed(1)}%`);
      }
    };
    const scheduleScroll = () => {
      if (!scrollRaf) scrollRaf = requestAnimationFrame(update);
    };

    const applyPointer = () => {
      pointerRaf = 0;
      if (!pending) return;
      const r = root.getBoundingClientRect();
      const x = pending.clientX - r.left;
      const y = pending.clientY - r.top;
      root.style.setProperty("--mx", `${x.toFixed(0)}px`);
      root.style.setProperty("--my", `${y.toFixed(0)}px`);
      root.style.setProperty("--px", ((x / r.width) * 2 - 1).toFixed(3));
      root.style.setProperty("--py", ((y / r.height) * 2 - 1).toFixed(3));
      pending = null;
    };
    const onMove = (e: globalThis.PointerEvent) => {
      if (e.pointerType === "touch") return;
      hovering = true;
      pending = e;
      if (!pointerRaf) pointerRaf = requestAnimationFrame(applyPointer);
    };
    const onLeave = () => {
      hovering = false;
      scheduleScroll();
    };

    const nearIO = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        if (near) scheduleScroll();
      },
      { rootMargin: "200px 0px" }
    );
    nearIO.observe(root);

    update();
    window.addEventListener("scroll", scheduleScroll, { passive: true });
    window.addEventListener("resize", scheduleScroll, { passive: true });
    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave);

    return () => {
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      if (pointerRaf) cancelAnimationFrame(pointerRaf);
      revealIO.disconnect();
      nearIO.disconnect();
      window.removeEventListener("scroll", scheduleScroll);
      window.removeEventListener("resize", scheduleScroll);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.classList.remove("g3d-js");
    };
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = { startX: event.clientX };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const delta = event.clientX - drag.startX;
    if (delta < -45) goTo(active + 1);
    else if (delta > 45) goTo(active - 1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); goTo(active - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); goTo(active + 1); }
  };

  return (
    <section
      ref={sectionRef}
      data-scene="sea"
      data-depth
      className="g3d-root relative isolate overflow-hidden"
    >
      <style dangerouslySetInnerHTML={{ __html: G3D_CSS }} />

      {/* Living background — same system as AboutPreview / DetailsCard */}
      <div aria-hidden className="g3d-bg">
        <div className="g3d-blob g3d-blob-a" />
        <div className="g3d-blob g3d-blob-b" />
        <div className="g3d-dots" />
        <div className="g3d-spot" />
      </div>

      <div className="px-[3px] sm:px-8 lg:px-8 xl:px-10">
        {/* ---------- Header (same shape as the other section intros) ---------- */}
        <div className="relative mx-auto mb-10 max-w-2xl text-center lg:mb-12">
          <div className="flex items-center justify-center gap-3">
            <span aria-hidden className="h-px w-8 bg-[#0E7A6E]" />
            <RevealText
              as="span"
              text="Gallery"
              className="text-xs font-bold uppercase tracking-[0.2em] text-[#0E7A6E]"
              speed={18}
            />
            <span aria-hidden className="h-px w-8 bg-[#0E7A6E]" />
          </div>
          <RevealText
            as="h2"
            text="Moments From the Conference"
            className="mt-5 text-3xl font-bold leading-[1.1] tracking-tight text-[#0E1020] sm:text-4xl lg:text-[44px] xl:text-5xl"
            speed={14}
          />
          <RevealText
            as="p"
            text="Drag the gallery or use the arrows to move through these moments in 3D."
            className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#4B5563] lg:text-base"
            speed={9}
          />
        </div>

        <div className="gallery-3d" role="group" aria-roledescription="3D gallery" aria-label="Conference photo gallery">
          <div
            className="g3d-stage"
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onKeyDown={onKeyDown}
            aria-label="Drag horizontally or use the left and right arrow keys to browse photos"
          >
            {GALLERY_IMAGES.map((image, index) => {
              const offset = relativeOffset(index, active);
              const distance = Math.abs(offset);
              const visibilityClass =
                distance === 0 ? "is-front" : distance === 1 ? "is-side" : "is-hidden";

              // Wider horizontal spread + tighter z-depth so side panels stay
              // bigger and more readable; front panel remains the hero.
              const style = {
                "--gx": `${offset * 34}%`,
                "--gz": `${-distance * 90}px`,
                "--gt": `${offset * -12}deg`,
                "--gs": distance === 0 ? 1.02 : 0.92,
                "--gy": `${distance * 6}px`,
                zIndex: 10 - distance,
              } as CSSProperties;

              return (
                <figure
                  key={image.src}
                  className={`g3d-panel ${visibilityClass}`}
                  style={style}
                  aria-hidden={distance > 1 ? true : undefined}
                >
                  <div className="image-frame g3d-frame">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width={IMAGE_WIDTH}
                      height={IMAGE_HEIGHT}
                      sizes={IMAGE_SIZES}
                      draggable={false}
                      className="block h-auto w-full"
                    />
                    <span aria-hidden className="g3d-sheen" />
                  </div>
                </figure>
              );
            })}
          </div>

          {/* ---------- Controls (mint pill arrows, expanded dot = active) ---------- */}
          <div className="mt-8 flex items-center justify-center gap-4 lg:mt-10">
            <button
              type="button"
              className="g3d-arrow"
              onClick={() => goTo(active - 1)}
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>

            <div className="flex items-center gap-2" aria-label="Choose a photo">
              {GALLERY_IMAGES.map((image, index) => (
                <button
                  key={image.src}
                  type="button"
                  className={`g3d-dot ${index === active ? "is-active" : ""}`}
                  onClick={() => goTo(index)}
                  aria-label={`Show photo ${index + 1}: ${image.alt}`}
                  aria-current={index === active ? "true" : undefined}
                />
              ))}
            </div>

            <button
              type="button"
              className="g3d-arrow"
              onClick={() => goTo(active + 1)}
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}