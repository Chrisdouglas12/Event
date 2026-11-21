"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { SITE_CONFIG } from "@/config/site";

export type LandingSettings = {
  eventName: string;
  theme: string;
  datesText: string;
  heroDatesLabel: string;
  openingTimeLabel: string;
  registrationFeeLabel: string;
  whyAttendIntro: string;
  flyerDescription: string;
  startsAt: string;
  endsAt: string;
  venueName: string;
  venueAddress: string;
};

/**
 * Static defaults mirror SITE_CONFIG so server-rendered markup matches the
 * first client render. Once mounted, /api/settings/public replaces them so
 * admins can edit landing copy from the dashboard without a redeploy.
 */
const DEFAULTS: LandingSettings = {
  eventName: SITE_CONFIG.eventTitle,
  theme: SITE_CONFIG.theme,
  datesText: SITE_CONFIG.datesText,
  heroDatesLabel: "December 8 – 11, 2026",
  openingTimeLabel: "4:00 PM WAT",
  registrationFeeLabel: "₦5,000 / $20 / €20 / £20",
  whyAttendIntro:
    "The International Holiness General Conference 2026 takes place from 8 to 11 December at Holiness Campground, Kwali, Abuja.",
  flyerDescription:
    "Download the official International Holiness General Conference 2026 flyer and share it with your chapter/zone, cell groups, and social media. Registration is open now at ₦5,000 / $20 / €20 / £20.",
  startsAt: SITE_CONFIG.startsAt,
  endsAt: SITE_CONFIG.endsAt,
  venueName: SITE_CONFIG.venue.name,
  venueAddress: `${SITE_CONFIG.venue.landmark}, ${SITE_CONFIG.venue.location}`,
};

const LandingSettingsContext = createContext<LandingSettings>(DEFAULTS);

export function useLandingSettings(): LandingSettings {
  return useContext(LandingSettingsContext);
}

type PublicEvent = {
  name?: string;
  theme?: string;
  datesText?: string;
  heroDatesLabel?: string;
  openingTimeLabel?: string;
  registrationFeeLabel?: string;
  whyAttendIntro?: string;
  flyerDescription?: string;
  startsAt?: string;
  endsAt?: string;
  venue?: { name?: string; address?: string } | null;
};

function mapPublicEvent(event?: PublicEvent | null): LandingSettings {
  return {
    eventName: event?.name || DEFAULTS.eventName,
    theme: event?.theme || DEFAULTS.theme,
    datesText: event?.datesText || DEFAULTS.datesText,
    heroDatesLabel: event?.heroDatesLabel || DEFAULTS.heroDatesLabel,
    openingTimeLabel: event?.openingTimeLabel || DEFAULTS.openingTimeLabel,
    registrationFeeLabel:
      event?.registrationFeeLabel || DEFAULTS.registrationFeeLabel,
    whyAttendIntro: event?.whyAttendIntro || DEFAULTS.whyAttendIntro,
    flyerDescription: event?.flyerDescription || DEFAULTS.flyerDescription,
    startsAt: event?.startsAt || DEFAULTS.startsAt,
    endsAt: event?.endsAt || DEFAULTS.endsAt,
    venueName: event?.venue?.name || DEFAULTS.venueName,
    venueAddress: event?.venue?.address || DEFAULTS.venueAddress,
  };
}

export function LandingSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<LandingSettings>(DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/public", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.event) setSettings(mapPublicEvent(data.event));
      })
      .catch(() => {
        // Keep the static defaults when the API is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LandingSettingsContext.Provider value={settings}>
      {children}
    </LandingSettingsContext.Provider>
  );
}
