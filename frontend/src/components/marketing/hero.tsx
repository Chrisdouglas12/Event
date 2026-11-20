import Link from "next/link";
import Image from "next/image";
import { Calendar } from "lucide-react";
import { Countdown } from "@/components/ui/countdown";
import { HeroBackground } from "@/components/marketing/hero-background";
import { ParallaxLayer } from "@/components/marketing/parallax-layer";
import { SITE_CONFIG } from "@/config/site";

export function Hero() {
  return (
    <section className="relative w-full lg:min-h-[720px] flex items-center bg-[#0E1020] overflow-hidden">
      {/* Layer 1: Globe background (slowest / farthest) */}
      <ParallaxLayer speed={0.4} className="absolute inset-0">
        <HeroBackground />
      </ParallaxLayer>

      <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-8 pt-[350px] sm:pt-[390px] pb-14 lg:py-20 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="hidden lg:block lg:col-span-5" />

        <div className="lg:col-span-7 flex flex-col items-start space-y-5 sm:space-y-8 text-left w-full">
          
          {/* Layer 2: Date badge */}
          <ParallaxLayer speed={0.04}>
            <div
              className="hero-fade inline-flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wider uppercase text-gray-300 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-sm"
              style={{ animationDelay: "0.05s" }}
            >
              <Calendar className="w-3.5 h-3.5 text-[#8EE3D6]" strokeWidth={1.8} />
              <span>December 8 – 11, 2026</span>
            </div>
          </ParallaxLayer>

          {/* Layer 3: stacked boxes + logo triangle */}
          <ParallaxLayer speed={0.1} className="w-full">
            <div className="relative w-full flex flex-row items-stretch">
              <div className="w-full flex flex-col relative z-10">
                {/* TOP BOX (White) */}
                <div className="w-full mb-1 sm:mb-1.5">
                  <div 
                    className="bg-white pl-3 sm:pl-5 pr-10 sm:pr-14 py-4 sm:py-5 relative flex flex-col justify-center"
                    style={{ 
                      clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)' 
                    }}
                  >
                    <h1 className="text-[4.2vw] sm:text-3xl font-extrabold leading-[1.1] tracking-tight text-black uppercase whitespace-nowrap">
                      INTERNATIONAL HOLINESS
                    </h1>
                    <h2 className="text-[3.2vw] sm:text-xl font-bold leading-[1.2] tracking-wide text-[#1FA396] uppercase mt-0.5 sm:mt-1 whitespace-nowrap">
                      GENERAL CONFERENCE 2026
                    </h2>
                  </div>
                </div>

                {/* BOTTOM BOX (Mint) - Theme Marquee */}
                <div 
                  className="hero-fade w-full bg-[#8EE3D6] relative overflow-hidden py-4 sm:py-5"
                  style={{ 
                    clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0 100%)',
                    animationDelay: "0.6s" 
                  }}
                >
                  <div className="absolute top-2 sm:top-3 left-3 sm:left-5">
                    <span className="text-[10px] sm:text-sm uppercase tracking-widest text-black/70 font-bold">
                      THEME
                    </span>
                  </div>
                  
                  {/* Marquee Animation for the Quote */}
                  <div className="mt-4 sm:mt-5 flex w-max animate-[hero-marquee_25s_linear_infinite]">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center shrink-0 pr-12">
                        <span className="text-[13px] sm:text-xl md:text-2xl text-black font-extrabold leading-none tracking-tight whitespace-nowrap">
                          &ldquo;{SITE_CONFIG.theme}&rdquo;
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right-side logo triangle, aligned to the shared 85% box notch. */}
              <div 
                className="absolute top-0 bottom-0 z-20 flex items-center justify-center left-[85%] w-[15%]"
                style={{ filter: 'drop-shadow(0 0 1.5px rgba(255,255,255,0.95))' }}
              >
                <div 
                  className="w-full h-full bg-[#8EE3D6] relative flex items-center justify-center"
                  style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 50%)' }}
                >
                  <div className="ml-2 sm:ml-3 relative h-7 w-7 sm:h-12 sm:w-12">
                    <Image
                      src={SITE_CONFIG.logo.src}
                      alt={SITE_CONFIG.logo.alt}
                      fill
                      sizes="(max-width: 639px) 28px, 48px"
                      className="object-contain drop-shadow-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ParallaxLayer>

          {/* Layer 4: Countdown */}
          <ParallaxLayer speed={0.16}>
            <div className="hero-fade pt-1 pb-1" style={{ animationDelay: "0.8s" }}>
              <Countdown />
            </div>
          </ParallaxLayer>

          {/* Layer 5: Register button (closest / fastest lag) */}
          <ParallaxLayer speed={0.22}>
            <div className="hero-fade pt-1" style={{ animationDelay: "1s" }}>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/80 bg-transparent text-white font-semibold text-sm tracking-wide hover:bg-white hover:text-[#0E1020] hover:border-white transition-all duration-200 active:scale-95 shadow-sm"
              >
                Register Now
              </Link>
            </div>
          </ParallaxLayer>
        </div>
      </div>
    </section>
  );
}
