import { BookOpen, Download } from "lucide-react";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

export const BOOKLET_DOWNLOAD_URL = `${API_BASE}/api/resources/conference-booklet`;

export function BookletDownload() {
  return (
    <div className="w-full max-w-md rounded-[20px] border border-[#CDEFEA] bg-[#EAF9F7] p-5 print:hidden">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#8EE3D6] text-[#0E1020]">
          <BookOpen className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-[#0E1020]">Conference Booklet</div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#0E7A6E]">
            Download the official IHGC 2026 programme and keep it on your device. Your QR pass is saved separately.
          </p>
          <a
            href={BOOKLET_DOWNLOAD_URL}
            download
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0E1020] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#1A1D36]"
          >
            <Download className="h-4 w-4" />
            Download Booklet (PDF)
          </a>
        </div>
      </div>
    </div>
  );
}
