import { clearFounderSessionCookie } from "@/lib/auth/founder-session";
import { ok } from "@/lib/http/response";

export async function POST() {
  await clearFounderSessionCookie();
  return ok({ message: "Başarıyla çıkış yapıldı." });
}
