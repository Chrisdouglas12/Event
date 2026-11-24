"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import {
  Calendar,
  Clock,
  Download,
  Maximize2,
  X,
  FileText,
  Sparkles,
  BookOpen,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

type ScheduleSession = {
  time: string;
  category: string;
  title: string;
  speaker?: string;
  badgeColor?: string;
};

type DaySchedule = {
  date: string;
  dayLabel: string;
  theme?: string;
  sessions: ScheduleSession[];
};

// Official confirmed timetable extracted directly from the conference programme schedule
const OFFICIAL_SCHEDULE: DaySchedule[] = [
  {
    date: "2026-12-08",
    dayLabel: "Tuesday, 8th Dec",
    theme: "Welcome & Opening Revival",
    sessions: [
      {
        time: "4:00 PM – 4:30 PM",
        category: "Arrival & Registration",
        title: "Welcome To Int'l Holiness General Conference, 2026",
        badgeColor: "bg-teal-50 text-[#0E7A6E] border-teal-200",
      },
      {
        time: "4:30 PM – 6:00 PM",
        category: "Book Review",
        title: "HOREMOW Ministry Celebrated At The Birthday Of The International Director",
        speaker: "Reviewer",
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      },
      {
        time: "6:15 PM – 7:00 PM",
        category: "Prayer Session",
        title: "Having the Best of The Conference",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      },
      {
        time: "7:30 PM – 9:00 PM",
        category: "Revival Message",
        title: "Jesus The Way, The Truth And The Life",
        speaker: "Pastor Paul Rika",
        badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
      },
    ],
  },
  {
    date: "2026-12-09",
    dayLabel: "Wednesday, 9th Dec",
    theme: "Spiritual Warfare & Godly Righteousness",
    sessions: [
      {
        time: "6:45 AM – 7:45 AM",
        category: "Morning Warfare",
        title: "Understanding The Scriptures On Satanic Bondage",
        badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      },
      {
        time: "8:00 AM – 9:30 AM",
        category: "Morning Message",
        title: "Turning From Idols, Demons, And Charms To Jesus And Righteousness",
        speaker: "Guest Minister",
        badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
      },
      {
        time: "10:45 AM – 12:15 PM",
        category: "Morning Teaching",
        title: "The Christian Religion",
        speaker: "Pastor Paul Rika",
        badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      },
      {
        time: "12:30 PM – 2:00 PM",
        category: "Afternoon Varieties",
        title: "Group Prayers And Warfare",
        badgeColor: "bg-cyan-50 text-cyan-800 border-cyan-200",
      },
      {
        time: "4:30 PM – 6:00 PM",
        category: "Book Review",
        title: "Instructions To Women On Godly Living With Any Kind Of Husband",
        speaker: "Reviewer",
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      },
      {
        time: "6:15 PM – 7:00 PM",
        category: "Prayer Session",
        title: "God's Grace Upon Marriages",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      },
      {
        time: "7:30 PM – 9:00 PM",
        category: "Revival Message",
        title: "The Way The Lord Ministers To Me In Prophecies And Revelations",
        speaker: "Pastor Paul Rika",
        badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
      },
    ],
  },
  {
    date: "2026-12-10",
    dayLabel: "Thursday, 10th Dec",
    theme: "Victory Through Christ Over Darkness",
    sessions: [
      {
        time: "6:45 AM – 7:45 AM",
        category: "Morning Warfare",
        title: "Let's Bind The Strong Man To Set People Free",
        badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      },
      {
        time: "8:00 AM – 9:30 AM",
        category: "Morning Message",
        title: "At The Name Of Jesus, Every Power Must Bow",
        speaker: "Guest Minister",
        badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
      },
      {
        time: "10:45 AM – 12:15 PM",
        category: "Morning Teaching",
        title: "The Religion Of Darkness",
        speaker: "Pastor Paul Rika",
        badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      },
      {
        time: "12:30 PM – 2:00 PM",
        category: "Afternoon Varieties",
        title: "Contending With The Spirit Of Oppression, Witchcraft And Backsliding",
        badgeColor: "bg-cyan-50 text-cyan-800 border-cyan-200",
      },
      {
        time: "4:30 PM – 6:00 PM",
        category: "Book Review",
        title: "Understanding Witchcrafts And Their Activities In The Church",
        speaker: "Reviewer",
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      },
      {
        time: "6:15 PM – 7:00 PM",
        category: "Prayer Session",
        title: "Cleansing The Church Of Witchcrafts And Satanism",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      },
      {
        time: "7:30 PM – 9:00 PM",
        category: "Revival Message",
        title: "The Victory Of Christ Kingdom Over Satan's Kingdom",
        speaker: "Pastor Paul Rika",
        badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
      },
    ],
  },
  {
    date: "2026-12-11",
    dayLabel: "Friday, 11th Dec",
    theme: "Deliverance, Praise & The Lord's Supper",
    sessions: [
      {
        time: "6:45 AM – 7:45 AM",
        category: "Morning Warfare",
        title: "Whatever We Loose On Earth Shall Be Loose In Heaven",
        badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      },
      {
        time: "8:00 AM – 9:30 AM",
        category: "Morning Message",
        title: "The Doctrine And Activities Of False Exorcist",
        speaker: "Guest Minister",
        badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
      },
      {
        time: "10:45 AM – 12:15 PM",
        category: "Morning Teaching",
        title: "The Religion of Ishmaelites",
        speaker: "Pastor Paul Rika",
        badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      },
      {
        time: "12:30 PM – 2:00 PM",
        category: "Afternoon Varieties",
        title: "Testimonies Of God's Power, Goodness And Mercy",
        badgeColor: "bg-cyan-50 text-cyan-800 border-cyan-200",
      },
      {
        time: "4:30 PM – 6:00 PM",
        category: "Book Review",
        title: "Question And Answer",
        speaker: "Panel & Ministers",
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      },
      {
        time: "6:15 PM – 7:00 PM",
        category: "Prayer Session",
        title: "Thanksgiving, Praise And Worship",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      },
      {
        time: "7:30 PM – 9:00 PM",
        category: "Revival Message",
        title: "Partaking In The Lord's Supper",
        speaker: "Pastor Paul Rika",
        badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
      },
    ],
  },
];

