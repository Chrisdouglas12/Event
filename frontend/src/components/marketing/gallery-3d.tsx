"use client";

import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { RevealText } from "@/components/ui/reveal-text";

const GALLERY_IMAGES = [
  {
    src: "/gallery/pastor-paul-rika-on-pulpit.jpg",
    alt: "Pastor Paul Rika preaching at the pulpit",
    caption: "Pastor Paul Rika at the pulpit",
  },
  {
    src: "/gallery/pastor-paul-rika-sitting.jpg",
    alt: "Pastor Paul Rika seated at the conference",
    caption: "Pastor Paul Rika at conference",
  },
  {
    src: "/gallery/crowed-sitted.jpg",
    alt: "Conference congregation seated together",
    caption: "The congregation gathered",
  },
  {
    src: "/gallery/water-baptism.jpg",
    alt: "Water baptism during the conference",
    caption: "Water baptism",
  },
  {
    src: "/gallery/altar-call-scene.jpg",
    alt: "Altar call scene at the conference",
    caption: "Altar call",
  },
  {
    src: "/gallery/mummy-linda-standing-on-pulpit.jpg",
    alt: "Evangelist Linda Paul Rika standing at the pulpit",
    caption: "Evang. Linda Paul Rika at the pulpit",
  },
  {
    src: "/gallery/book-review-during-conference.jpg",
    alt: "Book review during the conference",
    caption: "Book review",
  },
  {
    src: "/gallery/pastor-paul-rika-praying.jpg",
    alt: "Pastor Paul Rika praying",
    caption: "Pastor Paul Rika in prayer",
  },
] as const;

// Every image in the gallery folder is 2048×1152 (16:9). Keeping the intrinsic
// dimensions on next/image preserves that ratio instead of cropping or stretching.
const IMAGE_WIDTH = 2048;
const IMAGE_HEIGHT = 1152;
const IMAGE_SIZES = "(max-width: 640px) 78vw, (max-width: 1024px) 52vw, 560px";
const STEP = 360 / GALLERY_IMAGES.length;

function circularDistance(index: number, active: number) {
  const distance = Math.abs(index - active);
  return Math.min(distance, GALLERY_IMAGES.length - distance);
}

export function Gallery3D() {
  const [active, setActive] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const rotationRef = useRef(0);
  const dragRef = useRef<{ startX: number; startRotation: number } | null>(null);

  const applyRotation = useCallback((value: number) => {
    rotationRef.current = value;
    setRotation(value);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const next = ((index % GALLERY_IMAGES.length) + GALLERY_IMAGES.length) % GALLERY_IMAGES.length;
      setActive(next);

      const target = -next * STEP;
      const turns = Math.round((rotationRef.current - target) / 360);
      applyRotation(target + turns * 360);
    },
    [applyRotation]
  );

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = { startX: event.clientX, startRotation: rotationRef.current };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    applyRotation(drag.startRotation + (event.clientX - drag.startX) * 0.28);
  };

  const finishDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsDragging(false);
    goTo(Math.round(-rotationRef.current / STEP));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(active - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(active + 1);
    }
  };

  return (
    <section data-scene="sea" data-enter className="cv-auto relative overflow-hidden py-12 lg:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8EE3D6] opacity-[0.07] blur-3xl"
      />

      <div className="px-6 sm:px-8 lg:px-8 xl:px-10">
        <div className="mx-auto mb-8 max-w-2xl text-center lg:mb-10">
          <span aria-hidden className="mx-auto mb-5 block h-px w-12 bg-[#8EE3D6]" />
          <RevealText
            as="h2"
            text="Moments From the Conference"
            className="text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-[44px] xl:text-5xl"
            speed={14}
          />
          <RevealText
            as="p"
            text="Drag the gallery or use the arrows to move through these moments in 3D."
            className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#B9C4D4] lg:text-base"
            speed={12}
          />
        </div>

        <div
          className={`gallery-3d ${isDragging ? "is-dragging" : ""}`}
          role="group"
          aria-roledescription="3D gallery"
          aria-label="Conference photo gallery"
        >
          <div
            className="gallery-3d__stage"
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onKeyDown={onKeyDown}
            aria-label="Drag horizontally or use the left and right arrow keys to browse photos"
          >
            <div
              className="gallery-3d__ring"
              style={{
                transform: `translateZ(calc(var(--gallery-radius) * -1)) rotateY(${rotation}deg)`,
              }}
            >
              {GALLERY_IMAGES.map((image, index) => {
                const distance = circularDistance(index, active);
                const visibilityClass =
                  distance === 0 ? "is-front" : distance === 1 ? "is-side" : "is-far";

                return (
                  <figure
                    key={image.src}
                    className={`gallery-3d__panel ${visibilityClass}`}
                    style={{ "--angle": `${index * STEP}deg` } as CSSProperties}
                  >
                    <div className="image-frame gallery-3d__frame">
                      <Image
                        src={image.src}
                        alt={image.alt}
                        width={IMAGE_WIDTH}
                        height={IMAGE_HEIGHT}
                        sizes={IMAGE_SIZES}
                        draggable={false}
                        className="block h-auto w-full"
                      />
                    </div>
                    <figcaption className="gallery-3d__caption">{image.caption}</figcaption>
                  </figure>
                );
              })}
            </div>
          </div>

          <div className="gallery-3d__controls">
            <button
              type="button"
              className="gallery-3d__arrow"
              onClick={() => goTo(active - 1)}
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>

            <div className="gallery-3d__dots" aria-label="Choose a photo">
              {GALLERY_IMAGES.map((image, index) => (
                <button
                  key={image.src}
                  type="button"
                  className={`gallery-3d__dot ${index === active ? "is-active" : ""}`}
                  onClick={() => goTo(index)}
                  aria-label={`Show photo ${index + 1}: ${image.caption}`}
                  aria-current={index === active ? "true" : undefined}
                />
              ))}
            </div>

            <button
              type="button"
              className="gallery-3d__arrow"
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
