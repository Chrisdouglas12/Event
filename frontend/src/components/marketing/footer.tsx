import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Phone, ArrowUpRight } from "lucide-react";
import { FacebookIcon, YoutubeIcon, XIcon } from "@/components/icons/social-icons";
import { SITE_CONFIG } from "@/config/site";

export function Footer() {
  return (
    <footer
      data-scene="arrival"
      data-trace-node
      data-trace-label="Footer"
      className="w-full bg-[#0E1020]/85 text-gray-300"
    >
      <div className="max-w-[1240px] mx-auto px-6 sm:px-8 py-16 lg:py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16">
          
          <div className="md:col-span-5 space-y-4">
            <div className="inline-block rounded-lg bg-white p-2.5 shadow-sm">
              <Image
                src={SITE_CONFIG.logo.src}
                alt={SITE_CONFIG.logo.alt}
                width={130}
                height={40}
                className="h-7 w-auto object-contain"
                style={{ width: "auto" }}
              />
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm pt-2">
              Horemow is a non-denominational Christian ministry. IHGC 2026 will take place at Holiness Campground, Kwali, Abuja, from 8 to 11 December.
            </p>
            <div className="pt-2 text-xs text-gray-400">
              <span className="font-semibold text-gray-300">Campground Location:</span> Behind FGC, Kwali, Abuja, Nigeria.
            </div>
          </div>

          <div className="md:col-span-3 space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">
              Social Links
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href={SITE_CONFIG.socials.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-gray-400 hover:text-[#8EE3D6] transition-colors"
                >
                  <YoutubeIcon className="w-4 h-4 text-red-400" />
                  <span>YouTube Channel</span>
                </a>
              </li>
              <li>
                <a
                  href={SITE_CONFIG.socials.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-gray-400 hover:text-[#8EE3D6] transition-colors"
                >
                  <FacebookIcon className="w-4 h-4 text-blue-400" />
                  <span>Facebook Page</span>
                </a>
              </li>
              <li>
                <a
                  href={SITE_CONFIG.socials.x}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-gray-400 hover:text-[#8EE3D6] transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                  <span>X</span>
                </a>
              </li>
              <li>
                <a
                  href={SITE_CONFIG.contact.whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-gray-400 hover:text-[#8EE3D6] transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp Helpline</span>
                </a>
              </li>
              <li>
                <a
                  href={SITE_CONFIG.contact.phoneTel}
                  className="inline-flex items-center gap-2.5 text-gray-400 hover:text-[#8EE3D6] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#8EE3D6]" />
                  <span>{SITE_CONFIG.contact.phone}</span>
                </a>
              </li>
            </ul>

            <div className="pt-4 border-t border-white/10">
              <div className="text-xs font-semibold uppercase tracking-wider text-white mb-2">
                Legal & Info
              </div>
              <div className="flex flex-col space-y-1.5 text-xs text-gray-400">
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms & Refund Policy (Draft)
                </Link>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Notice (Draft)
                </Link>
                <Link href="/camp-info" className="hover:text-white transition-colors">
                  Campground & Accommodation
                </Link>
                <Link href="/find-my-tickets" className="hover:text-white transition-colors">
                  Find My Tickets
                </Link>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">
              Upcoming Event
            </h4>

            <div className="bg-[#121528] p-4 border border-white/5 space-y-3">
              <div className="image-frame relative aspect-[4/3] overflow-hidden bg-gray-900">
                <Image
                  src="/images/conference_flyer.png"
                  alt="IHGC 2026 Conference Flyer"
                  fill
                    className="object-contain"
                  sizes="400px"
                  quality={95}
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] font-semibold text-[#8EE3D6] backdrop-blur-xs">
                  8 – 11 Dec 2026
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Kwali, Abuja • Campground</div>
                <div className="text-sm font-bold text-white leading-snug pt-0.5">
                  IHGC 2026 General Conference
                </div>
              </div>
              <Link
                href="/register"
                className="inline-flex items-center justify-center w-full py-2 rounded-full border border-white/40 text-xs font-semibold text-white hover:bg-white hover:text-[#0E1020] hover:border-white transition-colors"
              >
                Get Tickets (₦5,000 / $20)
              </Link>
            </div>

            <div className="bg-[#121528] p-4 border border-white/5 space-y-3">
              <div className="text-xs text-[#8EE3D6] font-semibold uppercase tracking-wider">
                Group Pass (Chapter / Zone)
              </div>
              <div className="text-xs text-gray-300 leading-snug">
                Register entire chapters/zones or groups with express check-in QR and leader dashboard.
              </div>
              <Link
                href="/register"
                className="inline-flex items-center justify-center w-full py-2 rounded-full border border-white/40 text-xs font-semibold text-white hover:bg-white hover:text-[#0E1020] hover:border-white transition-colors"
              >
                Register Group
              </Link>
            </div>

          </div>

        </div>
      </div>

      <div className="w-full bg-[#171A2B] border-t border-white/5 py-4 px-6 text-center text-xs text-gray-400">
        <div className="max-w-[1240px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>{SITE_CONFIG.copyright}</div>
          <div className="text-gray-500">
            Kwali, Abuja, Nigeria • WAT (UTC+1)
          </div>
        </div>
      </div>
    </footer>
  );
}
