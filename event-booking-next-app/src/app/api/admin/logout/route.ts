import { COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = Response.json({ success: true });

  response.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`
  );
  response.headers.append(
    "Set-Cookie",
    `admin_logged_in=; Path=/; Max-Age=0; SameSite=Strict`
  );

  return response;
}
