"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

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

export function useScannerSession() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScanRef = useRef<string>("");

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
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

  // ── Real-time QR decoding ────────────────────────────────────────────────
  useEffect(() => {
    if (!cameraActive || busy || scanResult.type !== "idle") return;

    let frameId = 0;
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
          if (code?.data) {
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
    // processScan is intentionally re-created each render; the effect only needs
    // to restart when scanning readiness changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive, busy, scanResult.type]);

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
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
    setTorchEnabled(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchEnabled }] } as unknown as MediaTrackConstraints);
      setTorchEnabled(!torchEnabled);
    } catch {
      setCameraError("Torch is not supported on this device.");
    }
  };

  // ── Gate check-in ────────────────────────────────────────────────────────
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
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const data = await res.json().catch(() => ({}));

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
        setScanResult({ type: "error", message: data.error || "Scan failed. Please try again." });
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

  const submitManual = async () => {
    const value = manualCode.trim();
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
    videoRef,
    canvasRef,
    cameraActive,
    cameraStarting,
    cameraError,
    torchEnabled,
    standId,
    manualCode,
    busy,
    scanResult,
    syncing,
    syncMessage,
    lastScanToken: lastScanRef.current,
    updateStandId: setStandId,
    setManualCode,
    startCamera,
    stopCamera,
    toggleTorch,
    clearCameraError: () => setCameraError(null),
    submitManual,
    dismissResult,
    handleFullSync,
    scanImageFile: async (_file: File) => {
      setCameraError("Image scanning requires a decoder. Please scan the physical QR.");
    },
  };
}
