// frontend/src/lib/offline/dexie-db.ts
export interface CachedParticipant {
  participantId: string;
  name: string;
  refCode: string;
  status: string;
  checkedInAt?: string | null;
  checkedInStand?: string | null;
  chapterZone?: string | null;
  orderId?: string;
}