import { scannerDb, CachedParticipant } from "@/lib/offline/dexie-db";
import { verifyGroupOrderToken, verifyTicketToken, sha256Hex } from "@/lib/crypto/ed25519";

export type VerifyOutcome =
  | { status: "found"; participant: CachedParticipant }
  | { status: "group"; orderId: string; participants: CachedParticipant[]; token: string }
  | { status: "forged"; error: string }
  | { status: "unknown"; error: string };

function getVerifierPublicKey(): string {
  return process.env.NEXT_PUBLIC_TICKET_VERIFYING_PUBLIC_KEY || "";
}

export async function resolveScannedToken(tokenString: string): Promise<VerifyOutcome> {
  const publicKey = getVerifierPublicKey();
  const trimmed = tokenString.trim();

  if (trimmed.includes(".")) {
    const groupOrder = await verifyGroupOrderToken(trimmed, publicKey);
    if (groupOrder.isValid) {
      const participants = await scannerDb.cachedParticipants.where("orderId").equals(groupOrder.payload.orderId).toArray();
      if (participants.length !== groupOrder.payload.participantCount) {
        return {
          status: "unknown",
          error: "Group roster is incomplete on this scanner. Sync the participant list while online before using the order QR.",
        };
      }
      return { status: "group", orderId: groupOrder.payload.orderId, participants, token: trimmed };
    }
  }

  const tokenHash = await sha256Hex(trimmed);
  let participant = await scannerDb.cachedParticipants.get(tokenHash);

  if (!participant && /^HGC-[A-HJ-NP-Z2-9]{6}$/.test(trimmed)) {
    participant = await scannerDb.cachedParticipants.where("refCode").equals(trimmed).first();
  }

  if (participant) return { status: "found", participant };
  if (/^HGC-[A-HJ-NP-Z2-9]{6}$/i.test(trimmed)) {
    return {
      status: "unknown",
      error: "A short reference can identify a ticket, but cannot authorize entry. Use Find participant for a supervisor-approved manual check-in.",
    };
  }
  if (!publicKey) return { status: "forged", error: "Ticket verification key is not configured." };

  const verified = await verifyTicketToken(trimmed, publicKey);
  if (!verified.isValid || !verified.payload) {
    return {
      status: "forged",
      error: `Invalid ticket signature — ${verified.error || "ticket rejected"}.`,
    };
  }

  if (verified.payload.version === 1) {
    participant = await scannerDb.cachedParticipants.where("participantId").equals(verified.payload.participantId).first();
  } else {
    participant = await scannerDb.cachedParticipants.where("ticketId").equals(verified.payload.ticketId).first();
  }

  if (!participant) {
    return { status: "unknown", error: "Valid signed ticket, but the participant is not in the current scanner roster." };
  }
  return { status: "found", participant };
}
