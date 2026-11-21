import Image from "next/image";
import { FacebookIcon, YoutubeIcon, XIcon } from "@/components/icons/social-icons";
import { RevealText } from "@/components/ui/reveal-text";
import { TiltCard } from "@/components/ui/tilt-card";

export interface MinisterProps {
  name: string;
  role: string;
  bio: string;
  image?: string;
  socials?: {
    youtube?: string;
    facebook?: string;
    x?: string;
    website?: string;
  };
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D1D5DB] bg-white text-[#4B5563] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0E7A6E] hover:bg-[#EAF9F7] hover:text-[#0E7A6E]"
    >
      {children}
    </a>
  );
}

export function MinisterCard({ name, role, bio, image, socials }: MinisterProps) {
  return (
    <TiltCard
      intensity={0}
      className="landing-card group grid grid-cols-1 overflow-hidden md:grid-cols-12"
    >
      {/* Portrait: fixed, left-aligned and identical for every minister. */}
      <div className="flex justify-start p-4 sm:p-6 md:col-span-5 md:p-8">
        <div className="image-frame relative aspect-[4/5] w-[220px] max-w-full shrink-0 overflow-hidden bg-[#0E1020] sm:w-[260px] lg:w-[280px]">
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 220px, (max-width: 1024px) 260px, 280px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0E1020] p-6 text-center text-xs font-semibold uppercase tracking-wide text-[#8EE3D6]">
              Photo needed: {name}, unique portrait for this page
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07101e]/55 via-transparent to-transparent" />
        </div>
      </div>

      {/* Content */}
      <div className="relative flex flex-col justify-between p-6 sm:p-8 lg:p-10 md:col-span-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#8EE3D6] opacity-[0.07] blur-3xl"
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px w-6 bg-[#0E7A6E]" />
            <RevealText
              as="span"
              text={role}
              className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#0E7A6E]"
              speed={18}
            />
          </div>

          <RevealText
            as="h3"
            text={name}
            className="mt-4 text-2xl font-bold leading-[1.15] tracking-tight text-[#0E1020] sm:text-3xl lg:text-4xl"
            speed={14}
          />

          <RevealText
            as="p"
            text={bio}
            className="mt-5 max-w-prose text-sm leading-relaxed text-[#4B5563] lg:text-[15px] lg:leading-7"
            speed={9}
          />
        </div>

        {/* Socials */}
        <div className="relative mt-8 flex items-center gap-2.5 border-t border-[#E5E7EB] pt-6">
          {socials?.youtube && (
            <SocialLink href={socials.youtube} label={`${name} YouTube`}>
              <YoutubeIcon className="h-4 w-4" />
            </SocialLink>
          )}
          {socials?.facebook && (
            <SocialLink href={socials.facebook} label={`${name} Facebook`}>
              <FacebookIcon className="h-4 w-4" />
            </SocialLink>
          )}
          {socials?.x && (
            <SocialLink href={socials.x} label={`${name} X`}>
              <XIcon className="h-4 w-4" />
            </SocialLink>
          )}
          {socials?.website && (
            <SocialLink href={socials.website} label={`${name} website`}>
              <GlobeIcon className="h-4 w-4" />
            </SocialLink>
          )}
          <span className="pl-1.5 text-xs font-medium text-[#6B7280]">
            Horemow social channel
          </span>
        </div>
      </div>
    </TiltCard>
  );
}
