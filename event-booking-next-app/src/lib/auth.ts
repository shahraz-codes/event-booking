import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase-server";

/**
 * Returns true if the current request carries either:
 *   (a) a valid Supabase session cookie (web admin), OR
 *   (b) an `Authorization: Bearer <jwt>` access token (RN admin, Phase 5)
 * AND the corresponding user is a member of the `admin_users` table.
 *
 * Kept as `Promise<boolean>` so every existing /api/admin/* handler keeps
 * working unchanged.
 */
export async function getAdminSession(): Promise<boolean> {
  const userId = await resolveAuthenticatedUserId();
  if (!userId) return false;

  const service = createSupabaseServiceClient();
  const { data, error } = await service
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("admin_users lookup failed:", error);
    return false;
  }
  return !!data;
}

async function resolveAuthenticatedUserId(): Promise<string | null> {
  const bearerUserId = await resolveBearerUserId();
  if (bearerUserId) return bearerUserId;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function resolveBearerUserId(): Promise<string | null> {
  const headerStore = await headers();
  const authHeader = headerStore.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return null;

  const accessToken = authHeader.slice(7).trim();
  if (!accessToken) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const {
    data: { user },
  } = await client.auth.getUser(accessToken);
  return user?.id ?? null;
}
