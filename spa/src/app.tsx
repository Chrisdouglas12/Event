import { useEffect } from "react";
import { Link, Route, Routes } from "react-router-dom";
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
      <div className="landing-navy min-h-screen flex flex-col">
        <EventStructuredData />
        {/* One scroll-synced WebGL layer for the whole page */}
        <LandingDepth />
        <div className="relative z-10 flex flex-1 flex-col">
          <Header />
          <Hero />

          <Reveal>
            <WhyAttend />
          </Reveal>

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
                  <MoreMinistersCard />
                </div>
              </div>
            </section>
          </Reveal>

          <Reveal>
            <CtaBanner />
          </Reveal>
          <Reveal>
            <DetailsCard />
          </Reveal>
          <Reveal>
            <AboutPreview />
          </Reveal>
          <Reveal>
            <FlyerSection />
          </Reveal>

          <Footer />
        </div>
      </div>
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
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
