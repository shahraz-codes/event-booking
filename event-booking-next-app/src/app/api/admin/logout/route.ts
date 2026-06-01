import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const response = Response.json({ success: true });
  response.headers.append(
    "Set-Cookie",
    `admin_logged_in=; Path=/; Max-Age=0; SameSite=Strict`
  );
  return response;
}
