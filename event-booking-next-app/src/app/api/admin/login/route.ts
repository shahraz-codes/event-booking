import { NextRequest } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase-server";

const INDICATOR_COOKIE_MAX_AGE = 60 * 60 * 8;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return Response.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !signInData?.user) {
      return Response.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const service = createSupabaseServiceClient();
    const { data: adminRow, error: adminLookupError } = await service
      .from("admin_users")
      .select("user_id")
      .eq("user_id", signInData.user.id)
      .maybeSingle();

    if (adminLookupError) {
      console.error("admin_users lookup failed:", adminLookupError);
      await supabase.auth.signOut();
      return Response.json(
        { success: false, error: "Login failed" },
        { status: 500 }
      );
    }

    if (!adminRow) {
      await supabase.auth.signOut();
      return Response.json(
        { success: false, error: "This account is not an admin" },
        { status: 403 }
      );
    }

    const response = Response.json({ success: true });
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.headers.append(
      "Set-Cookie",
      `admin_logged_in=1; Path=/; Max-Age=${INDICATOR_COOKIE_MAX_AGE}; SameSite=Strict${secure}`
    );
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return Response.json(
      { success: false, error: "Login failed" },
      { status: 500 }
    );
  }
}
