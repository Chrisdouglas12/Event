import Dexie, { type EntityTable } from "dexie";

export interface CachedParticipant {
  tokenHash: string; // Primary key for fast O(1) hash lookup
  ticketId: string;
  participantId: string;
  orderId: string;
  refCode: string;
  name: string;
  chapterZone: string | null;
  status: "unconfirmed" | "confirmed" | "checked_in" | "booklet_issued";
  bookletIssuedAt: string | null;
  checkedInAt: string | null;
  checkedInStand: string | null;
  updatedAt: string;
}

export interface PendingScan {
  id?: number;
  participantId: string;
  scanType: "arrival" | "booklet";
  standId: string;
  /** Server attaches the authenticated staff identity at sync time. */
  staffId?: string;
  deviceId?: string;
  /** Proof of the individual QR or signed group order QR that authorized this offline scan. */
  ticketToken?: string;
  groupOrderToken?: string;
  clientTimestamp: string;
  idempotencyKey: string;
  synced: boolean;
}

export interface ScannerSetting {
  key: string;
  value: any;
}

class ScannerDatabase extends Dexie {
  cachedParticipants!: EntityTable<CachedParticipant, "tokenHash">;
  pendingScans!: EntityTable<PendingScan, "id">;
  scannerSettings!: EntityTable<ScannerSetting, "key">;

  constructor() {
    super("HoremowScannerDB");
    this.version(1).stores({
      cachedParticipants: "&tokenHash, participantId, refCode, status",
      pendingScans: "++id, participantId, idempotencyKey, synced",
      scannerSettings: "&key",
    });
    this.version(2).stores({
      cachedParticipants: "&tokenHash, participantId, orderId, refCode, status",
      pendingScans: "++id, participantId, idempotencyKey, synced",
      scannerSettings: "&key",
    });
    this.version(3).stores({
      cachedParticipants: "&tokenHash, ticketId, participantId, orderId, refCode, status",
      pendingScans: "++id, participantId, idempotencyKey, synced",
      scannerSettings: "&key",
    });
  }
}

export const scannerDb = new ScannerDatabase();

