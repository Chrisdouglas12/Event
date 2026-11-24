import { Header } from "@/components/marketing/header";
import { Hero } from "@/components/marketing/hero";
import { JourneyHandle } from "@/components/marketing/journey-handle";
import { LandingDepth } from "@/components/marketing/landing-depth";
import { LandingProgressProvider } from "@/components/marketing/landing-progress";
import { LandingSettingsProvider } from "@/components/marketing/landing-settings";
import { ScrollTrace } from "@/components/marketing/scroll-trace";
import { SplashScreen } from "@/components/marketing/splash-screen";
import { WhyAttend } from "@/components/marketing/why-attend";
import { MinisterCard } from "@/components/marketing/minister-card";
import { DetailsCard } from "@/components/marketing/details-card";
import { AboutPreview } from "@/components/marketing/about-preview";
import { GalleryCollage } from "@/components/marketing/gallery-collage";
import { FlyerSection } from "@/components/marketing/flyer-section";
import { Footer } from "@/components/marketing/footer";
import { RevealText } from "@/components/ui/reveal-text";
import { TimelineDivider } from "@/components/ui/timeline-divider";
import { SITE_CONFIG } from "@/config/site";

export default function HomePage() {
  const eventStructuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: SITE_CONFIG.eventTitle,
    description: "Theme: " + SITE_CONFIG.theme,
    startDate: SITE_CONFIG.startsAt,
    endDate: SITE_CONFIG.endsAt,
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
      <LandingProgressProvider>
        {/* Globe-orbit intro before the landing page */}
        <SplashScreen />

        <div className="landing-navy min-h-screen flex flex-col">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(eventStructuredData),
            }}
          />

          {/* One scroll-synced WebGL layer for the page. No photo backdrop:
              navy, starfield and orbital geometry carry the whole journey. */}
          <LandingDepth />

          {/* Single scroll-driven car trace connecting every section. */}
          <ScrollTrace />

          {/* Edge grip that orbits the 3D journey filament in LandingDepth. */}
          <JourneyHandle />

          <div className="relative z-10 flex flex-1 flex-col">
            <Header />

            {/* Hero with the orbital 3D countdown */}
            <Hero />

            {/* One joined surface: Why Attend through the Flyer. */}
            <div className="joined-flow lg:mx-10 bg-[#07101e]/50 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
              <TimelineDivider label="Why Attend" scene="air" />
              <WhyAttend />
              <TimelineDivider label="Ministers" scene="road" />

              {/* Featured Ministers — navy + orbital depth, tucked tightly
                  under the Why Attend band so the flow reads as one surface. */}
              <section
                data-scene="road"
                data-trace-node
                data-trace-label="Ministers"
                className="ms-root cv-auto relative isolate overflow-hidden pb-10 pt-6 sm:pt-7 lg:pb-8 lg:pt-6"
              >
                <div aria-hidden className="ms-bg">
                  <span className="ms-stars" />
                  <span className="ms-orbit ms-orbit-a" />
                  <span className="ms-orbit ms-orbit-b" />
                  <span className="ms-orbit ms-orbit-c" />
                  <span className="ms-glow" />
                </div>

                <div className="relative z-10 px-[3px] sm:px-8 lg:px-8 xl:px-10">
                  {/* Header and cards share one cut surface, like Why Attend. */}
                  <div className="ms-joined mx-auto max-w-[1320px]">
                    <div className="ms-intro px-6 py-6 text-center lg:py-7">
                      <span
                        aria-hidden
                        className="mx-auto mb-4 block h-px w-12 bg-[#0E7A6E]"
                      />

                      <RevealText
                        as="h2"
                        text="Featured Ministers"
                        className="text-3xl font-bold leading-[1.1] tracking-tight text-[#0E1020] sm:text-4xl lg:text-[44px] xl:text-5xl"
                        speed={14}
                      />

                      <RevealText
                        as="p"
                        text="Pastor Paul Rika and Evang. Linda Paul Rika are featured at IHGC 2026."
                        className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#4B5563] lg:text-base"
                        speed={12}
                      />
                    </div>

                    <div className="ms-group grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-0">
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
                    </div>
                  </div>
                </div>
              </section>

              <TimelineDivider label="Details" scene="road" />
              <DetailsCard />
              <TimelineDivider label="About" scene="road" />
              <AboutPreview />
              <TimelineDivider label="Gallery" scene="sea" />
              <GalleryCollage />
              <TimelineDivider label="Flyer" scene="arrival" />
              <FlyerSection />
            </div>

            {/* Deep Navy Footer */}
            <Footer />
          </div>
        </div>
      </LandingProgressProvider>
    </LandingSettingsProvider>
  );
}
