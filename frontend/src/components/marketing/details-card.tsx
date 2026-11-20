"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, MapPin, Share2 } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";
import { RevealText } from "@/components/ui/reveal-text";
import { TiltCard } from "@/components/ui/tilt-card";

export function DetailsCard() {
  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: SITE_CONFIG.eventTitle,
          text: `${SITE_CONFIG.eventTitle}. Theme: "${SITE_CONFIG.theme}". ${SITE_CONFIG.datesText}.`,
          url: window.location.href,
        })
        .catch(() => {});
    }
  };

  return (
    <section data-scene="road" className="relative py-20 lg:py-24 overflow-hidden">
      <div className="w-full px-[5px]">
        <div className="mb-10 text-center">
          <RevealText
            as="span"
            text="Plan Your Journey"
            className="text-xs font-bold uppercase tracking-[0.2em] text-[#8EE3D6]"
            stagger={0.02}
          />
          <RevealText
            as="h2"
            text="Conference Details"
            className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl"
            stagger={0.04}
          />
          <RevealText
            as="p"
            text="Essential dates, venue location, and session times"
            className="mt-2 text-sm text-[#A9B4C6]"
            stagger={0.012}
          />
        </div>

        <TiltCard intensity={4} className="w-full floating-card rounded-[4px] overflow-hidden">
          <div className="grid grid-cols-1 items-center gap-6 p-6 sm:p-8 md:grid-cols-12">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[4px] border border-[#8EE3D6]/25 bg-[#0E1020] md:col-span-4 depth-photo">
              <Image
                src="/images/campground.jpg"
                alt="Holiness Campground, Kwali, Abuja, during the 2025 conference"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 320px"
              />
            </div>

            <div className="space-y-2 md:col-span-4 md:pr-4">
              <RevealText
                as="span"
                text="International Holiness General Conference 2026"
                className="block text-[10px] font-bold uppercase tracking-widest text-[#8EE3D6]"
                stagger={0.02}
              />
              <RevealText
                as="h3"
                text={SITE_CONFIG.eventTitle}
                className="text-lg font-bold leading-snug text-white sm:text-xl"
                stagger={0.03}
              />
              <p className="text-xs text-[#B9C4D4] sm:text-sm">
                Theme: <strong className="font-semibold text-white">&ldquo;{SITE_CONFIG.theme}&rdquo;</strong>
              </p>
              <p className="pt-1 text-xs text-[#8C99AC]">
                Registration: <strong className="text-white">₦5,000 / $20 / €20 / £20</strong> per participant
              </p>
            </div>

            <div className="hidden h-36 w-px bg-white/10 md:col-span-1 md:block" />

            <div className="space-y-3.5 text-xs text-white md:col-span-3">
              <div className="flex items-start gap-2.5">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#8EE3D6]" strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <div className="font-bold text-white">Dec 8–11, 2026</div>
                  <div className="text-[11px] text-[#8C99AC]">Tuesday to Friday</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#8EE3D6]" strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <div className="font-bold text-white">4:00 PM WAT</div>
                  <div className="text-[11px] text-[#8C99AC]">Opening session</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8EE3D6]" strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <div className="font-bold text-white">{SITE_CONFIG.venue.name}</div>
                  <div className="text-[11px] leading-tight text-[#8C99AC]">Behind FGC, Kwali, Abuja</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 bg-transparent px-6 py-3.5 sm:px-8">
            <button
              onClick={handleShare}
              aria-label="Share Conference Details"
              className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-white/20 bg-white/5 text-[#A9B4C6] shadow-2xs transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8EE3D6]"
            >
              <Share2 className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
            </button>

            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-[#8EE3D6] px-6 py-2 text-xs font-semibold tracking-wide text-[#0E1020] shadow-sm transition-colors hover:bg-[#7BD4C7]"
            >
              Register Now
            </Link>
          </div>
        </TiltCard>
      </div>
    </section>
  );
}
