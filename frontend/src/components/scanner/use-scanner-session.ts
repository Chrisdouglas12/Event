"use client";

import { useRef, useState } from "react";
import { useQrScanner } from "@/components/scanner/use-qr-scanner";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

export type ScanStatus =
  | { type: "idle" }
  | {
      type: "valid" | "already_checked_in";
      isGroup: boolean;
      seats: number;
      name: string;
      refCode: string;
      message: string;
    }
  | { type: "forged" | "error"; message: string };

/**
 * randomUUID() is unavailable on insecure origins (e.g. a phone opening the
 * dev server over http://192.168.x.x). getRandomValues() still works, so use it
 * as the fallback and keep a final non-crypto fallback for very old browsers.
 */
function makeIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function normalizeManualCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function useScannerSession() {
  const lastScanRef = useRef<string>("");
  const processScanRef = useRef<(token: string) => Promise<void>>(async () => {});

  // The camera hook owns the stream, decoder, torch and image upload. It stays
  // independent of React state changes so a scan cannot restart the loop.
  const scanner = useQrScanner((value) => {
    void processScanRef.current(value);
  });

  const [standId, setStandId] = useState("Gate A");
  const [manualCode, setManualCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanResult, setScanResult] = useState<ScanStatus>({ type: "idle" });
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const getStaffToken = () => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(/(?:^|;\s*)staff_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  const processScan = async (token: string) => {
    setBusy(true);
    setScanResult({ type: "idle" });

    const staffToken = getStaffToken();
    if (!staffToken) {
      setScanResult({ type: "error", message: "Not logged in. Please log in again." });
      setBusy(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({
          qrToken: token,
          standId,
          scanType: "arrival",
          clientTimestamp: new Date().toISOString(),
          idempotencyKey: makeIdempotencyKey(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401 || res.status === 403) {
        setScanResult({
          type: "error",
          message: "Your session has expired. Please log in again.",
        });
        return;
      }

      if (data.result === "forged" || res.status === 404) {
        setScanResult({ type: "forged", message: data.error || "Invalid or forged ticket." });
        return;
      }

      if (data.result === "already_checked_in" || res.status === 409) {
        setScanResult({
          type: "already_checked_in",
          isGroup: !!data.isGroup,
          seats: Number(data.seats) || 1,
          name: data.participant?.name || "Participant",
          refCode: data.participant?.refCode || "—",
          message: data.message || "Already checked in.",
        });
        return;
      }

      if (!res.ok || data.result !== "valid") {
        setScanResult({
          type: "error",
          message: data.error || "Scan failed. Please try again.",
        });
        return;
      }

      setScanResult({
        type: "valid",
        isGroup: !!data.isGroup,
        seats: Number(data.seats) || 1,
        name: data.participant?.name || "Participant",
        refCode: data.participant?.refCode || "—",
        message: data.message || (data.isGroup ? "Group checked in." : "Participant checked in."),
      });
      lastScanRef.current = token;
    } catch (err: any) {
      setScanResult({ type: "error", message: err?.message || "Network error." });
    } finally {
      setBusy(false);
    }
  };

  processScanRef.current = processScan;

  const submitManual = async () => {
    const value = normalizeManualCode(manualCode);
    if (!value) return;
    setManualCode("");
    await processScan(value);
  };

  const dismissResult = () => {
    setScanResult({ type: "idle" });
    lastScanRef.current = "";
  };

  const handleFullSync = async () => {
    setSyncing(true);
    setSyncMessage("Syncing roster with server...");
    const staffToken = getStaffToken();
    if (!staffToken) {
      setSyncMessage("Not logged in. Cannot sync.");
      setSyncing(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/participants`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSyncMessage(`Roster synced: ${data.participants?.length || 0} paid participants ready.`);
      } else {
        setSyncMessage("Sync failed.");
      }
    } catch {
      setSyncMessage("Sync failed.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  return {
    ...scanner,
    standId,
    manualCode,
    busy,
    scanResult,
    syncing,
    syncMessage,
    lastScanToken: lastScanRef.current,
    updateStandId: setStandId,
    setManualCode,
    submitManual,
    dismissResult,
    handleFullSync,
  };
}
