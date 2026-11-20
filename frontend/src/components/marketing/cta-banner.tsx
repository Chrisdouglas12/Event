import Link from "next/link";
import Image from "next/image";
import { TiltCard } from "@/components/ui/tilt-card";

export function CtaBanner() {
  return (
    <section data-scene="sea" className="relative w-full py-20 lg:py-24 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/crowd-bw_3.jpg"
          alt="Congregation worshipping"
          fill
          className="object-cover opacity-15 mix-blend-overlay"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07101e]/92 via-[#0A1D24]/80 to-[#07101e]/92" />
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
      <div className="relative z-20 max-w-3xl mx-auto px-6">
        <TiltCard intensity={4} className="floating-card-dark rounded-[28px] px-8 py-12 sm:px-12 space-y-6 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-white leading-[1.12] tracking-tight">
            International Holiness General Conference 2026
          </h2>
          <p className="text-base sm:text-lg text-[#B9C4D4] max-w-xl mx-auto">
            &ldquo;Man and Satan in Contention Against the Holy God&rdquo; · 8–11 December · Kwali, Abuja
          </p>
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
