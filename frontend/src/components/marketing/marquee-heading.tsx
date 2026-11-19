type Props = {
  line1?: string;
  line2?: string;
};

const Bullet = () => (
  <span aria-hidden className="mx-4 sm:mx-6 text-[28px] sm:text-[36px] leading-none text-[#8EE3D6] shrink-0">
    •
  </span>
);

/**
 * One continuous sentence marquee:
 * INTERNATIONAL HOLINESS • GENERAL CONFERENCE 2026 • ...
 * As line1 finishes, line2 takes over - looks like full text.
 */
export function MarqueeHeading({
  line1 = "INTERNATIONAL HOLINESS",
  line2 = "GENERAL CONFERENCE 2026",
}: Props) {
  const top = line1.trim() || "INTERNATIONAL HOLINESS";
  const bottom = line2.trim() || "GENERAL CONFERENCE 2026";

  // One full phrase = the unit that repeats
  const Phrase = ({ ariaHidden = false }: { ariaHidden?: boolean }) => (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {/* Part 1 - Solid White */}
      <span className="text-[34px] sm:text-6xl font-extrabold leading-[1.1] tracking-[-0.02em] whitespace-nowrap text-white">
        {top}
      </span>
      <Bullet />
      {/* Part 2 - Outlined Mint */}
      <span className="text-[34px] sm:text-6xl font-extrabold leading-[1.1] tracking-[-0.02em] whitespace-nowrap hero-outline">
        {bottom}
      </span>
      <Bullet />
    </div>
  );

  return (
    <div className="lg:hidden self-stretch -mx-6 sm:-mx-8 overflow-hidden">
      <h1 className="hero-marquee-fallback">
        {top} {bottom}
      </h1>

      <div className="hero-marquee-mask overflow-hidden py-2">
        <div className="hero-marquee-track">
          {/* Half 1 */}
          <div className="flex shrink-0">
            <Phrase />
            <Phrase />
            <Phrase />
          </div>
          {/* Half 2 - identical, for seamless -50% loop */}
          <div className="flex shrink-0" aria-hidden>
            <Phrase ariaHidden />
            <Phrase ariaHidden />
            <Phrase ariaHidden />
          </div>
        </div>
      </div>
    </div>
  );
}