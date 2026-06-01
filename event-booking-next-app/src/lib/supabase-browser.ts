import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client with the anon key. Subject to RLS.
 * Used by client components for Realtime subscriptions and
 * (Phase 7 v2) for customer Email OTP login.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
