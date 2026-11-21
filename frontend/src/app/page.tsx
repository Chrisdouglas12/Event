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
      <section data-scene="road" className="relative py-20 lg:py-24 overflow-hidden">
        <div className="w-full px-[5px]">
          <div className="text-center max-w-2xl mx-auto px-4 mb-14 space-y-2">
            <RevealText
              as="span"
              text="Featured Ministers"
              className="text-xs font-bold uppercase tracking-[0.2em] text-[#8EE3D6]"
              stagger={0.02}
            />
            <RevealText
              as="h2"
              text="Featured Ministers"
              className="text-3xl sm:text-4xl font-bold text-white tracking-tight"
              stagger={0.04}
            />
            <RevealText
              as="p"
              text="Pastor Paul Rika and Evang. Linda Paul Rika are featured at IHGC 2026."
              className="text-sm text-[#A9B4C6]"
              stagger={0.012}
            />
          </div>

          <div className="space-y-10">
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
