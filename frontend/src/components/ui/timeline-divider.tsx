/**
 * Thin timeline-style divider used between the joined landing sections.
 * Purely decorative, so it costs no JavaScript and is hidden from a11y tree.
 */
export function TimelineDivider() {
  return (
    <div
      aria-hidden
      className="relative h-px w-full bg-gradient-to-r from-transparent via-[#8EE3D6]/45 to-transparent"
    >
      <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#8EE3D6]/70 bg-[#0B1424] shadow-[0_0_12px_rgba(142,227,214,0.35)]" />
    </div>
  );
}
