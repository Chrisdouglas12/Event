// frontend/src/lib/offline/dexie-db.ts
export interface CachedAttendee {
  attendeeId: string;
  name: string;
  refCode: string;
  status: string;
  checkedInAt?: string | null;
  bookletIssuedAt?: string | null;
  checkedInStand?: string | null;
  parish?: string | null;
  orderId?: string;
}