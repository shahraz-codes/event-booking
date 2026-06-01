import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function POST(request: NextRequest) {
  // Mirror of the login route: use NextResponse so supabase-ssr can write
  // the cleared session cookies onto the response that's actually returned.
  const response = NextResponse.json({ success: true });

  const supabase = createServerClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.signOut();

  response.headers.append(
    "Set-Cookie",
    `admin_logged_in=; Path=/; Max-Age=0; SameSite=Lax`
  );

  return response;
}
