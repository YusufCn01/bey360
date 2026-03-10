import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { closeRegisterSession, PosValidationError } from "@/modules/pos/application/pos-service";

const closeSessionSchema = z.object({
  sessionId: z.string().min(1),
  closingCash: z.number().nonnegative().optional(),
  note: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "sale:pos");
    const parsed = closeSessionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("POS kapanış formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const session = await closeRegisterSession({
      tenantId: access.tenantId,
      userId: access.userId,
      ...parsed.data,
    });

    return ok(session);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    if (error instanceof PosValidationError) {
      return fail(error.message, "POS_VALIDATION_ERROR", 422);
    }

    return fail("POS oturumu kapanırken hata oluştu.", "POS_SESSION_CLOSE_ERROR", 500);
  }
}
