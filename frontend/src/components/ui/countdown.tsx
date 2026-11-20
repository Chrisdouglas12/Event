"use client";

import { Fragment, useEffect, useState } from "react";
import { SITE_CONFIG } from "@/config/site";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
  isEnded: boolean;
}

function calculateTime(): TimeLeft {
  const targetTime = new Date(SITE_CONFIG.startsAt).getTime();
  const endTime = new Date(SITE_CONFIG.endsAt).getTime();
  const now = Date.now();

  if (now >= endTime) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isLive: false, isEnded: true };
  }
  if (now >= targetTime) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isLive: true, isEnded: false };
  }

  const diff = Math.max(0, targetTime - now);
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    isLive: false,
    isEnded: false,
  };
}

export function Countdown() {
  // Calculate on the first render instead of waiting for useEffect. This means
  // the server/static HTML already contains real numbers, not a 00 placeholder.
  // Hydration text differences are suppressed because the target is an absolute
  // timestamp; the browser immediately replaces the build-time value with its
  // own first tick.
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTime());

  useEffect(() => {
    // Re-sync immediately on the client, then tick once per second.
    setTimeLeft(calculateTime());
    const interval = setInterval(() => setTimeLeft(calculateTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (timeLeft.isEnded) {
    return (
      <div
        suppressHydrationWarning
        className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 text-white font-medium text-sm backdrop-blur-sm"
      >
        Conference Concluded • Thank you for attending
      </div>
    );
  }

  if (timeLeft.isLive) {
    return (
      <div
        suppressHydrationWarning
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#8EE3D6] text-[#0E1020] font-bold text-sm tracking-wide animate-pulse"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
        CONFERENCE IS LIVE NOW
      </div>
    );
  }

  const units = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ];

  return (
    <div
      suppressHydrationWarning
      className="flex items-center gap-3 sm:gap-6 text-white py-2"
    >
      {units.map((unit, index) => (
        <Fragment key={unit.label}>
          <div className="text-center min-w-[50px] sm:min-w-[60px]">
            <div
              suppressHydrationWarning
              className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums"
            >
              {String(unit.value).padStart(2, "0")}
            </div>
            <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] text-gray-300 font-medium mt-1">
              {unit.label}
            </div>
          </div>
          {index < units.length - 1 && (
            <span className="text-2xl text-gray-400/80 font-light -mt-3">:</span>
          )}
        </Fragment>
      ))}
    </div>
  );
}
