"use client";

import Link from "next/link";
import Image from "next/image";
import { RevealText } from "@/components/ui/reveal-text";
import { TiltCard } from "@/components/ui/tilt-card";
import { useLandingSettings } from "@/components/marketing/landing-settings";

export function CtaBanner() {
  const { eventName, theme, datesText, venueAddress } = useLandingSettings();

  return (
    <section data-scene="sea" data-enter className="cv-auto relative w-full py-12 lg:py-16 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/crowd-bw_3.jpg"
          alt="Congregation worshipping"
          fill
          className="object-cover opacity-10 mix-blend-multiply"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-[#EAF9F7]/85 to-white/90" />
      </div>

      {/* Decorative Triangles matching KILO inspiration */}
      <div
        className="absolute -bottom-8 -left-8 w-40 h-40 bg-[#8EE3D6] opacity-90 z-10 pointer-events-none"
        style={{ clipPath: "polygon(0 0, 0 100%, 100% 100%)" }}
      />
      <div
        className="absolute -top-10 -right-10 w-48 h-48 bg-[#0E1020] opacity-80 z-10 pointer-events-none"
        style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
      />

      {/* Content */}
      <div className="relative z-20 w-full px-6 sm:px-8 lg:px-8 xl:px-10">
        <TiltCard intensity={0} className="landing-card px-8 py-12 sm:px-12 space-y-6 text-center">
          <RevealText
            as="h2"
            text={eventName}
            className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#0E1020] leading-[1.12] tracking-tight"
            speed={14}
          />
          <RevealText
            as="p"
            text={`“${theme}” · ${datesText} · ${venueAddress}`}
            className="text-base sm:text-lg text-[#4B5563] max-w-xl mx-auto"
            speed={9}
          />
          <div className="pt-2">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-9 py-3.5 rounded-full bg-[#8EE3D6] text-[#0E1020] font-bold text-sm tracking-wide hover:bg-[#7BD4C7] transition-all duration-200 shadow-lg active:scale-95"
            >
              Register Now
            </Link>
          </div>
        </TiltCard>
      </div>
    </section>
  );
}
