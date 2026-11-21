import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";
import { RevealText } from "@/components/ui/reveal-text";
import { TiltCard } from "@/components/ui/tilt-card";

export function AboutPreview() {
  return (
    <section data-scene="sea" data-enter className="cv-auto relative py-12 lg:py-16 overflow-hidden">
      <div className="w-full px-[3px] sm:px-8 lg:px-8 xl:px-10">
        <TiltCard intensity={0} className="landing-card depth-stage">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center p-6 sm:p-10 lg:p-14">
            {/* Left Column: Asymmetric Image Collage with real depth layers */}
            <div className="lg:col-span-6 relative flex justify-center lg:justify-start order-2 lg:order-1 min-h-[440px] depth-stage">
              {/* Graphite outline frame background */}
              <div className="absolute -top-4 -left-4 w-72 h-80 sm:w-80 sm:h-96 rounded-[4px] border-2 border-[#3A404B] shadow-[0_18px_50px_rgba(0,0,0,0.35)] -z-0" />

              <div className="relative z-10 w-full max-w-[480px]">
                {/* Back Main Image */}
                <TiltCard intensity={8} className="image-frame relative w-[85%] max-w-[300px] aspect-[4/5] overflow-hidden bg-[#0E1020] depth-photo depth-card-left">
                  <Image
                    src="/images/about_us_1.jpg"
                    alt="Horemow ministry and fellowship"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 85vw, 480px"
                  />
                </TiltCard>

                {/* Front Overlapping Image */}
                <TiltCard intensity={11} className="image-frame absolute top-12 right-0 w-[55%] max-w-[220px] aspect-square overflow-hidden bg-[#0E1020] depth-photo depth-card-right">
                  <Image
                    src="/images/about_us_2.jpg"
                    alt="Horemow conference interaction"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 55vw, 264px"
                  />
                </TiltCard>

                {/* Video Thumbnail Box with Mint Tint & White Circular Play Button */}
                <a
                  href={SITE_CONFIG.socials.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Watch Horemow video on YouTube"
                  className="image-frame absolute -bottom-6 left-6 w-36 sm:w-44 aspect-[4/3] overflow-hidden group block cursor-pointer depth-card"
                  style={{ transform: "translateZ(40px)" }}
                >
                  <Image
                    src="/images/about_us_3.jpg"
                    alt="Conference video preview"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 144px, 176px"
                  />
                  <div className="absolute inset-0 bg-[#8EE3D6]/40 group-hover:bg-[#8EE3D6]/20 transition-colors flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-[#F8FFFE] shadow-md flex items-center justify-center text-[#0E1020] group-hover:scale-110 transition-transform">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </a>
              </div>
            </div>

            {/* Right Column: Text & Mint Pill Button */}
            <div className="lg:col-span-6 flex flex-col items-start space-y-6 order-1 lg:order-2">
              <RevealText
                as="span"
                text="About The Movement"
                className="text-xs font-bold uppercase tracking-[0.2em] text-[#0E7A6E]"
                speed={18}
              />

              <RevealText
                as="h2"
                text="Holiness Revival Movement Worldwide"
                className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#0E1020] leading-[1.15] tracking-tight"
                speed={14}
              />

              <RevealText
                as="p"
                text="Founded in 2009 by Pastor Paul Rika and formally inaugurated in Kwali, Abuja in 2010, HOREMOW is an end-time movement operating across Christian denominations to revive biblical righteousness, inward and outward holiness, sanctification, and rapture readiness."
                className="text-base text-[#4B5563] leading-relaxed"
                speed={9}
              />

              <RevealText
                as="p"
                text="With chapters spanning Nigeria, East and West Africa, North America, and across the globe, the movement treats the 66 books of the Holy Bible as its absolute and final working manual."
                className="text-sm text-[#6B7280] leading-relaxed"
                speed={9}
              />

              <div className="pt-2">
                <Link
                  href="/about"
                  className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#8EE3D6] text-[#0E1020] font-semibold text-sm tracking-wide hover:bg-[#7BD4C7] shadow-sm transition-all duration-200 active:scale-95"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </TiltCard>
      </div>
    </section>
  );
}
