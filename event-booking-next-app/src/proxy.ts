import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/api/admin/login"];

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (!isAdminRoute) return NextResponse.next();

  const isPublic = PUBLIC_ADMIN_PATHS.some((p) => pathname === p);
  if (isPublic) return NextResponse.next();

  // 1) Use the user's Supabase session to resolve the current user. The
  //    supabase-ssr client will also refresh tokens (and write the new
  //    cookies onto `response`) when the access token is close to expiry.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.warn("[proxy] supabase.auth.getUser() failed:", userError.message);
  }

  // 2) Membership check uses the SERVICE-ROLE key (bypasses RLS) so we
  //    don't need an explicit "users can read their own admin_users row"
  //    policy. The auth check above is what gates this — if the session
  //    cookie is missing or invalid, `user` is null and we fall through
  //    to the redirect below.
  if (user) {
    const service = createClient(
      requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: adminRow, error: adminError } = await service
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (adminError) {
      console.warn(
        "[proxy] admin_users lookup failed:",
        adminError.message
      );
    }
    if (adminRow) return response;
  }

  if (pathname.startsWith("/api/admin")) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
