/**
 * Timeline-style divider used between the joined landing sections.
 *
 * It is also a scroll waypoint: LandingProgressProvider reads the data
 * attributes so the landing scene stays in sync with the active section.
 * Purely decorative, so it costs no JavaScript of its own.
 */
export function TimelineDivider({
  label = "Waypoint",
  scene = "road",
}: {
  label?: string;
  scene?: string;
} = {}) {
  return (
    <div
      aria-hidden
      data-trace-node
      data-trace-label={label}
      data-scene={scene}
      className="relative h-px w-full bg-gradient-to-r from-transparent via-[#8EE3D6]/45 to-transparent"
    >
      <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#8EE3D6]/70 bg-[#0B1424] shadow-[0_0_12px_rgba(142,227,214,0.35)]" />
      <span className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#8EE3D6]/15" />
    </div>
  );
}
