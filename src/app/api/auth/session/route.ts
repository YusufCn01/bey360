import { NextRequest } from "next/server";
import { ACCESS_COOKIE } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import { listUserPermissionKeys } from "@/lib/rbac/guard";
import { verifyAccessToken } from "@/lib/security/jwt";

const enforcedPermissionDefinitions = [
  {
    key: "sale:return",
    module: "sale",
    action: "return",
    description: "POS iade işlemi yapabilme",
  },
  {
    key: "sale:discount",
    module: "sale",
    action: "discount",
    description: "POS indirimli fiyat uygulayabilme",
  },
] as const;

async function ensurePosPermissionCatalogForTenant(tenantId: string): Promise<void> {
  const permissionKeys = enforcedPermissionDefinitions.map((item) => item.key);
  const existingPermissions = await prisma.permission.findMany({
    where: {
      key: {
        in: permissionKeys,
      },
    },
    select: {
      id: true,
      key: true,
    },
  });

  const existingKeySet = new Set(existingPermissions.map((item) => item.key));
  const missingDefinitions = enforcedPermissionDefinitions.filter((item) => !existingKeySet.has(item.key));

  if (missingDefinitions.length > 0) {
    await prisma.permission.createMany({
      data: missingDefinitions.map((item) => ({
        key: item.key,
        module: item.module,
        action: item.action,
        description: item.description,
      })),
      skipDuplicates: true,
    });
  }

  const resolvedPermissions =
    missingDefinitions.length > 0
      ? await prisma.permission.findMany({
          where: {
            key: {
              in: permissionKeys,
            },
          },
          select: {
            id: true,
          },
        })
      : existingPermissions.map((item) => ({ id: item.id }));

  if (resolvedPermissions.length === 0) {
    return;
  }

  const ownerRole = await prisma.role.findUnique({
    where: {
      tenantId_code: {
        tenantId,
        code: "tenant-owner",
      },
    },
    select: {
      id: true,
    },
  });

  if (!ownerRole) {
    return;
  }

  await prisma.rolePermission.createMany({
    data: resolvedPermissions.map((permission) => ({
      roleId: ownerRole.id,
      permissionId: permission.id,
      contextKey: "global",
    })),
    skipDuplicates: true,
  });
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) {
    return fail("Oturum bulunamadı", "NO_SESSION", 401);
  }

  try {
    const payload = await verifyAccessToken(token);
    await ensurePosPermissionCatalogForTenant(payload.tenantId);

    const [permissionKeysSet, permissionCatalogRows] = await Promise.all([
      listUserPermissionKeys(payload.sub),
      prisma.permission.findMany({
        select: {
          key: true,
        },
        orderBy: {
          key: "asc",
        },
      }),
    ]);

    return ok({
      userId: payload.sub,
      tenantId: payload.tenantId,
      sessionId: payload.sessionId,
      roleCodes: payload.roleCodes,
      email: payload.email,
      permissionKeys: Array.from(permissionKeysSet.values()).sort((a, b) => a.localeCompare(b)),
      permissionCatalog: permissionCatalogRows.map((row) => row.key),
    });
  } catch {
    return fail("Oturum geçersiz", "INVALID_SESSION", 401);
  }
}
