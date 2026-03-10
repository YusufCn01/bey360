import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { hashPassword } from "@/lib/security/password";
import { assignRolesToUser } from "@/modules/identity/application/rbac-service";

const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(2).max(80),
  lastName: z.string().min(2).max(80),
  password: z.string().min(8).max(128),
  roleIds: z.array(z.string().min(1)).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "tenant:user.manage");
    const users = await prisma.user.findMany({
      where: {
        tenantId: access.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(users);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Kullanıcı listesi alınırken hata oluştu.", "USER_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "tenant:user.manage");
    const parsed = createUserSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Kullanıcı formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const data = parsed.data;
    const created = await prisma.user.create({
      data: {
        tenantId: access.tenantId,
        email: data.email.toLowerCase(),
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.email.split("@")[0],
        passwordHash: await hashPassword(data.password),
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
      },
    });

    if (data.roleIds && data.roleIds.length > 0) {
      await assignRolesToUser({
        tenantId: access.tenantId,
        userId: access.userId,
        targetUserId: created.id,
        roleIds: data.roleIds,
      });
    }

    return ok(created, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Kullanıcı oluşturulurken hata oluştu.", "USER_CREATE_ERROR", 500);
  }
}
