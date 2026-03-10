import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { assignRolesToUser } from "@/modules/identity/application/rbac-service";

const assignRoleSchema = z.object({
  targetUserId: z.string().min(1),
  roleIds: z.array(z.string().min(1)).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "tenant:user.manage");
    const parsed = assignRoleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Rol atama formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const result = await assignRolesToUser({
      tenantId: access.tenantId,
      userId: access.userId,
      targetUserId: parsed.data.targetUserId,
      roleIds: parsed.data.roleIds,
    });

    return ok(result);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Rol ataması yapılırken hata oluştu.", "ROLE_ASSIGN_ERROR", 500);
  }
}
