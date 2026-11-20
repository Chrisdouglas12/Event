import { scannerDb, type CachedParticipant, type PendingScan } from "@/lib/offline/dexie-db";

type ScanType = "arrival" | "booklet";
type ScannerStatus = CachedParticipant["status"];
type RecordScanResponse = {
  outcome: "checked_in" | "already_checked_in" | "issued" | "already_issued";
  status: ScannerStatus;
  checkedInAt: string | null;
  bookletIssuedAt: string | null;
  checkedInStand: string | null;
};

export type ArrivalCheckInResult = {
  outcome: "checked_in" | "already_checked_in" | "queued";
  participant: CachedParticipant;
};

export type BookletIssueResult = {
  outcome: "issued" | "already_issued" | "queued";
  participant: CachedParticipant;
};

async function queueForSync(
  participant: CachedParticipant,
  scanType: ScanType,
  standId: string,
  clientTimestamp: string,
  idempotencyKey: string,
  proof: { ticketToken?: string; groupOrderToken?: string },
): Promise<void> {
  const scan: PendingScan = {
    participantId: participant.participantId,
    scanType,
    standId,
    clientTimestamp,
    idempotencyKey,
    ...proof,
    synced: false,
  };

  await scannerDb.transaction("rw", scannerDb.cachedParticipants, scannerDb.pendingScans, async () => {
    await scannerDb.cachedParticipants.put(participant);
    await scannerDb.pendingScans.add(scan);
  });

  if (typeof navigator !== "undefined" && navigator.onLine) {
    void fetch("/api/scanner/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scans: [scan] }),
    }).catch(() => {
      // Keep the IndexedDB job for the next explicit sync.
    });
  }
}

function offlineParticipant(participant: CachedParticipant, scanType: ScanType, standId: string, timestamp: string): CachedParticipant {
  if (scanType === "arrival") {
    return {
      ...participant,
      status: participant.bookletIssuedAt ? "booklet_issued" : "checked_in",
      checkedInAt: timestamp,
      checkedInStand: standId,
    };
  }
  return { ...participant, status: "booklet_issued", bookletIssuedAt: timestamp };
}

function onlineParticipant(participant: CachedParticipant, response: RecordScanResponse): CachedParticipant {
  return {
    ...participant,
    status: response.status,
    checkedInAt: response.checkedInAt,
    bookletIssuedAt: response.bookletIssuedAt,
    checkedInStand: response.checkedInStand,
  };
}

async function recordScan(participant: CachedParticipant, scanType: ScanType, standId: string, ticketToken: string) {
  const clientTimestamp = new Date().toISOString();
  const idempotencyKey = crypto.randomUUID();

  if (typeof navigator === "undefined" || !navigator.onLine) {
    const updated = offlineParticipant(participant, scanType, standId, clientTimestamp);
    await queueForSync(updated, scanType, standId, clientTimestamp, idempotencyKey, { ticketToken });
    return { outcome: "queued" as const, participant: updated };
  }

  let response: Response;
  try {
    response = await fetch("/api/scanner/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketToken, scanType, standId, idempotencyKey }),
    });
  } catch {
    // Reuse the same idempotency key if the server committed but the response was lost.
    const updated = offlineParticipant(participant, scanType, standId, clientTimestamp);
    await queueForSync(updated, scanType, standId, clientTimestamp, idempotencyKey, { ticketToken });
    return { outcome: "queued" as const, participant: updated };
  }

  const payload = await response.json().catch(() => null) as (RecordScanResponse & { error?: string }) | null;
  if (!response.ok || !payload?.outcome || !payload.status) {
    throw new Error(payload?.error || "The scan could not be confirmed. Retry the scan or sync this device.");
  }
  const updated = onlineParticipant(participant, payload);
  await scannerDb.cachedParticipants.put(updated);
  return { outcome: payload.outcome, participant: updated };
}

/** Online arrivals use the server's row lock and conditional update. Offline arrivals are queued locally. */
export async function recordArrivalCheckIn(participant: CachedParticipant, standId: string, ticketToken: string): Promise<ArrivalCheckInResult> {
  const result = await recordScan(participant, "arrival", standId, ticketToken);
  if (result.outcome === "queued") return result;
  return { outcome: result.outcome as "checked_in" | "already_checked_in", participant: result.participant };
}

/** Booklet issue requires a recorded arrival online; offline issue remains queued for server validation. */
export async function issueConferenceBooklet(participant: CachedParticipant, standId: string, ticketToken: string): Promise<BookletIssueResult> {
  const result = await recordScan(participant, "booklet", standId, ticketToken);
  if (result.outcome === "queued") return result;
  return { outcome: result.outcome as "issued" | "already_issued", participant: result.participant };
}

/** Applies an offline group action as one IndexedDB transaction and queues each seat for idempotent sync. */
export async function recordGroupArrivalCheckIn(participants: CachedParticipant[], standId: string, groupOrderToken: string): Promise<CachedParticipant[]> {
  const clientTimestamp = new Date().toISOString();
  const eligibleIds = new Set(participants.filter((participant) => participant.status === "confirmed").map((participant) => participant.participantId));
  const updated = participants.map((participant) => eligibleIds.has(participant.participantId)
    ? { ...participant, status: "checked_in" as const, checkedInAt: clientTimestamp, checkedInStand: standId }
    : participant
  );
  const pending: PendingScan[] = participants
    .filter((participant) => eligibleIds.has(participant.participantId))
    .map((participant) => ({
      participantId: participant.participantId,
      scanType: "arrival",
      standId,
      clientTimestamp,
      idempotencyKey: `group_arrival_${crypto.randomUUID()}`,
      groupOrderToken,
      synced: false,
    }));

  await scannerDb.transaction("rw", scannerDb.cachedParticipants, scannerDb.pendingScans, async () => {
    await scannerDb.cachedParticipants.bulkPut(updated);
    if (pending.length) await scannerDb.pendingScans.bulkAdd(pending);
  });
  return updated;
}
