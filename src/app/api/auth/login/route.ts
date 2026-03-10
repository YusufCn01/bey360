import { NextRequest } from "next/server";
import { AuthError, login } from "@/lib/auth/service";
import { setSessionCookies } from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/validators";
import { writeAuditLog } from "@/lib/audit/audit-service";
import { isDatabaseConnectionError } from "@/lib/db/error-utils";
import { fail, ok } from "@/lib/http/response";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Giris formu gecersiz.", "VALIDATION_ERROR", 422);
  }

  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || "0.0.0.0";
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await login(parsed.data, ipAddress, userAgent);
    await setSessionCookies(result.accessToken, result.refreshToken);

    await writeAuditLog({
      tenantId: result.tenant.id,
      userId: result.user.id,
      module: "auth",
      entityName: "session",
      entityId: result.user.id,
      action: "login.success",
      ipAddress,
      userAgent: userAgent ?? "",
      payload: {
        tenantSlug: result.tenant.slug,
      },
    });

    return ok({
      user: result.user,
      tenant: result.tenant,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return fail(error.message, error.code, 401);
    }

    if (isDatabaseConnectionError(error)) {
      return fail(
        "Veritabani baglantisi kurulamadi. Sunucu ayarlarinda DATABASE_URL ve migration adimlarini kontrol edin.",
        "DB_CONNECTION_ERROR",
        503,
      );
    }

    return fail("Giris sirasinda beklenmeyen bir hata olustu.", "INTERNAL_ERROR", 500);
  }
}
