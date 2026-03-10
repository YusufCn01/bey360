import { NextRequest } from "next/server";
import { FounderAuthorizationError, requireFounderAccess } from "@/lib/auth/founder-session";
import { fail, ok } from "@/lib/http/response";

export async function GET(request: NextRequest) {
  try {
    const session = await requireFounderAccess(request);
    return ok({
      id: session.sub,
      email: session.email,
      fullName: session.fullName,
    });
  } catch (error) {
    if (error instanceof FounderAuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Kurucu oturumu dogrulanamadi.", "FOUNDER_SESSION_ERROR", 500);
  }
}
