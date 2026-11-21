"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Phone, Mail, Menu, X, MessageCircle, Share2 } from "lucide-react";
import { FacebookIcon, YoutubeIcon, XIcon } from "@/components/icons/social-icons";
import { SITE_CONFIG } from "@/config/site";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSocialBar, setShowSocialBar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Conference", href: "/conference" },
    { label: "Programme", href: "/programme" },
    { label: "Ministers", href: "/ministers" },
    { label: "Camp Info", href: "/camp-info" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ];

  // Handle scroll for the bottom social bar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 60) {
        // Scrolling down -> Hide
        setShowSocialBar(false);
      } else {
        // Scrolling up -> Show
        setShowSocialBar(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const socials = [
    { href: SITE_CONFIG.socials.facebook, icon: <FacebookIcon className="w-3.5 h-3.5" />, label: "Facebook" },
    { href: SITE_CONFIG.socials.youtube, icon: <YoutubeIcon className="w-3.5 h-3.5" />, label: "YouTube" },
    { href: SITE_CONFIG.socials.x, icon: <XIcon className="w-3.5 h-3.5" />, label: "X" },
    { href: SITE_CONFIG.contact.whatsAppUrl, icon: <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />, label: "WhatsApp" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-[60px]">
        <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          
          {/* Left: Logo + desktop navigation */}
          <div className="flex items-center gap-6 xl:gap-10">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <Image
                src={SITE_CONFIG.logo.src}
                alt={SITE_CONFIG.logo.alt}
                width={SITE_CONFIG.logo.width}
                height={SITE_CONFIG.logo.height}
                className="h-8 sm:h-9 w-auto object-contain"
                style={{ width: "auto" }}
                priority
              />
              <span className="text-xs sm:text-sm font-black tracking-widest text-[#0E1020] uppercase">
                Events
              </span>
            </Link>

            <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-3 xl:gap-5">
              {navLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative whitespace-nowrap text-[11px] xl:text-xs font-semibold transition-colors ${
                      active ? "text-[#0E1020]" : "text-gray-600 hover:text-[#0E1020]"
                    }`}
                  >
                    {link.label}
                    {active && (
                      <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-[#8EE3D6]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Phone, Register, Mobile Menu */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <a
              href={SITE_CONFIG.contact.phoneTel}
              aria-label={`Call ${SITE_CONFIG.contact.phone}`}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-[#CDEFEA] hover:text-[#0E1020] text-gray-600 flex items-center justify-center transition-colors"
              title={SITE_CONFIG.contact.phone}
            >
              <Phone className="w-4 h-4" strokeWidth={1.5} />
            </a>

            <Link
              href="/register"
              className="hidden md:inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-[#8EE3D6] text-[#0E1020] font-semibold text-xs tracking-wide hover:bg-[#7BD4C7] transition-colors ml-1"
            >
              Register Now
            </Link>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-x-0 top-[60px] bottom-0 bg-white z-40 p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg font-semibold text-[#111320] hover:text-[#0E1020] py-2 border-b border-gray-100"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            
            <div className="pt-6 space-y-3">
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#8EE3D6] text-[#0E1020] font-bold text-sm tracking-wide shadow-sm"
              >
                Register Now (Individual / Group)
              </Link>
              <div className="text-center text-xs text-gray-500 pt-2">
                Help desk: {SITE_CONFIG.contact.phone}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Bottom Floating Social Bar (Hidden on scroll down, reveals on scroll up) */}
      <div
        className={`fixed bottom-2 left-1/2 -translate-x-1/2 z-50 transition-transform duration-300 ${
          showSocialBar ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
        }`}
      >
        <div className="flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md px-3 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100">
          {socials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="w-9 h-9 rounded-full bg-gray-50 hover:bg-[#CDEFEA] hover:text-[#0E1020] text-gray-600 flex items-center justify-center transition-colors"
            >
              {social.icon}
            </a>
          ))}
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: SITE_CONFIG.eventTitle,
                  text: `${SITE_CONFIG.eventTitle} — Theme: "${SITE_CONFIG.theme}"`,
                  url: window.location.href,
                }).catch(() => {});
              }
            }}
            aria-label="Share"
            className="w-9 h-9 rounded-full bg-gray-50 hover:bg-[#CDEFEA] hover:text-[#0E1020] text-gray-600 flex items-center justify-center transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </>
  );
}
