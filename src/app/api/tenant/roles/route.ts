import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { createTenantRole, listTenantRoles } from "@/modules/identity/application/rbac-service";

const createRoleSchema = z.object({
  code: z.string().min(2).max(80),
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional(),
  permissionKeys: z.array(z.string().min(1)).default([]),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "tenant:user.manage");
    const includePermissions = request.nextUrl.searchParams.get("includePermissions") === "true";
    const roles = await listTenantRoles({
      tenantId: access.tenantId,
      includePermissions,
    });

    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { key: "asc" }],
    });

    return ok({
      roles,
      permissions,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Roller listelenirken hata oluştu.", "ROLE_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "tenant:user.manage");
    const parsed = createRoleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Rol formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const role = await createTenantRole({
      tenantId: access.tenantId,
      userId: access.userId,
      ...parsed.data,
    });

    return ok(role, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    if (error instanceof Error && error.message.toLowerCase().includes("geçersiz izin")) {
      return fail(error.message, "VALIDATION_ERROR", 422);
    }

    return fail("Rol oluşturulurken hata oluştu.", "ROLE_CREATE_ERROR", 500);
  }
}
