type Props = {
  line1?: string;
  line2?: string;
};

export function MarqueeHeading({
  line1 = "INTERNATIONAL HOLINESS",
  line2 = "GENERAL CONFERENCE 2026",
}: Props) {
  const top = line1.trim() || "INTERNATIONAL HOLINESS";
  const bottom = line2.trim() || "GENERAL CONFERENCE 2026";

  return (
    <div className="w-full mb-2">
      <div 
        className="bg-white pl-4 pr-12 py-5 sm:py-6 relative flex flex-col justify-center"
        style={{ 
          clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)' 
        }}
      >
        <h1 className="text-[4.5vw] sm:text-3xl font-extrabold leading-[1.1] tracking-tight text-black uppercase whitespace-nowrap">
          {top}
        </h1>
        
        <h2 className="text-[3.5vw] sm:text-xl font-bold leading-[1.2] tracking-wide text-[#1FA396] uppercase mt-1 sm:mt-2 whitespace-nowrap">
          {bottom}
        </h2>
      </div>
    </div>
  );
}