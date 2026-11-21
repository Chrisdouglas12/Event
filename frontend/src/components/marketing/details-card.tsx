"use client";

import Link from "next/link";
import Image from "next/image";
import { RevealText } from "@/components/ui/reveal-text";
import { TiltCard } from "@/components/ui/tilt-card";
import { useLandingSettings } from "@/components/marketing/landing-settings";

type IconProps = { className?: string };

function IconBase({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function CalendarIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </IconBase>
  );
}

function ClockIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconBase>
  );
}

function MapPinIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </IconBase>
  );
}

function ShareIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.2 10.8l7.6-4.4" />
      <path d="M8.2 13.2l7.6 4.4" />
    </IconBase>
  );
}

export function DetailsCard() {
  const {
    eventName,
    theme,
    datesText,
    heroDatesLabel,
    openingTimeLabel,
    registrationFeeLabel,
    venueName,
    venueAddress,
  } = useLandingSettings();

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: eventName,
          text: `${eventName}. Theme: "${theme}". ${datesText}.`,
          url: window.location.href,
        })
        .catch(() => {});
    }
  };

  const info = [
    {
      icon: CalendarIcon,
      title: heroDatesLabel,
      note: "Tuesday to Friday",
    },
    {
      icon: ClockIcon,
      title: openingTimeLabel,
      note: "Opening session",
    },
    {
      icon: MapPinIcon,
      title: venueName,
      note: venueAddress,
    },
  ];

  return (
    <section data-scene="road" className="relative overflow-hidden py-20 lg:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="mb-12 text-center lg:mb-14">
          <div className="flex items-center justify-center gap-3">
            <span aria-hidden className="h-px w-8 bg-[#8EE3D6]" />
            <RevealText
              as="span"
              text="Plan Your Journey"
              className="text-xs font-bold uppercase tracking-[0.2em] text-[#8EE3D6]"
              stagger={0.02}
            />
            <span aria-hidden className="h-px w-8 bg-[#8EE3D6]" />
          </div>
          <RevealText
            as="h2"
            text="Conference Details"
            className="mt-5 text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-[44px] xl:text-5xl"
            stagger={0.04}
          />
          <RevealText
            as="p"
            text="Essential dates, venue location, and session times"
            className="mx-auto mt-5 max-w-xl text-sm text-[#B9C4D4] lg:text-base"
            stagger={0.012}
          />
        </div>

        <TiltCard
          intensity={4}
          className="floating-card relative w-full overflow-hidden rounded-[4px] ring-1 ring-white/10"
        >
          {/* Ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#8EE3D6] opacity-[0.08] blur-3xl"
          />

          <div className="relative grid grid-cols-1 lg:grid-cols-12">
            {/* Photo */}
            <div className="depth-photo relative aspect-[4/3] overflow-hidden bg-[#0E1020] lg:col-span-5 lg:aspect-auto lg:min-h-[440px] lg:border-r lg:border-white/10">
              <Image
                src="/images/campground.jpg"
                alt="Holiness Campground, Kwali, Abuja, during the 2025 conference"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 42vw"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07101e]/55 via-transparent to-transparent" />
            </div>

            {/* Content */}
            <div className="flex flex-col p-6 sm:p-10 lg:col-span-7 lg:p-12 xl:p-14">
              <div>
                <RevealText
                  as="h3"
                  text={eventName}
                  className="max-w-xl text-2xl font-bold leading-[1.15] tracking-tight text-white sm:text-3xl lg:text-[34px]"
                  stagger={0.03}
                />
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#B9C4D4] lg:text-base lg:leading-7">
                  Theme:{" "}
                  <strong className="font-semibold text-white">
                    &ldquo;{theme}&rdquo;
                  </strong>
                </p>
                <p className="mt-3 text-sm text-[#8C99AC]">
                  Registration:{" "}
                  <strong className="font-semibold text-white">{registrationFeeLabel}</strong>{" "}
                  per participant
                </p>
              </div>

              {/* Info tiles */}
              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:mt-10">
                {info.map(({ icon: Icon, title, note }) => (
                  <div
                    key={note}
                    className="flex min-w-0 flex-col gap-3 rounded-[4px] border border-white/10 bg-white/[0.03] p-4 transition-colors duration-200 hover:border-[#8EE3D6]/30 lg:p-5"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#8EE3D6]/30 bg-[#8EE3D6]/10 text-[#8EE3D6]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold leading-snug text-white">{title}</div>
                      <div className="mt-1 text-xs leading-snug text-[#8C99AC]">{note}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer actions */}
              <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/10 pt-6 lg:mt-auto lg:pt-8">
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share Conference Details"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-[#A9B4C6] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#8EE3D6] hover:bg-[#8EE3D6]/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8EE3D6]"
                >
                  <ShareIcon className="h-4 w-4" />
                </button>

                <Link
                  href="/register"
                  className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-[#8EE3D6] px-8 py-3.5 text-sm font-semibold tracking-wide text-[#0E1020] shadow-[0_8px_30px_rgba(142,227,214,0.25)] transition-all duration-200 hover:bg-[#7BD4C7] hover:shadow-[0_10px_36px_rgba(142,227,214,0.35)] active:scale-95"
                >
                  Register Now
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M5 12h14" />
                    <path d="M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </TiltCard>
      </div>
    </section>
  );
}