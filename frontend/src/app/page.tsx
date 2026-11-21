import { Header } from "@/components/marketing/header";
import { Hero } from "@/components/marketing/hero";
import { LandingBackdrop } from "@/components/marketing/landing-backdrop";
import { LandingDepth } from "@/components/marketing/landing-depth";
import { LandingSectionDepth } from "@/components/marketing/landing-section-depth";
import { LandingSettingsProvider } from "@/components/marketing/landing-settings";
import { WhyAttend } from "@/components/marketing/why-attend";
import { MinisterCard } from "@/components/marketing/minister-card";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { DetailsCard } from "@/components/marketing/details-card";
import { AboutPreview } from "@/components/marketing/about-preview";
import { Gallery3D } from "@/components/marketing/gallery-3d";
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventStructuredData) }}
        />
        {/* Fixed camp photo plus one scroll-synced WebGL layer for the whole page. */}
        <LandingBackdrop />
        <LandingDepth />
        <LandingSectionDepth />
        <div className="relative z-10 flex flex-1 flex-col">
          {/* 55px Slim Header */}
          <Header />

          {/* Hero with live countdown */}
          <Hero />

          {/* One joined surface: Why Attend through the Flyer, flush with hero/footer. */}
          <div className="joined-flow mx-[3px] border-x-0 border-white/15 bg-[#07101e]/50 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:mx-6 sm:border-x lg:mx-4 xl:mx-6 2xl:mx-8">
            <WhyAttend />
            <TimelineDivider />

            {/* Featured Ministers */}
            <section data-scene="road" data-enter className="cv-auto relative overflow-hidden py-12 lg:py-16">
              <div className="px-[3px] sm:px-8 lg:px-8 xl:px-10">
                <div className="landing-card mx-auto mb-10 max-w-2xl px-6 py-7 text-center lg:mb-12">
                  <span aria-hidden className="mx-auto mb-5 block h-px w-12 bg-[#0E7A6E]" />
                  <RevealText
                    as="h2"
                    text="Featured Ministers"
                    className="text-3xl font-bold leading-[1.1] tracking-tight text-[#0E1020] sm:text-4xl lg:text-[44px] xl:text-5xl"
                    speed={14}
                  />
                  <RevealText
                    as="p"
                    text="Pastor Paul Rika and Evang. Linda Paul Rika are featured at IHGC 2026."
                    className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#4B5563] lg:text-base"
                    speed={12}
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
                </div>
              </div>
            </section>

            <TimelineDivider />
            <CtaBanner />
            <TimelineDivider />
            <DetailsCard />
            <TimelineDivider />
            <AboutPreview />
            <TimelineDivider />
            <Gallery3D />
            <TimelineDivider />
            <FlyerSection />
          </div>

          {/* Deep Navy Footer */}
          <Footer />
        </div>
      </div>
    </LandingSettingsProvider>
  );
}
