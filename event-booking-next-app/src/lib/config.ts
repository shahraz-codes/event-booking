// Runtime-safe access to public app config.
// `NEXT_PUBLIC_APP_NAME` is inlined at build time by Next.js, so this
// value is available on both the server and the client.
export const APP_NAME: string =
  process.env.NEXT_PUBLIC_APP_NAME?.trim() || "AR Banquets";

// Change 1: per-banquet booking-ID prefix. Each deployment's .env yields a
// distinct ID format (e.g. ARB-2026-0001). Resolution order:
//   1. BOOKING_ID_PREFIX (explicit)
//   2. initials of NEXT_PUBLIC_APP_NAME  ("AR Banquets" -> "ARB")
//   3. "BNQ"
// Sanitised to uppercase alphanumerics (max 8 chars) so it stays valid in the
// `startsWith` sequence query and in generated PDF filenames.
function sanitizePrefix(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.length ? cleaned.slice(0, 8) : "";
}

const derivedFromName = (process.env.NEXT_PUBLIC_APP_NAME ?? "")
  .split(/\s+/)
  .map((w) => w[0] ?? "")
  .join("");

export const BOOKING_ID_PREFIX: string =
  sanitizePrefix(process.env.BOOKING_ID_PREFIX || "") ||
  sanitizePrefix(derivedFromName) ||
  "BNQ";
