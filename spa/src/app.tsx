import { useEffect } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { Header } from "@/components/marketing/header";
import { Hero } from "@/components/marketing/hero";
import { JourneyHandle } from "@/components/marketing/journey-handle";
import { LandingDepth } from "@/components/marketing/landing-depth";
import { LandingProgressProvider } from "@/components/marketing/landing-progress";
import { LandingSettingsProvider } from "@/components/marketing/landing-settings";
import { ScrollTrace } from "@/components/marketing/scroll-trace";
import { WhyAttend } from "@/components/marketing/why-attend";
import { MinisterCard } from "@/components/marketing/minister-card";
import { DetailsCard } from "@/components/marketing/details-card";
import { AboutPreview } from "@/components/marketing/about-preview";
import { FlyerSection } from "@/components/marketing/flyer-section";
import { Footer } from "@/components/marketing/footer";
import { FindMyTicketsPage } from "@/components/marketing/find-my-tickets-page";
import { RevealText } from "@/components/ui/reveal-text";
import { TimelineDivider } from "@/components/ui/timeline-divider";
import { SITE_CONFIG } from "@/config/site";

const LANDING_ALIASES = ["/", "/home", "/index", "/landing"];

function EventStructuredData() {
  useEffect(() => {
    const data = {
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

    let script = document.querySelector<HTMLScriptElement>('script[data-event-schema="true"]');
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.eventSchema = "true";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }, []);

  return null;
}

function LandingPage() {
  return (
    <LandingSettingsProvider>
      <LandingProgressProvider>
        <div className="landing-navy min-h-screen flex flex-col">
          <EventStructuredData />
          {/* One scroll-synced WebGL layer for the whole page */}
          <LandingDepth />
          <ScrollTrace />
          <JourneyHandle />
          <div className="relative z-10 flex flex-1 flex-col">
            <Header />
            <Hero />

            {/* One joined surface: Why Attend through the Flyer, flush with hero/footer. */}
            <div className="joined-flow lg:mx-10 border-x border-white/10 bg-[rgba(7,16,30,0.78)] shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
              <WhyAttend />
              <TimelineDivider label="Why Attend" scene="air" />

              {/* Featured Ministers — navy + orbital depth, tight to the section above */}
              <section
                data-scene="road"
                data-enter
                className="ms-root cv-auto relative isolate overflow-hidden pb-10 pt-6 sm:pt-7 lg:pb-8 lg:pt-6"
              >
                <div aria-hidden className="ms-bg">
                  <span className="ms-stars" />
                  <span className="ms-orbit ms-orbit-a" />
                  <span className="ms-orbit ms-orbit-b" />
                  <span className="ms-orbit ms-orbit-c" />
                  <span className="ms-glow" />
                </div>

                <div className="relative z-10 px-6 sm:px-8 lg:px-8 xl:px-10">
                  {/* Header and cards share one cut surface, like Why Attend. */}
                  <div className="ms-joined mx-auto max-w-[1320px]">
                    <div className="ms-intro px-6 py-6 text-center lg:py-7">
                      <span aria-hidden className="mx-auto mb-4 block h-px w-12 bg-[#0E7A6E]" />
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
              <TimelineDivider label="Flyer" scene="arrival" />
              <FlyerSection />
            </div>

            <Footer />
          </div>
        </div>
      </LandingProgressProvider>
    </LandingSettingsProvider>
  );
}

function NotFound() {
  return (
    <main className="landing-navy flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8EE3D6]">404</p>
      <h1 className="text-3xl font-bold text-white sm:text-4xl">Page not found</h1>
      <p className="max-w-md text-sm text-[#B9C4D4]">
        The page you were looking for is not part of this site yet.
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex items-center justify-center rounded-full bg-[#8EE3D6] px-7 py-3 text-sm font-semibold text-[#0E1020] transition hover:bg-white"
      >
        Back to the landing page
      </Link>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      {LANDING_ALIASES.map((path) => (
        <Route key={path} path={path} element={<LandingPage />} />
      ))}
      <Route path="/find-my-tickets" element={<FindMyTicketsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
