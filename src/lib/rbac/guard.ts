import { prisma } from "@/lib/db/prisma";

export class PermissionDeniedError extends Error {
  constructor(permissionKey: string) {
    super(`Yetki hatasi: ${permissionKey}`);
    this.name = "PermissionDeniedError";
  }
}

export async function listUserPermissionKeys(userId: string): Promise<Set<string>> {
  const rolePermissions = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  const permissionKeys = new Set<string>();
  for (const row of rolePermissions) {
    for (const permissionRow of row.role.permissions) {
      permissionKeys.add(permissionRow.permission.key);
    }
  }

  return permissionKeys;
}

export async function userHasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const permissionKeys = await listUserPermissionKeys(userId);
  return permissionKeys.has(permissionKey);
}

export async function userHasAnyPermission(userId: string, permissionKeys: string[]): Promise<boolean> {
  if (permissionKeys.length === 0) {
    return true;
  }

  const existingPermissionKeys = await listUserPermissionKeys(userId);
  return permissionKeys.some((key) => existingPermissionKeys.has(key));
}

export async function assertPermission(userId: string, permissionKey: string): Promise<void> {
  const allowed = await userHasPermission(userId, permissionKey);
  if (!allowed) {
    throw new PermissionDeniedError(permissionKey);
  }
}

export async function assertAnyPermission(userId: string, permissionKeys: string[]): Promise<void> {
  const allowed = await userHasAnyPermission(userId, permissionKeys);
  if (!allowed) {
    throw new PermissionDeniedError(permissionKeys.join(" | "));
  }
}
