import Image from "next/image";
import { Sparkles } from "lucide-react";
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

export function MinisterCard({ name, role, bio, image, socials }: MinisterProps) {
  return (
    <TiltCard
      intensity={5}
      className="floating-card rounded-[4px] overflow-hidden grid grid-cols-1 md:grid-cols-12 transition-shadow duration-300 hover:shadow-[0_34px_100px_rgba(0,0,0,0.5)]"
    >
      {/* Left half: Full-bleed portrait image */}
      <div className="md:col-span-5 relative min-h-[320px] md:min-h-full aspect-[4/5] bg-[#0E1020] overflow-hidden">
        {image ? (
          <Image src={image} alt={name} fill className="object-cover object-top" sizes="(max-width: 768px) 100vw, 42vw" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0E1020] p-6 text-center text-xs font-semibold uppercase tracking-wide text-[#8EE3D6]">
            Photo needed: {name}, unique portrait for this page
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07101e]/40 via-transparent to-transparent" />
      </div>

      {/* Right half: Content */}
      <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
        <div className="space-y-3">
          <RevealText
            as="span"
            text={role}
            className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#8EE3D6]"
            stagger={0.02}
          />
          <RevealText
            as="h3"
            text={name}
            className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
            stagger={0.04}
          />
          <RevealText
            as="p"
            text={bio}
            className="text-sm text-[#B9C4D4] leading-relaxed pt-1"
            stagger={0.01}
          />
        </div>

        {/* Circular outlined social buttons */}
        <div className="flex items-center gap-2 pt-6 border-t border-white/10 mt-6">
          {socials?.youtube && (
            <a
              href={socials.youtube}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${name} YouTube`}
              className="w-8 h-8 rounded-full border border-white/20 hover:border-[#8EE3D6] hover:bg-[#8EE3D6]/15 text-[#A9B4C6] hover:text-white flex items-center justify-center transition-colors"
            >
              <YoutubeIcon className="w-3.5 h-3.5" />
            </a>
          )}
          {socials?.facebook && (
            <a
              href={socials.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${name} Facebook`}
              className="w-8 h-8 rounded-full border border-white/20 hover:border-[#8EE3D6] hover:bg-[#8EE3D6]/15 text-[#A9B4C6] hover:text-white flex items-center justify-center transition-colors"
            >
              <FacebookIcon className="w-3.5 h-3.5" />
            </a>
          )}
          {socials?.x && (
            <a
              href={socials.x}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${name} X`}
              className="w-8 h-8 rounded-full border border-white/20 hover:border-[#8EE3D6] hover:bg-[#8EE3D6]/15 text-[#A9B4C6] hover:text-white flex items-center justify-center transition-colors"
            >
              <XIcon className="w-3.5 h-3.5" />
            </a>
          )}
          <span className="text-xs text-[#8C99AC] font-medium pl-1">
            Horemow social channel
          </span>
        </div>
      </div>
    </TiltCard>
  );
}

export function MoreMinistersCard() {
  return (
    <TiltCard
      intensity={4}
      className="rounded-[4px] border-2 border-dashed border-[#8EE3D6]/30 bg-[rgba(7,16,30,0.42)] shadow-[0_24px_80px_rgba(0,0,0,0.34)] p-8 flex flex-col items-center justify-center text-center min-h-[300px] space-y-4 backdrop-blur-xl"
    >
      <div className="w-12 h-12 rounded-full bg-[#8EE3D6]/15 text-[#8EE3D6] flex items-center justify-center shadow-sm">
        <Sparkles className="w-5 h-5" />
      </div>
      <div className="space-y-1 max-w-sm">
        <RevealText
          as="h4"
          text="More Ministers To Be Announced"
          className="text-xl font-bold text-white"
          stagger={0.03}
        />
        <RevealText
          as="p"
          text="Additional minister names and profiles will appear here when supplied by the organizers."
          className="text-sm text-[#B9C4D4]"
          stagger={0.01}
        />
      </div>
      <div className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-[#8EE3D6] bg-white/5 px-4 py-2 rounded-full border border-white/10">
        Information pending
      </div>
    </TiltCard>
  );
}
