"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import type { CachedParticipant } from "@/lib/offline/dexie-db";
import type { ScanResult } from "./scan-result-overlay";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

export function useScannerSession() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [standId, setStandId] = useState("Gate A");
  const [manualCode, setManualCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [issuingBooklet, setIssuingBooklet] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult>({ type: "idle" });
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // ── Helper: Read cookie in browser ─────────────────────────────────
  const getStaffToken = () => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(/(?:^|;\s*)staff_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  // ── 1. Real-Time QR Decoding Loop ──────────────────────────────────
  useEffect(() => {
    if (!cameraActive || busy || scanResult.type !== "idle") return;

    let frameId: number;
    let isScanning = true;

    const scanFrame = () => {
      if (!isScanning) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data) {
            isScanning = false;
            void processScan(code.data);
            return; 
          }
        }
      }
      frameId = requestAnimationFrame(scanFrame);
    };

    scanFrame();

    return () => {
      isScanning = false;
      cancelAnimationFrame(frameId);
    };
  }, [cameraActive, busy, scanResult.type]);

  // ── 2. Camera Controls ─────────────────────────────────────────────
  const startCamera = async () => {
    setCameraStarting(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (err: any) {
      setCameraError(err.message || "Camera unavailable. Check browser permissions.");
    } finally {
      setCameraStarting(false);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setTorchEnabled(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      // @ts-ignore
      await track.applyConstraints({ advanced: [{ torch: !torchEnabled }] });
      setTorchEnabled(!torchEnabled);
    } catch {
      setCameraError("Torch is not supported on this device.");
    }
  };

  // ── 3. Backend Scanning Logic ──────────────────────────────────────
  const processScan = async (token: string, action: "arrival" | "booklet" = "arrival") => {
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
          "Authorization": `Bearer ${staffToken}`, // 👈 Token added
        },
        body: JSON.stringify({ qrToken: token, action, standId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setScanResult({
            type: "already_checked_in",
            participant: {
              participantId: data.participant?.id || "",
              name: data.participant?.name || "Unknown",
              refCode: data.participant?.refCode || "—",
              status: "checked_in",
              checkedInAt: new Date().toISOString(),
              checkedInStand: standId,
            } as CachedParticipant,
            message: data.error || "Already checked in.",
          });
        } else if (res.status === 404) {
          setScanResult({ type: "forged", error: data.error || "Invalid QR signature." });
        } else if (res.status === 401) {
          setScanResult({ type: "error", message: "Session expired. Please log in again." });
        } else {
          setScanResult({ type: "error", message: data.error || "Scan failed." });
        }
      } else {
        setScanResult({
          type: "valid",
          participant: {
            participantId: data.participant.id || "",
            name: data.participant.name,
            refCode: data.participant.refCode,
            status: "confirmed",
            checkedInAt: action === "arrival" ? new Date().toISOString() : null,
            bookletIssuedAt: action === "booklet" ? new Date().toISOString() : null,
          } as CachedParticipant,
          ticketToken: token,
          message: data.message,
        });
      }
    } catch (err: any) {
      setScanResult({ type: "error", message: err.message || "Network error." });
    } finally {
      setBusy(false);
    }
  };

  const submitManual = async () => {
    if (!manualCode.trim()) return;
    await processScan(manualCode.trim());
    setManualCode("");
  };

  const handleIssueBooklet = async (participant: CachedParticipant, ticketToken: string) => {
    setIssuingBooklet(true);
    try {
      await processScan(ticketToken, "booklet");
    } finally {
      setIssuingBooklet(false);
    }
  };

  const dismissResult = () => {
    setScanResult({ type: "idle" });
  };

  // ── 4. Sync & Stubs ────────────────────────────────────────────────
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
        headers: { "Authorization": `Bearer ${staffToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSyncMessage(`Roster synced: ${data.participants.length} participants ready.`);
      } else {
        setSyncMessage("Sync failed.");
      }
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  const handleGroupCheckIn = async (_participants: CachedParticipant[], _orderToken: string) => {
    alert("Group check-in is coming in the next iteration.");
  };

  return {
    videoRef,
    canvasRef,
    cameraActive,
    cameraStarting,
    cameraError,
    torchEnabled,
    standId,
    manualCode,
    busy,
    issuingBooklet,
    scanResult,
    isOnline,
    syncing,
    syncMessage,
    cachedCount: 0,
    pendingCount: 0,
    updateStandId: setStandId,
    setManualCode,
    startCamera,
    stopCamera,
    toggleTorch,
    clearCameraError: () => setCameraError(null),
    submitManual,
    dismissResult,
    handleIssueBooklet,
    handleFullSync,
    handleGroupCheckIn,
    scanImageFile: async (_file: File) => {
      setCameraError("Image scanning requires a decoder. Please scan the physical QR.");
    },
  };
}