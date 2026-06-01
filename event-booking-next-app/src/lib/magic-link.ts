import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_DAYS = 90;
const TOKEN_PURPOSE = "booking-status";

interface MagicLinkPayload {
  /** Public booking identifier (BNQ-YYYY-NNNN) */
  bid: string;
  /** Issued-at (epoch seconds) */
  iat: number;
  /** Expires-at (epoch seconds) */
  exp: number;
  /** Purpose tag, prevents token reuse across features */
  p: typeof TOKEN_PURPOSE;
}

function getSecret(): string {
  const secret = process.env.BOOKING_MAGIC_LINK_SECRET;
  if (!secret) {
    throw new Error("BOOKING_MAGIC_LINK_SECRET is not configured");
  }
  if (secret.length < 32) {
    throw new Error("BOOKING_MAGIC_LINK_SECRET must be at least 32 characters");
  }
  return secret;
}

function b64urlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function b64urlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

/**
 * Signs a magic-link token that lets a customer access /booking-status?token=...
 * for the given booking. Compact HMAC-SHA256 token (not a full JWT, no header).
 *
 * Format: <base64url(JSON payload)>.<base64url(hmac-sha256 of payload)>
 */
export function signBookingToken(publicBookingId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: MagicLinkPayload = {
    bid: publicBookingId,
    iat: now,
    exp: now + TOKEN_TTL_DAYS * 24 * 60 * 60,
    p: TOKEN_PURPOSE,
  };
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const signature = sign(payloadB64, getSecret());
  return `${payloadB64}.${signature}`;
}

export interface VerifyResult {
  valid: boolean;
  bookingId?: string;
  reason?: "malformed" | "bad-signature" | "expired" | "wrong-purpose";
}

/**
 * Verifies a magic-link token. Returns `{ valid: true, bookingId }` on
 * success, otherwise `{ valid: false, reason }`. Never throws.
 */
export function verifyBookingToken(token: string): VerifyResult {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "malformed" };
  }
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, reason: "malformed" };

  const [payloadB64, providedSig] = parts;
  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return { valid: false, reason: "malformed" };
  }

  const expectedSig = sign(payloadB64, secret);

  const expectedBuf = Buffer.from(expectedSig);
  const providedBuf = Buffer.from(providedSig);
  if (
    expectedBuf.length !== providedBuf.length ||
    !timingSafeEqual(expectedBuf, providedBuf)
  ) {
    return { valid: false, reason: "bad-signature" };
  }

  let payload: MagicLinkPayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString("utf-8"));
  } catch {
    return { valid: false, reason: "malformed" };
  }

  if (payload.p !== TOKEN_PURPOSE) {
    return { valid: false, reason: "wrong-purpose" };
  }
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || now > payload.exp) {
    return { valid: false, reason: "expired" };
  }
  if (!payload.bid || typeof payload.bid !== "string") {
    return { valid: false, reason: "malformed" };
  }

  return { valid: true, bookingId: payload.bid };
}
