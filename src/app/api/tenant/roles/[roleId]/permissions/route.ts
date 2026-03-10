import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { updateRolePermissions } from "@/modules/identity/application/rbac-service";

const updateRolePermissionsSchema = z.object({
  permissionKeys: z.array(z.string().min(1)).default([]),
});

type RouteContext = {
  params: Promise<{
    roleId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const access = await requireTenantAccess(request, "tenant:user.manage");
    const { roleId } = await context.params;
    const parsed = updateRolePermissionsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Rol izin güncelleme formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const result = await updateRolePermissions({
      tenantId: access.tenantId,
      userId: access.userId,
      roleId,
      permissionKeys: parsed.data.permissionKeys,
    });

    return ok(result);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    if (error instanceof Error && error.message.toLowerCase().includes("geçersiz izin")) {
      return fail(error.message, "VALIDATION_ERROR", 422);
    }

    if (error instanceof Error && error.message.toLowerCase().includes("rol bulunamad")) {
      return fail(error.message, "ROLE_NOT_FOUND", 404);
    }

    return fail("Rol izinleri güncellenirken hata oluştu.", "ROLE_PERMISSION_UPDATE_ERROR", 500);
  }
}
