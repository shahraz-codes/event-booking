"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

// Change 2: renders a QR that encodes the private status URL (which carries the
// signed magic-link token). Scanning it on any device opens the booking-status
// page with full access — the same credential the "Open My Booking" link uses.
export default function BookingQRCode({
  value,
  fileName = "booking-qr.png",
  size = 200,
}: {
  value: string;
  fileName?: string;
  size?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    const canvas = wrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={wrapRef}
        className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
      >
        <QRCodeCanvas value={value} size={size} includeMargin level="M" />
      </div>
      <button
        type="button"
        onClick={handleDownload}
        className="rounded-lg border border-brand-300 bg-white px-4 py-1.5 text-xs font-medium text-brand-800 transition-colors hover:bg-brand-50"
      >
        {downloaded ? "Saved!" : "Download QR"}
      </button>
    </div>
  );
}
