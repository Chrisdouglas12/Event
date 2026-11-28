import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { SITE_CONFIG } from "@/config/site";
import { Calendar, MapPin, Users, Download } from "lucide-react";
import { Parallax } from "@/components/ui/parallax";

export const metadata = {
  title: "The Conference | IHGC 2026",
  description: "Theme, schedule overview, and expectations for the International Holiness General Conference 2026.",
};

export default function ConferencePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <section className="bg-[#0E1020] text-white py-16 sm:py-20 relative overflow-hidden">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8EE3D6]">
            Conference Facts
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            International Holiness General Conference 2026
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Theme: <strong className="text-[#8EE3D6]">&ldquo;{SITE_CONFIG.theme}&rdquo;</strong>
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-8 space-y-16">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-[#F8FAFC] rounded-[18px] p-6 border border-gray-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#EAF9F7] text-[#0E7A6E] flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Dates</div>
                <div className="text-base font-bold text-[#111320] mt-0.5">8 – 11 Dec 2026</div>
                <div className="text-xs text-gray-500">Opening: Tuesday at 4:00 PM WAT</div>
              </div>
            </div>

            <div className="bg-[#F8FAFC] rounded-[18px] p-6 border border-gray-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#EAF9F7] text-[#0E7A6E] flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Camp Venue</div>
                <div className="text-base font-bold text-[#111320] mt-0.5">{SITE_CONFIG.venue.name}</div>
                <div className="text-xs text-gray-500">Kwali, Abuja, Nigeria</div>
              </div>
            </div>

            <div className="bg-[#F8FAFC] rounded-[18px] p-6 border border-gray-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#EAF9F7] text-[#0E7A6E] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Registration</div>
                <div className="text-base font-bold text-[#111320] mt-0.5">₦5,000 / $20 / €20 / £20</div>
                <div className="text-xs text-gray-500">Flat rate for every participant</div>
              </div>
            </div>
          </div>

          <div className="bg-[#F8FAFC] rounded-[24px] border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <Parallax speed={0.15} className="relative aspect-[3/4] lg:aspect-auto lg:min-h-[560px] bg-[#0E1020]">
                <Image
                  src="/images/conference_flyer.png"
                  alt="Official flyer for the International Holiness General Conference 2026 — Man and Satan in Contention Against the Holy God, 8–11 December 2026, Holiness Campground, Kwali, Abuja"
                  fill
                  className="object-contain"
                  quality={95}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </Parallax>
              <div className="p-8 sm:p-12 flex flex-col justify-center space-y-6">
                <span className="text-xs font-bold uppercase tracking-widest text-[#0E7A6E]">
                  Official Flyer
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#111320] tracking-tight">
                  International Holiness General Conference 2026
                </h2>
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  &ldquo;{SITE_CONFIG.theme}&rdquo; — 8 to 11 December 2026 at Holiness Campground, behind FGC, Kwali, Abuja.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    href="/images/conference_flyer.png"
                    download="IHGC-2026-Flyer.png"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0E1020] text-white font-bold text-sm hover:bg-[#1A1D36] transition-colors"
                  >
                    <Download className="w-4 h-4 text-[#8EE3D6]" />
                    Download Flyer
                  </a>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#0E1020] text-[#0E1020] font-bold text-sm hover:bg-[#0E1020] hover:text-white transition-colors"
                  >
                    Register Now
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Theme exposition: organizer copy pending */}
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#111320]">
              The Theme: &ldquo;{SITE_CONFIG.theme}&rdquo;
            </h2>
            <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-6 text-sm leading-relaxed text-amber-950">
              The theme is confirmed. An approved theme exposition has not yet been supplied by the organizers.
            </div>
          </div>

          <div className="bg-[#F8FAFC] rounded-[24px] border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="relative aspect-[3/4] lg:aspect-auto lg:min-h-[500px] bg-[#0E1020] p-4 flex items-center justify-center">
                <div className="relative w-full h-full max-h-[480px]">
                  <Image
                    src="/images/conference_programme.jpeg"
                    alt="Official Conference Programme Timetable for IHGC 2026"
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </div>
              <div className="p-8 sm:p-12 flex flex-col justify-center space-y-6">
                <span className="text-xs font-bold uppercase tracking-widest text-[#0E7A6E]">
                  Official Timetable
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#111320] tracking-tight">
                  Conference Programme & Daily Schedule
                </h2>
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  The complete 4-day timetable includes Morning Warfare, Morning Message, Expository Teachings, Afternoon Varieties, Book Reviews, Prayer Sessions, and Revival Messages.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    href="/images/conference_programme.jpeg"
                    download="IHGC-2026-Programme-Schedule.jpeg"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0E1020] text-white font-bold text-sm hover:bg-[#1A1D36] transition-colors"
                  >
                    <Download className="w-4 h-4 text-[#8EE3D6]" />
                    Download Timetable Image
                  </a>
                  <Link
                    href="/programme"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#0E1020] text-[#0E1020] font-bold text-sm hover:bg-[#0E1020] hover:text-white transition-colors"
                  >
                    View Interactive Schedule
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#EAF9F7] border border-[#CDEFEA] rounded-[20px] p-6 sm:p-8 space-y-3">
            <h3 className="text-lg font-bold text-[#0E1020]">
              Important Planning Notice for Participants
            </h3>
            <p className="text-sm text-[#0E7A6E] leading-relaxed">
              Registration is a flat fee of ₦5,000 / $20 / €20 / £20 per participant. <strong>Accommodation and meals are not included.</strong> Participants must arrange their own accommodation and food.
            </p>
            <div className="pt-2">
              <Link href="/camp-info" className="text-xs font-bold text-[#0E1020] underline hover:text-[#0E7A6E]">
                Read Camp Info & Lodging Advisory →
              </Link>
            </div>
          </div>

          <div className="text-center pt-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-10 py-3.5 rounded-full bg-[#8EE3D6] text-[#0E1020] font-bold text-sm tracking-wide hover:bg-[#7BD4C7] shadow-sm transition-all"
            >
              Proceed to Registration
            </Link>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}

