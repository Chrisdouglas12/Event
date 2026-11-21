import { describe, expect, it } from "vitest";
import {
  createGroupOrderToken,
  createTicketToken,
  deriveTicketPublicKey,
  verifyGroupOrderToken,
  verifyTicketToken,
} from "@/lib/crypto/ed25519";

const TEST_PRIVATE_KEY = "11".repeat(32);

describe("Phase 3: Security & Cryptographic Field Hardening", () => {
  it("generates valid Ed25519 signed ticket and rejects forged signatures", async () => {
    const publicKey = await deriveTicketPublicKey(TEST_PRIVATE_KEY);
    const ticket = await createTicketToken("participant-uuid-1", TEST_PRIVATE_KEY);

    const verified = await verifyTicketToken(ticket.tokenString, publicKey);
    expect(verified.isValid).toBe(true);

    // Tampered token test (1 byte changed)
    const tampered = ticket.tokenString.slice(0, -2) + (ticket.tokenString.endsWith("a") ? "b" : "a");
    const tamperedResult = await verifyTicketToken(tampered, publicKey);
    expect(tamperedResult.isValid).toBe(false);
  });

  it("verifies and secures Group Order passes with participant counts", async () => {
    const publicKey = await deriveTicketPublicKey(TEST_PRIVATE_KEY);
    const orderId = "00000000-0000-4000-8000-000000000001";
    const participantCount = 12;

    const groupToken = await createGroupOrderToken(orderId, participantCount, TEST_PRIVATE_KEY);
    const verified = await verifyGroupOrderToken(groupToken, publicKey);

    expect(verified.isValid).toBe(true);
    if (verified.isValid) {
      expect(verified.payload.orderId).toBe(orderId);
      expect(verified.payload.participantCount).toBe(participantCount);
    }

    // Tampering test: different key
    const OTHER_KEY = "22".repeat(32);
    const otherPublicKey = await deriveTicketPublicKey(OTHER_KEY);
    const forgedResult = await verifyGroupOrderToken(groupToken, otherPublicKey);
    expect(forgedResult.isValid).toBe(false);
  });

  it("simulates offline gate collision resolution rules (earliest timestamp wins)", () => {
    interface OfflineScanRecord {
      participantId: string;
      standId: string;
      clientTime: number;
      syncTime: number;
    }

    // Two devices scan the same participant while offline
    const scanStandA: OfflineScanRecord = {
      participantId: "att-1",
      standId: "Gate A - Stand 1",
      clientTime: 1733648400000, // 09:00:00 AM WAT
      syncTime: 1733652000000,   // Syncs later at 10:00:00 AM
    };

    const scanStandB: OfflineScanRecord = {
      participantId: "att-1",
      standId: "Gate B - Stand 3",
      clientTime: 1733648700000, // 09:05:00 AM WAT (5 minutes later)
      syncTime: 1733649000000,   // Syncs earlier at 09:10:00 AM
    };

    // Simulated State
    let checkedInAt: number | null = null;
    let checkedInStand: string | null = null;
    const conflicts: Array<{ standId: string; clientTime: number; reason: string }> = [];

    function processArrival(scan: OfflineScanRecord) {
      if (checkedInAt === null) {
        checkedInAt = scan.clientTime;
        checkedInStand = scan.standId;
        return "valid";
      }

      if (scan.clientTime < checkedInAt) {
        // Earlier arrival arrived later over sync -> demote previous, update to earlier
        conflicts.push({
          standId: checkedInStand!,
          clientTime: checkedInAt,
          reason: "An earlier offline arrival timestamp was synchronized later.",
        });
        checkedInAt = scan.clientTime;
        checkedInStand = scan.standId;
        return "valid_promoted";
      }

      // Later scan arrived -> flag as conflict
      conflicts.push({
        standId: scan.standId,
        clientTime: scan.clientTime,
        reason: "A prior arrival was recorded with an earlier timestamp.",
      });
      return "conflict";
    }

    // 1. Stand B syncs first (even though its physical scan was later)
    const resB = processArrival(scanStandB);
    expect(resB).toBe("valid");
    expect(checkedInStand).toBe("Gate B - Stand 3");

    // 2. Stand A syncs later (its physical scan was earlier at 09:00)
    const resA = processArrival(scanStandA);
    expect(resA).toBe("valid_promoted");
    // Stand A must now be the verified arrival
    expect(checkedInStand).toBe("Gate A - Stand 1");
    expect(checkedInAt).toBe(1733648400000);
    // Stand B must have been moved to conflicts queue
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].standId).toBe("Gate B - Stand 3");
  });
});

