"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { BookOpen, Calendar, Clock, User } from "lucide-react";

type ProgrammeItem = {
  id: string;
  date: string;
  startTime: string;
  endTime: string | null;
  title: string;
  speakerOrLeader: string | null;
  description: string | null;
};

function formatDay(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function formatTime(value: string): string {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return value;
  const hour = Number(match[1]);
  const suffix = hour >= 12 ? "PM" : "AM";
  const twelve = hour % 12 || 12;
  return `${twelve}:${match[2]} ${suffix}`;
}

export default function ProgrammePage() {
  const [programme, setProgramme] = useState<ProgrammeItem[]>([]);
  const [activeDate, setActiveDate] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/public", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const items: ProgrammeItem[] = Array.isArray(data?.programme)
          ? data.programme
          : [];
        setProgramme(items);
        if (items.length) setActiveDate(items[0].date);
      })
      .catch(() => {
        // Keep the empty state when the API is unavailable.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const days = useMemo(
    () => Array.from(new Set(programme.map((item) => item.date))).sort(),
    [programme]
  );

  const visible = programme.filter((item) => item.date === activeDate);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <section className="bg-[#0E1020] text-white py-16 sm:py-20 text-center">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8EE3D6]">Conference Schedule</span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-1">Conference Programme</h1>
          <p className="text-gray-300 max-w-xl mx-auto text-sm sm:text-base">8–11 December 2026 · Holiness Campground, Kwali, Abuja</p>
        </div>
      </section>
      <main className="py-16 sm:py-24 bg-[#FAFAFA] flex-1">
        <div className="max-w-[900px] mx-auto px-6 sm:px-8 space-y-10">
          {days.length > 0 && (
            <div className="flex items-center justify-start sm:justify-center overflow-x-auto gap-2 pb-2">
              {days.map((date) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => setActiveDate(date)}
                  aria-pressed={activeDate === date}
                  className={`px-5 py-3 rounded-full text-xs sm:text-sm font-semibold shrink-0 transition-colors ${
                    activeDate === date
                      ? "bg-[#0E1020] text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {formatDay(date)}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="text-center text-sm text-gray-400">Loading programme…</div>
          ) : days.length === 0 ? (
            <section className="bg-white rounded-[24px] border border-gray-200 p-8 sm:p-12 shadow-sm text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#EAF9F7] text-[#0E7A6E] mx-auto flex items-center justify-center"><BookOpen className="w-7 h-7" /></div>
              <h2 className="text-xl font-bold text-[#111320]">The full programme will be released at the conference</h2>
              <p className="text-sm text-[#6B7280] max-w-lg mx-auto leading-relaxed">The official printed programme booklet will be available at the conference. Check back here for updates as sessions are announced.</p>
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 font-medium bg-gray-50 px-4 py-2 rounded-full border border-gray-100"><Calendar className="w-3.5 h-3.5" />8–11 December 2026</span>
            </section>
          ) : (
            <section className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-[#111320]">{formatDay(activeDate)}</h2>
              </div>
              {visible.map((item) => (
                <article key={item.id} className="bg-white rounded-[18px] border border-gray-200 p-6 sm:p-7 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="sm:w-32 shrink-0">
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0E7A6E]">
                        <Clock className="w-4 h-4" />
                        {formatTime(item.startTime)}
                        {item.endTime ? ` – ${formatTime(item.endTime)}` : ""}
                      </span>
                    </div>
                    <div className="space-y-2 flex-1">
                      <h3 className="text-lg font-bold text-[#111320]">{item.title}</h3>
                      {item.speakerOrLeader && (
                        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                          <User className="w-3.5 h-3.5" /> {item.speakerOrLeader}
                        </p>
                      )}
                      {item.description && (
                        <p className="text-sm text-[#6B7280] leading-relaxed">{item.description}</p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
