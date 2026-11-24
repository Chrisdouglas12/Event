"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { InlineStyle } from "@/components/marketing/inline-style";
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

// Scattered placement inside the photo stage. Values are percentages of the
// stage so the collage keeps its relaxed feel at every screen size.
const COLLAGE_LAYOUT = [
  { top: "2%", left: "3%", width: "30%", rotate: "-6deg", z: 2 },
  { top: "0%", left: "35%", width: "26%", rotate: "4deg", z: 3 },
  { top: "5%", left: "66%", width: "30%", rotate: "-3deg", z: 1 },
  { top: "38%", left: "1%", width: "28%", rotate: "5deg", z: 3 },
  { top: "34%", left: "30%", width: "36%", rotate: "-2deg", z: 5 },
  { top: "39%", left: "68%", width: "29%", rotate: "6deg", z: 2 },
  { top: "68%", left: "8%", width: "31%", rotate: "-5deg", z: 4 },
  { top: "66%", left: "55%", width: "33%", rotate: "3deg", z: 3 },
] as const;

const COUNT = GALLERY_IMAGES.length;

const GC_CSS = `
.gc-stage{position:relative;width:100%;height:min(86vw,420px);
  touch-action:pan-y;cursor:grab;outline:none}
.gc-stage.is-dragging{cursor:grabbing}
.gc-stage:focus-visible{outline:2px solid #0E7A6E;outline-offset:6px;border-radius:8px}
@media (min-width:640px){.gc-stage{height:min(62vw,500px)}}
@media (min-width:1024px){.gc-stage{height:400px}}

.gc-photo{position:absolute;display:block;overflow:hidden;border-radius:6px;
  border:3px solid rgba(255,255,255,.92);background:#0E1020;
  box-shadow:0 18px 44px rgba(7,16,30,.22);
  transform:rotate(var(--r));
  transition:top .55s cubic-bezier(.2,.8,.2,1),left .55s cubic-bezier(.2,.8,.2,1),
    width .55s cubic-bezier(.2,.8,.2,1),transform .35s cubic-bezier(.2,.8,.2,1),
    box-shadow .35s ease}
.gc-stage.is-dragging .gc-photo{transition:none}
.gc-photo::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(120deg,rgba(255,255,255,.18),transparent 45%);
  opacity:0;transition:opacity .3s ease}
.gc-photo:hover,.gc-photo:focus-visible{transform:translateY(-8px) rotate(var(--r)) scale(1.04);
  box-shadow:0 28px 60px rgba(7,16,30,.34);z-index:20!important;outline:none}
.gc-photo:hover::after,.gc-photo:focus-visible::after{opacity:1}
.gc-photo:focus-visible{box-shadow:0 0 0 3px #0E7A6E,0 28px 60px rgba(7,16,30,.34)}

.gc-hint{display:inline-flex;align-items:center;gap:9px;border:1px solid rgba(14,122,110,.25);
  border-radius:999px;background:rgba(142,227,214,.16);padding:6px 13px;
  color:#0E7A6E;font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
.gc-hint::before{content:"";width:6px;height:6px;border-radius:999px;background:#0E7A6E;
  box-shadow:0 0 0 3px rgba(14,122,110,.12)}

@media (prefers-reduced-motion:reduce){.gc-photo{transition:none}}
`;

export function GalleryCollage() {
  const [spin, setSpin] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startSpin: number } | null>(null);

  // ---------- Drag to spin the collage ----------
  const onStageDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = { startX: event.clientX, startSpin: spin };
    setDragging(true);
  };

  const onStageMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = event.clientX - drag.startX;
    const stepWidth = Math.max(48, event.currentTarget.clientWidth / 10);
    setSpin(drag.startSpin + Math.round(delta / stepWidth));
  };

  const endDrag = () => {
    dragRef.current = null;
    setDragging(false);
  };

  return (
    <section data-scene="sea" data-depth className="cv-auto relative overflow-hidden py-12 lg:py-10">
      <style dangerouslySetInnerHTML={{ __html: GC_CSS }} />

      <div className="px-[3px] sm:px-8 lg:px-8 xl:px-10">
        <div className="relative overflow-hidden">
          {/* Ambient glow — same treatment as the other two-column cards */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#8EE3D6] opacity-[0.10] blur-3xl"
          />

          <div className="landing-card relative grid grid-cols-1 items-stretch lg:grid-cols-12">
            {/* Left: scattered, interactive photo collage */}
            <div className="relative flex items-center justify-center bg-[#F8FAFC]/80 p-4 sm:p-8 lg:col-span-7 lg:border-r lg:border-[#E5E7EB] lg:p-8">
              <div
                className={`gc-stage${dragging ? " is-dragging" : ""}`}
                role="group"
                aria-label="Conference photo collage — drag to spin"
                onPointerDown={onStageDown}
                onPointerMove={onStageMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onPointerLeave={endDrag}
              >
                {GALLERY_IMAGES.map((image, index) => {
                  const slot = ((index + spin) % COUNT + COUNT) % COUNT;
                  const spot = COLLAGE_LAYOUT[slot];
                  return (
                    <div
                      key={image.src}
                      className="gc-photo aspect-[4/3]"
                      style={{
                        top: spot.top,
                        left: spot.left,
                        width: spot.width,
                        zIndex: spot.z,
                        "--r": spot.rotate,
                      } as InlineStyle}
                    >
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        sizes="(max-width: 640px) 34vw, (max-width: 1024px) 24vw, 240px"
                        className="object-cover"
                        draggable={false}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: copy */}
            <div className="flex flex-col items-start justify-center p-8 sm:p-12 lg:col-span-5 lg:p-10 xl:p-12">
              <div className="flex items-center gap-3">
                <span aria-hidden className="h-px w-8 bg-[#8EE3D6]" />
                <RevealText
                  as="span"
                  text="Gallery"
                  className="text-xs font-bold uppercase tracking-[0.2em] text-[#0E7A6E]"
                  speed={18}
                />
              </div>

              <RevealText
                as="h2"
                text="Moments From Previous Conferences"
                className="mt-5 max-w-xl text-3xl font-bold leading-[1.1] tracking-tight text-[#0E1020] sm:text-4xl lg:text-[40px] xl:text-5xl"
                speed={14}
              />

              <RevealText
                as="p"
                text="A scattered collection of worship, baptism and fellowship from past conferences. Drag to spin it and revisit the moments."
                className="mt-6 max-w-xl text-sm leading-relaxed text-[#4B5563] lg:text-base lg:leading-7"
                speed={9}
              />

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSpin((value) => value - 1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D1D5DB] bg-white text-[#4B5563] transition hover:-translate-y-0.5 hover:border-[#0E7A6E] hover:bg-[#0E7A6E] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7A6E]"
                  aria-label="Spin collage left"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>

                <span className="gc-hint">Drag to spin</span>

                <button
                  type="button"
                  onClick={() => setSpin((value) => value + 1)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D1D5DB] bg-white text-[#4B5563] transition hover:-translate-y-0.5 hover:border-[#0E7A6E] hover:bg-[#0E7A6E] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7A6E]"
                  aria-label="Spin collage right"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
