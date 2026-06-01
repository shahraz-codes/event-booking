import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { createSupabaseServiceClient } from "@/lib/supabase-server";

const INDICATOR_COOKIE_MAX_AGE = 60 * 60 * 8;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // We need a single response object that Supabase can write the session
    // cookies onto. Using NextResponse here (instead of `cookies()` from
    // `next/headers` + a plain `Response`) guarantees the Set-Cookie headers
    // actually make it back to the browser.
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

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !signInData?.user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Admin membership check (RLS-safe via the service-role key).
    const service = createSupabaseServiceClient();
    const { data: adminRow, error: adminLookupError } = await service
      .from("admin_users")
      .select("user_id")
      .eq("user_id", signInData.user.id)
      .maybeSingle();

    if (adminLookupError) {
      console.error("admin_users lookup failed:", adminLookupError);
      await supabase.auth.signOut();
      return NextResponse.json(
        { success: false, error: "Login failed" },
        { status: 500 }
      );
    }

    if (!adminRow) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { success: false, error: "This account is not an admin" },
        { status: 403 }
      );
    }

    // Indicator cookie — purely for the client to detect logged-in state
    // without round-tripping. Auth itself is enforced by Supabase session
    // cookies which were just written to `response` by the supabase-ssr
    // setAll() callback above.
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.headers.append(
      "Set-Cookie",
      `admin_logged_in=1; Path=/; Max-Age=${INDICATOR_COOKIE_MAX_AGE}; SameSite=Lax${secure}`
    );

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Login failed" },
      { status: 500 }
    );
  }
}
