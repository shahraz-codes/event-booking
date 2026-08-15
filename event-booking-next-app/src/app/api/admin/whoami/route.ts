// TEMPORARY DIAGNOSTIC — remove after fixing the RN "Unauthorized" issue.
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

function refFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m ? m[1] : null;
}

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function GET() {
  const h = await headers();
  const authHeader = h.get("authorization") ?? "";
  const hasBearer = authHeader.toLowerCase().startsWith("bearer ");
  const token = hasBearer ? authHeader.slice(7).trim() : "";

  const serverRef = refFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const decoded = token ? decodeJwt(token) : null;
  const iss = typeof decoded?.iss === "string" ? decoded.iss : null;
  const tokenRef = refFromUrl(iss);
  const tokenExp = typeof decoded?.exp === "number" ? decoded.exp : null;

  let userResolved = false;
  let userId: string | null = null;
  let getUserError: string | null = null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (token && url && anon) {
    try {
      const client = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await client.auth.getUser(token);
      if (error) getUserError = error.message;
      userResolved = !!data.user;
      userId = data.user?.id ?? null;
    } catch (e) {
      getUserError = e instanceof Error ? e.message : "getUser threw";
    }
  }

  let isAdmin = false;
  if (userId) {
    try {
      const service = createSupabaseServiceClient();
      const { data } = await service
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      isAdmin = !!data;
    } catch {
      // ignore
    }
  }

  return Response.json({
    hasBearer,
    serverRef,
    tokenRef,
    projectMatch: !!serverRef && !!tokenRef && serverRef === tokenRef,
    tokenExp,
    tokenExpired: tokenExp ? tokenExp * 1000 < Date.now() : null,
    userResolved,
    userId,
    getUserError,
    isAdmin,
  });
}
