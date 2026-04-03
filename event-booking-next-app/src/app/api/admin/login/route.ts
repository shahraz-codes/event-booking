import { NextRequest } from "next/server";
import {
  verifyPassword,
  createToken,
  COOKIE_NAME,
  TOKEN_TTL_HOURS,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return Response.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    if (!verifyPassword(password)) {
      return Response.json(
        { success: false, error: "Invalid password" },
        { status: 401 }
      );
    }

    const token = createToken();
    const maxAge = TOKEN_TTL_HOURS * 60 * 60;

    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    const response = Response.json({ success: true });

    response.headers.append(
      "Set-Cookie",
      `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Strict${secure}`
    );
    response.headers.append(
      "Set-Cookie",
      `admin_logged_in=1; Path=/; Max-Age=${maxAge}; SameSite=Strict${secure}`
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
