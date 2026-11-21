import { Header } from "@/components/marketing/header";
import { Hero } from "@/components/marketing/hero";
import { LandingDepth } from "@/components/marketing/landing-depth";
import { LandingSettingsProvider } from "@/components/marketing/landing-settings";
import { WhyAttend } from "@/components/marketing/why-attend";
import { MinisterCard, MoreMinistersCard } from "@/components/marketing/minister-card";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { DetailsCard } from "@/components/marketing/details-card";
import { AboutPreview } from "@/components/marketing/about-preview";
import { FlyerSection } from "@/components/marketing/flyer-section";
import { Footer } from "@/components/marketing/footer";
import { Reveal } from "@/components/ui/reveal";
import { RevealText } from "@/components/ui/reveal-text";
import { SITE_CONFIG } from "@/config/site";

export default function HomePage() {
  const eventStructuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: SITE_CONFIG.eventTitle,
    description: "Theme: " + SITE_CONFIG.theme,
    startDate: SITE_CONFIG.startsAt,
    endDate: "2026-12-11",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: SITE_CONFIG.venue.name,
      address: SITE_CONFIG.venue.landmark + ", " + SITE_CONFIG.venue.location,
    },
    organizer: {
      "@type": "Organization",
      name: SITE_CONFIG.ministry,
    },
  };
  return (
    <LandingSettingsProvider>
    <div className="landing-navy min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventStructuredData) }} />
      {/* One scroll-synced WebGL layer for the whole page. */}
      <LandingDepth />
      <div className="relative z-10 flex flex-1 flex-col">
      {/* 55px Slim Header */}
      <Header />

      {/* Hero with live countdown */}
      <Hero />

      {/* Why Attend Section with chamfered collage */}
      <Reveal>
        <WhyAttend />
      </Reveal>

      {/* Featured Ministers Section matching KILO instructor card layout */}
      <Reveal>
        <section data-scene="road" className="relative overflow-hidden py-20 lg:py-28">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="mx-auto mb-12 max-w-2xl text-center lg:mb-16">
              <span aria-hidden className="mx-auto mb-5 block h-px w-12 bg-[#8EE3D6]" />
              <RevealText
                as="h2"
                text="Featured Ministers"
                className="text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-[44px] xl:text-5xl"
                stagger={0.04}
              />
              <RevealText
                as="p"
                text="Pastor Paul Rika and Evang. Linda Paul Rika are featured at IHGC 2026."
                className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#B9C4D4] lg:text-base"
                stagger={0.012}
              />
            </div>

            <div className="space-y-8 lg:space-y-10">
              {SITE_CONFIG.ministersInitial.map((minister) => (
                <MinisterCard
                  key={minister.id}
                  name={minister.name}
                  role={minister.role}
                  bio={minister.bio}
                  image={minister.image}
                  socials={{
                    youtube: SITE_CONFIG.socials.youtube,
                    facebook: SITE_CONFIG.socials.facebook,
                    x: SITE_CONFIG.socials.x,
                  }}
                />
              ))}

              {/* Designed "More ministers to be announced" card */}
              <MoreMinistersCard />
            </div>
          </div>
        </section>
      </Reveal>

      {/* CTA Banner with diagonal triangles */}
      <Reveal>
        <CtaBanner />
      </Reveal>

      {/* Conference Details Card */}
      <Reveal>
        <DetailsCard />
      </Reveal>

      {/* About Horemow Preview with layered video thumbnail */}
      <Reveal>
        <AboutPreview />
      </Reveal>

      {/* Official Conference Flyer */}
      <Reveal>
        <FlyerSection />
      </Reveal>

      {/* Deep Navy Footer */}
      <Footer />
      </div>
    </div>
    </LandingSettingsProvider>
  );
}