import type { Metadata } from "next";
import { FindMyTicketsPage } from "@/components/marketing/find-my-tickets-page";

export const metadata: Metadata = {
  title: "Find My Tickets | IHGC 2026",
  description:
    "Look up every paid QR code tied to your registered phone number and download your IHGC 2026 tickets.",
};

export default function Page() {
  return <FindMyTicketsPage />;
}
