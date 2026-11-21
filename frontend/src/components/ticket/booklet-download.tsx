import { BookOpen, Download } from "lucide-react";
import { BOOKLET_FILENAME, BOOKLET_URL } from "@/lib/tickets/ticket-pdf";

/** Post-registration programme booklet download, available to every paid order. */
export function BookletDownload({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href={BOOKLET_URL}
      download={BOOKLET_FILENAME}
      className={`flex w-full items-center justify-center gap-2 rounded-full border border-[#CDEFEA] bg-[#EAF9F7] font-semibold text-[#0E7A6E] transition-colors hover:bg-[#D9F3EF] ${
        compact ? "px-4 py-2.5 text-xs" : "px-5 py-3 text-xs sm:text-sm"
      } cursor-pointer`}
    >
      <BookOpen className="h-4 w-4 shrink-0" />
      <Download className="h-3.5 w-3.5 shrink-0" />
      <span>Download Programme Booklet (PDF)</span>
    </a>
  );
}
