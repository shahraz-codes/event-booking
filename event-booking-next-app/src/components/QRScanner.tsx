"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";

/**
 * Change 2: lets the customer authenticate on the booking-status page by
 * scanning or uploading the QR they received at booking time. The QR encodes
 * the private status URL (…/booking-status?token=<magicLinkToken>). We decode
 * it, pull out the token, and hand it back via `onToken` — the page then calls
 * the existing token-based status flow. No new server auth is required.
 */
export default function QRScanner({
  onToken,
}: {
  onToken: (token: string) => void;
}) {
  const [mode, setMode] = useState<"idle" | "camera">("idle");
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Return type of decodeFromVideoDevice: a control object with .stop().
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  // Pull a token out of a decoded string (a full URL or a bare token).
  const extractToken = (text: string): string | null => {
    const trimmed = text.trim();
    try {
      const url = new URL(trimmed);
      const t = url.searchParams.get("token");
      if (t) return t;
    } catch {
      /* not a URL — fall through */
    }
    // Bare token fallback (no spaces, reasonable length).
    if (trimmed && !/\s/.test(trimmed)) return trimmed;
    return null;
  };

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  };

  useEffect(() => () => stopCamera(), []);

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const url = URL.createObjectURL(file);
      const reader = new BrowserQRCodeReader();
      const result = await reader.decodeFromImageUrl(url);
      URL.revokeObjectURL(url);
      const token = extractToken(result.getText());
      if (token) onToken(token);
      else setError("Couldn't read a valid booking QR from that image.");
    } catch {
      setError("Couldn't read a QR code in that image. Try a clearer photo.");
    }
  };

  const startCamera = async () => {
    setError(null);
    setMode("camera");
    try {
      const reader = new BrowserQRCodeReader();
      controlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result, _err, controls) => {
          if (result) {
            const token = extractToken(result.getText());
            controls.stop();
            controlsRef.current = null;
            setMode("idle");
            if (token) onToken(token);
            else setError("That QR isn't a valid booking link.");
          }
        }
      );
    } catch {
      setError("Camera unavailable or permission denied. Upload the QR instead.");
      setMode("idle");
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-3 text-sm font-medium text-gray-800">
        Have your booking QR? Scan or upload it to open your booking.
      </p>

      {mode === "camera" ? (
        <div className="space-y-2">
          <video
            ref={videoRef}
            className="w-full rounded-lg bg-black"
            muted
            playsInline
          />
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setMode("idle");
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Stop camera
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startCamera}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Scan with camera
          </button>
          <label className="cursor-pointer rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50">
            Upload QR image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
