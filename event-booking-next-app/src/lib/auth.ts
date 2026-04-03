import { createHmac } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_token";
const TOKEN_TTL_HOURS = 8;

function getSecret(): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error("ADMIN_SECRET is not configured");
  return secret;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createToken(): string {
  const exp = Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  const signature = sign(payload, getSecret());
  return `${payload}.${signature}`;
}

export function verifyToken(token: string): boolean {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;

    const expectedSig = sign(payload, getSecret());
    if (signature !== expectedSig) return false;

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf-8")
    );
    if (typeof data.exp !== "number" || Date.now() > data.exp) return false;

    return true;
  } catch {
    return false;
  }
}

export function verifyPassword(password: string): boolean {
  return password === process.env.ADMIN_PASSWORD;
}

export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyToken(token);
}

export { COOKIE_NAME, TOKEN_TTL_HOURS };
