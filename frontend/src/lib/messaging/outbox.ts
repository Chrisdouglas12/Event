import { randomUUID } from "node:crypto";
import { createOrderAccessToken } from "@/lib/crypto/ed25519";

/** Local shape of a notification job; the backend owns persistence. */
type JobInsert = {
  orderId: string;
  participantId: string;
  channel: "sms" | "email";
  payload: {
    participantName: string;
    refCode: string;
    ticketUrl: string;
    phoneE164: string;
    email: string | null;
  };
  idempotencyKey: string;
};
type OrderForNotifications = {
  id: string;
  reference: string;
  payerEmail: string | null;
};
type ParticipantForNotifications = {
  id: string;
  name: string;
  refCode: string;
  phoneE164: string;
  email: string | null;
};

/** Build channel-specific jobs so the SMS record does not also store an email address (and vice versa). */
export async function buildTicketNotificationJobs(
  order: OrderForNotifications,
  orderParticipants: ParticipantForNotifications[],
  options: { appUrl?: string; resend?: boolean } = {},
): Promise<JobInsert[]> {
  if (orderParticipants.length === 0) return [];
  const configuredAppUrl = options.appUrl || process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  if (!configuredAppUrl && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL must be configured before ticket notifications can be queued.");
  }
  const appUrl = (configuredAppUrl || "http://localhost:3000").replace(/\/$/, "");
  const accessToken = await createOrderAccessToken(order.id);
  const ticketUrl = `${appUrl}/ticket/${encodeURIComponent(order.reference)}?access=${encodeURIComponent(accessToken)}`;
  const resendPrefix = options.resend ? `resend:${randomUUID()}:` : "ticket:";

  return orderParticipants.flatMap((participant) => {
    const common = { participantName: participant.name, refCode: participant.refCode, ticketUrl };
    const jobs: JobInsert[] = [{
      orderId: order.id,
      participantId: participant.id,
      channel: "sms",
      payload: { ...common, phoneE164: participant.phoneE164, email: null },
      idempotencyKey: `${resendPrefix}${participant.id}:sms`,
    }];
    const email = participant.email || order.payerEmail;
    if (email) {
      jobs.push({
        orderId: order.id,
        participantId: participant.id,
        channel: "email",
        payload: { ...common, phoneE164: "", email },
        idempotencyKey: `${resendPrefix}${participant.id}:email`,
      });
    }
    return jobs;
  });
}
