import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { openRegisterSession, PosValidationError } from "@/modules/pos/application/pos-service";

const openSessionSchema = z.object({
  registerId: z.string().min(1).max(100),
  registerName: z.string().min(2).max(255),
  openingCash: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "sale:pos");
    const parsed = openSessionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("POS oturum formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const session = await openRegisterSession({
      tenantId: access.tenantId,
      userId: access.userId,
      ...parsed.data,
    });

    return ok(session, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    if (error instanceof PosValidationError) {
      return fail(error.message, "POS_VALIDATION_ERROR", 422);
    }

    return fail("POS oturumu açılırken hata oluştu.", "POS_SESSION_OPEN_ERROR", 500);
  }
}
