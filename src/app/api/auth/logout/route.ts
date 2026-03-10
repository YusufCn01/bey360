import { NextRequest } from "next/server";
import { logout } from "@/lib/auth/service";
import { clearSessionCookies, REFRESH_COOKIE } from "@/lib/auth/session";
import { ok } from "@/lib/http/response";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  await logout(refreshToken);
  await clearSessionCookies();

  return ok({ message: "Çıkış yapıldı" });
}