export default function ProgrammePage() {
  const [activeDate, setActiveDate] = useState<string>("2026-12-08");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const selectedDay = useMemo(
    () => OFFICIAL_SCHEDULE.find((d) => d.date === activeDate) || OFFICIAL_SCHEDULE[0],
    [activeDate]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FBFA]">
      <Header />

      {/* Hero Header */}
      <section className="relative overflow-hidden bg-[#0A101D] text-white py-16 sm:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-[#0E7A6E]/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-[#8EE3D6]/15 blur-3xl"
        />

        <div className="relative max-w-[1240px] mx-auto px-6 sm:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold uppercase tracking-widest text-[#8EE3D6]">
            <Sparkles className="w-3.5 h-3.5" />
            Official Conference Timetable
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Conference Programme & Schedule
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Theme: <strong className="text-white">&ldquo;{SITE_CONFIG.theme}&rdquo;</strong> · 8–11 December 2026 at Holiness Campground, Kwali, Abuja.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="/images/conference_programme.jpeg"
              download="IHGC-2026-Programme-Schedule.jpeg"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0E7A6E] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#0E7A6E]/30 hover:bg-[#0B655B] transition-all"
            >
              <Download className="w-4 h-4" />
              Download Timetable (JPEG)
            </a>
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold border border-white/20 transition-all"
            >
              <Maximize2 className="w-4 h-4 text-[#8EE3D6]" />
              View Fullscreen Image
            </button>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#0A101D] text-xs sm:text-sm font-bold hover:bg-gray-100 transition-all"
            >
              Register Now
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="py-12 sm:py-20 flex-1">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          {/* Section 1: Official Timetable Poster Showcase */}
          <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-xl shadow-slate-200/50">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left preview stage */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div
                  onClick={() => setLightboxOpen(true)}
                  className="group relative w-full max-w-[380px] aspect-[1/1.4] rounded-2xl overflow-hidden border border-slate-200 shadow-md cursor-pointer hover:shadow-2xl transition-all duration-300"
                >
                  <Image
                    src="/images/conference_programme.jpeg"
                    alt="Official Conference Programme Timetable for IHGC 2026"
                    fill
                    className="object-contain bg-slate-900 group-hover:scale-[1.02] transition-transform duration-300"
                    priority
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Maximize2 className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs font-bold tracking-wider uppercase">Click to Enlarge</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3 text-center">
                  Official Conference Timetable Poster · Click to view full resolution
                </p>
              </div>

              {/* Right description & download actions */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#0E7A6E]">
                    Complete 4-Day Guide
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                    Official Conference Timetable
                  </h2>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-3">
                    The International Holiness General Conference 2026 schedule features morning warfare prayers, expository bible teachings, practical book reviews, and evening revival messages led by Pastor Paul Rika and anointed guest ministers.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-[#0E7A6E] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Daily Schedule</h4>
                      <p className="text-xs text-slate-600 mt-0.5">Sessions run from 6:45 AM Warfare to 9:00 PM Revival.</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#0E7A6E] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Venue</h4>
                      <p className="text-xs text-slate-600 mt-0.5">Holiness Campground, behind FGC, Kwali, Abuja.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    href="/images/conference_programme.jpeg"
                    download="IHGC-2026-Programme-Schedule.jpeg"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0A101D] text-white text-sm font-bold shadow-md hover:bg-slate-800 transition-colors"
                  >
                    <Download className="w-4 h-4 text-[#8EE3D6]" />
                    Download Timetable Image
                  </a>
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 text-slate-800 text-sm font-bold border border-slate-200 hover:bg-slate-200 transition-colors"
                  >
                    <Maximize2 className="w-4 h-4 text-slate-600" />
                    Preview Full Image
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Interactive Day-by-Day Session Breakdown */}
          <section className="space-y-8">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#0E7A6E]">
                Session Breakdown
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Daily Programme Schedule
              </h2>
              <p className="text-slate-600 max-w-xl mx-auto text-sm sm:text-base">
                Explore the daily order of events, warfare prayers, teachings, and revival meetings.
              </p>
            </div>

            {/* Day Selector Tabs */}
            <div className="flex items-center justify-start sm:justify-center overflow-x-auto gap-2.5 pb-2 scrollbar-none">
              {OFFICIAL_SCHEDULE.map((day) => {
                const isActive = activeDate === day.date;
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setActiveDate(day.date)}
                    className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold shrink-0 transition-all ${
                      isActive
                        ? "bg-[#0A101D] text-white shadow-lg shadow-slate-900/15"
                        : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-extrabold">{day.dayLabel}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Day Card Content */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-lg shadow-slate-200/40 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0E7A6E]">
                    {selectedDay.dayLabel}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                    {selectedDay.theme}
                  </h3>
                </div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200 w-fit">
                  <Calendar className="w-3.5 h-3.5 text-[#0E7A6E]" />
                  {selectedDay.sessions.length} Scheduled Sessions
                </div>
              </div>

              {/* Sessions List */}
              <div className="grid grid-cols-1 gap-4">
                {selectedDay.sessions.map((session, index) => (
                  <article
                    key={index}
                    className="p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white hover:border-[#0E7A6E]/40 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span
                          className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                            session.badgeColor || "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {session.category}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {session.time}
                        </span>
                      </div>
                      <h4 className="text-base sm:text-lg font-bold text-slate-900">
                        {session.title}
                      </h4>
                      {session.speaker && (
                        <p className="text-xs font-medium text-slate-500">
                          Speaker: <span className="font-semibold text-slate-700">{session.speaker}</span>
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* Section 3: Call to Register banner */}
          <section className="bg-gradient-to-r from-[#0A101D] to-[#0E1B2D] text-white rounded-3xl p-8 sm:p-12 text-center space-y-5">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ready to Attend the International Holiness General Conference?
            </h3>
            <p className="text-gray-300 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
              Registration is open online for individuals and church groups worldwide. Register now to secure your pass and unique entry barcode.
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#0E7A6E] text-white font-bold text-sm shadow-xl shadow-[#0E7A6E]/30 hover:bg-[#0B655B] transition-colors"
              >
                Proceed to Registration
              </Link>
            </div>
          </section>

        </div>
      </main>

      {/* Lightbox Modal for Fullscreen Poster View */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
        >
          <div className="relative max-w-5xl w-full h-[90vh] flex flex-col bg-[#0A101D] rounded-2xl overflow-hidden border border-white/10">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
              <div className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#8EE3D6]" />
                Official Conference Programme Timetable
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/images/conference_programme.jpeg"
                  download="IHGC-2026-Programme-Schedule.jpeg"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E7A6E] text-white text-xs font-bold hover:bg-[#0B655B] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image viewport */}
            <div className="relative flex-1 overflow-auto p-4 flex items-center justify-center">
              <div className="relative w-full h-full min-h-[400px]">
                <Image
                  src="/images/conference_programme.jpeg"
                  alt="Official Conference Programme Timetable"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
