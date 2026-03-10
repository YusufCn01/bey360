import { clearFounderSessionCookie } from "@/lib/auth/founder-session";
import { ok } from "@/lib/http/response";

export async function POST() {
  await clearFounderSessionCookie();
  return ok({ cleared: true });
}
