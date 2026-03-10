import { prisma } from "@/lib/db/prisma";

export async function listTenantRoles(params: { tenantId: string; includePermissions: boolean }) {
  return prisma.role.findMany({
    where: {
      tenantId: params.tenantId,
      deletedAt: null,
    },
    include: params.includePermissions
      ? {
          permissions: {
            include: {
              permission: true,
            },
          },
        }
      : undefined,
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
  });
}

export async function createTenantRole(params: {
  tenantId: string;
  userId: string;
  code: string;
  name: string;
  description?: string;
  permissionKeys: string[];
}) {
  return prisma.$transaction(async (tx) => {
    const uniquePermissionKeys = Array.from(new Set(params.permissionKeys));
    const role = await tx.role.create({
      data: {
        tenantId: params.tenantId,
        code: params.code,
        name: params.name,
        description: params.description ?? "",
        scope: "TENANT",
        isSystem: false,
      },
    });

    if (uniquePermissionKeys.length > 0) {
      const permissions = await tx.permission.findMany({
        where: {
          key: {
            in: uniquePermissionKeys,
          },
        },
      });

      if (permissions.length !== uniquePermissionKeys.length) {
        const existing = new Set(permissions.map((permission) => permission.key));
        const invalidKeys = uniquePermissionKeys.filter((key) => !existing.has(key));
        throw new Error(`Gecersiz izin anahtari: ${invalidKeys.join(", ")}`);
      }

      for (const permission of permissions) {
        await tx.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
            contextKey: "global",
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        module: "rbac",
        entityName: "roles",
        entityId: role.id,
        action: "role.created",
        payload: {
          code: params.code,
          name: params.name,
          permissions: uniquePermissionKeys,
        },
      },
    });

    return role;
  });
}

export async function assignRolesToUser(params: {
  tenantId: string;
  userId: string;
  targetUserId: string;
  roleIds: string[];
}) {
  return prisma.$transaction(async (tx) => {
    const targetUser = await tx.user.findFirst({
      where: {
        id: params.targetUserId,
        tenantId: params.tenantId,
        deletedAt: null,
      },
    });

    if (!targetUser) {
      throw new Error("Kullanıcı bulunamadı.");
    }

    const roles = await tx.role.findMany({
      where: {
        id: {
          in: params.roleIds,
        },
        tenantId: params.tenantId,
        deletedAt: null,
      },
    });

    if (roles.length !== params.roleIds.length) {
      throw new Error("Geçersiz rol seçimi.");
    }

    await tx.userRole.deleteMany({
      where: {
        userId: targetUser.id,
      },
    });

    for (const roleId of params.roleIds) {
      await tx.userRole.create({
        data: {
          userId: targetUser.id,
          roleId,
          assignedBy: params.userId,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        module: "rbac",
        entityName: "user_roles",
        entityId: targetUser.id,
        action: "user.roles.updated",
        payload: {
          targetUserId: targetUser.id,
          roleIds: params.roleIds,
        },
      },
    });

    return {
      targetUserId: targetUser.id,
      roleIds: params.roleIds,
    };
  });
}

export async function updateRolePermissions(params: {
  tenantId: string;
  userId: string;
  roleId: string;
  permissionKeys: string[];
}) {
  return prisma.$transaction(async (tx) => {
    const role = await tx.role.findFirst({
      where: {
        id: params.roleId,
        tenantId: params.tenantId,
        deletedAt: null,
      },
    });

    if (!role) {
      throw new Error("Rol bulunamadı.");
    }

    const uniquePermissionKeys = Array.from(new Set(params.permissionKeys));
    let permissions: Array<{ id: string; key: string }> = [];

    if (uniquePermissionKeys.length > 0) {
      permissions = await tx.permission.findMany({
        where: {
          key: {
            in: uniquePermissionKeys,
          },
        },
        select: {
          id: true,
          key: true,
        },
      });

      if (permissions.length !== uniquePermissionKeys.length) {
        const existing = new Set(permissions.map((permission) => permission.key));
        const invalidKeys = uniquePermissionKeys.filter((key) => !existing.has(key));
        throw new Error(`Gecersiz izin anahtari: ${invalidKeys.join(", ")}`);
      }
    }

    await tx.rolePermission.deleteMany({
      where: {
        roleId: role.id,
      },
    });

    for (const permission of permissions) {
      await tx.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
          contextKey: "global",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        module: "rbac",
        entityName: "roles",
        entityId: role.id,
        action: "role.permissions.updated",
        payload: {
          roleId: role.id,
          permissionKeys: uniquePermissionKeys,
        },
      },
    });

    return {
      roleId: role.id,
      permissionKeys: uniquePermissionKeys,
      permissionCount: uniquePermissionKeys.length,
    };
  });
}
