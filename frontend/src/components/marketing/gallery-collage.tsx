"use client";

import Image from "next/image";
import { Expand, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { RevealText } from "@/components/ui/reveal-text";

const GALLERY_PHOTOS = [
  {
    src: "/gallery/pastor-paul-rika-on-pulpit.jpg",
    alt: "Pastor Paul Rika preaching at the pulpit",
    caption: "Pastor Paul Rika ministering the Word of holiness at the pulpit",
    tag: "Ministration",
  },
  {
    src: "/gallery/crowed-sitted.jpg",
    alt: "Conference congregation seated together",
    caption: "Believers gathered in expectation at Holiness Campground, Kwali",
    tag: "Congregation",
  },
  {
    src: "/gallery/water-baptism.jpg",
    alt: "Water baptism during the conference",
    caption: "Water baptism service during the General Conference",
    tag: "Ordinance",
  },
  {
    src: "/gallery/altar-call-scene.jpg",
    alt: "Altar call scene at the conference",
    caption: "Souls responding at the altar call in repentance and consecration",
    tag: "Altar Call",
  },
  {
    src: "/gallery/mummy-linda-standing-on-pulpit.jpg",
    alt: "Evang. Linda Paul Rika standing at the pulpit",
    caption: "Evang. Linda Paul Rika exhorting the church to inward and outward holiness",
    tag: "Ministration",
  },
  {
    src: "/gallery/book-review-during-conference.jpg",
    alt: "Book review during the conference",
    caption: "Interactive holiness literature and book review session",
    tag: "Literature",
  },
  {
    src: "/gallery/pastor-paul-rika-praying.jpg",
    alt: "Pastor Paul Rika praying",
    caption: "Fervent intercession and warfare prayer for the nations",
    tag: "Intercession",
  },
  {
    src: "/gallery/pastor-paul-rika-sitting.jpg",
    alt: "Pastor Paul Rika seated at the conference",
    caption: "Pastor Paul Rika during a conference teaching session",
    tag: "Conference",
  },
] as const;

const GC_CSS = `
.gc-viewport{overflow:hidden;scrollbar-width:none;-ms-overflow-style:none}
.gc-viewport::-webkit-scrollbar{display:none}
.gc-marquee{display:flex;width:max-content;animation:gc-roll 60s linear infinite;will-change:transform}
.gc-viewport:hover .gc-marquee,.gc-viewport:focus-within .gc-marquee{animation-play-state:paused}
.gc-photo-image-wrap::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(180deg,rgba(3,10,20,.06) 0%,rgba(3,10,20,.48) 55%,rgba(3,10,20,.96) 100%)}
.gc-expand{opacity:0;transform:translateY(4px);transition:opacity .25s ease,transform .25s ease}
.gc-photo:hover .gc-expand,.gc-photo:focus-visible .gc-expand{opacity:1;transform:none}
@keyframes gc-roll{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}
@media (prefers-reduced-motion:reduce){
  .gc-viewport{overflow-x:auto}
  .gc-marquee{animation:none}
  .gc-photo-image{transition:none}
  .gc-expand{transition:none}
}
`;

export function GalleryCollage() {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIdx === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxIdx(null);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxIdx]);

  const lightbox =
    lightboxIdx !== null && typeof document !== "undefined"
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={GALLERY_PHOTOS[lightboxIdx].caption}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md sm:p-8"
            onClick={() => setLightboxIdx(null)}
          >
            <div
              className="relative w-full max-w-5xl overflow-hidden border border-[#E5E7EB] bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4 border-b border-[#E5E7EB] px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0E7A6E]">
                    {GALLERY_PHOTOS[lightboxIdx].tag}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-[#111827] sm:text-base">
                    {GALLERY_PHOTOS[lightboxIdx].caption}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close gallery viewer"
                  onClick={() => setLightboxIdx(null)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#111827] transition hover:bg-[#F3F4F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7A6E]"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>

              <div className="relative h-[46vh] max-h-[72vh] min-h-[280px] w-full bg-[#111827] sm:h-[62vh]">
                <Image
                  src={GALLERY_PHOTOS[lightboxIdx].src}
                  alt={GALLERY_PHOTOS[lightboxIdx].alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 90vw"
                  className="object-contain"
                />
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <section
      id="gallery"
      data-scene="sea"
      data-depth
      role="region"
      aria-label="Moments from previous conferences"
      className="cv-auto relative py-12 lg:py-10"
    >
      <style dangerouslySetInnerHTML={{ __html: GC_CSS }} />

      <div className="px-[3px] sm:px-8 lg:px-8 xl:px-10">
        <div className="landing-card relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#8EE3D6] opacity-[0.10] blur-3xl"
          />

          <div className="relative flex flex-col gap-6 px-6 py-8 sm:px-10 sm:py-10 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-9">
            <div className="min-w-0 max-w-[650px]">
              <div className="flex items-center gap-3">
                <span aria-hidden className="h-px w-8 bg-[#8EE3D6]" />
                <RevealText
                  as="span"
                  text="Conference Gallery"
                  className="text-xs font-bold uppercase tracking-[0.2em] text-[#0E7A6E]"
                  speed={18}
                />
              </div>

              <RevealText
                as="h2"
                text="Moments From Previous Conferences"
                className="mt-5 font-display text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-[#0E1020] sm:text-4xl lg:text-[40px] xl:text-[44px]"
                speed={14}
              />

              <RevealText
                as="p"
                text="Worship, expository teaching, water baptism, altar calls and fervent intercession captured at Holiness Campground, Kwali, Abuja."
                className="mt-4 max-w-2xl text-sm leading-relaxed text-[#4B5563] lg:text-base lg:leading-7"
                speed={9}
              />
            </div>

          </div>

          <div
            role="group"
            aria-label="Conference photographs"
            className="gc-viewport flex pb-8 pl-4 pr-4 sm:pl-8 sm:pr-8 lg:pl-12 lg:pr-12"
          >
            <div className="gc-marquee">
              {[0, 1].map((copy) => (
                <div
                  key={copy}
                  className="flex"
                  aria-hidden={copy === 1 ? true : undefined}
                >
                  {GALLERY_PHOTOS.map((photo, index) => (
                    <div
                      key={`${copy}-${photo.src}`}
                      className="mr-5 w-[84vw] max-w-[600px] shrink-0 sm:mr-6 sm:w-[62vw] lg:w-[600px]"
                    >
                      <button
                        type="button"
                        tabIndex={copy === 1 ? -1 : undefined}
                        onClick={() => setLightboxIdx(index)}
                        className="image-frame gc-photo group relative block w-full overflow-hidden bg-[#0E1020] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7A6E]"
                      >
                        <span aria-hidden className="gc-photo-image-wrap relative block aspect-[4/3] w-full overflow-hidden">
                          <Image
                            src={photo.src}
                            alt={photo.alt}
                            fill
                            loading="lazy"
                            sizes="(max-width: 640px) 84vw, (max-width: 1024px) 62vw, 600px"
                            className="gc-photo-image object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                          />
                        </span>

                        <span
                          aria-hidden
                          className="gc-expand absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur-sm"
                        >
                          <Expand className="h-4 w-4" />
                        </span>

                        <span className="absolute inset-x-0 bottom-0 block p-5 sm:p-6">
                          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#8EE3D6]">
                            {photo.tag}
                          </span>
                          <span className="mt-1 block text-base font-medium leading-snug text-white sm:text-lg">
                            {photo.caption}
                          </span>
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {lightbox}
    </section>
  );
}
