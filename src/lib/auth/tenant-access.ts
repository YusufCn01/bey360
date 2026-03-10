import type { NextRequest } from "next/server";
import { ACCESS_COOKIE } from "@/lib/auth/session";
import { getPlatformMaintenanceState, isWriteMethod } from "@/lib/platform/maintenance";
import { assertAnyPermission, assertPermission, PermissionDeniedError } from "@/lib/rbac/guard";
import { verifyAccessToken } from "@/lib/security/jwt";
import { getTenantContext } from "@/lib/tenant/context";

export class AuthorizationError extends Error {
  constructor(message: string, public statusCode: number, public code: string) {
    super(message);
  }
}

export type AuthorizedTenantRequest = {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  roleCodes: string[];
  email: string;
};

export async function requireTenantAccess(
  request: NextRequest,
  requiredPermission: string | string[],
): Promise<AuthorizedTenantRequest> {
  const maintenance = await getPlatformMaintenanceState();
  if (maintenance.enabled && isWriteMethod(request.method)) {
    throw new AuthorizationError(maintenance.message, 503, "MAINTENANCE_MODE");
  }

  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) {
    throw new AuthorizationError("Yetkisiz erisim", 401, "UNAUTHORIZED");
  }

  const tenant = await getTenantContext();
  const payload = await verifyAccessToken(token);

  if (payload.tenantId !== tenant.tenantId) {
    throw new AuthorizationError("Tenant uyusmazligi", 403, "TENANT_MISMATCH");
  }

  if (requiredPermission) {
    try {
      if (Array.isArray(requiredPermission)) {
        await assertAnyPermission(payload.sub, requiredPermission);
      } else {
        await assertPermission(payload.sub, requiredPermission);
      }
    } catch (error) {
      if (error instanceof PermissionDeniedError) {
        throw new AuthorizationError("Bu islem icin yetkiniz yok", 403, "FORBIDDEN");
      }

      throw error;
    }
  }

  return {
    tenantId: tenant.tenantId,
    tenantSlug: tenant.tenantSlug,
    userId: payload.sub,
    roleCodes: payload.roleCodes,
    email: payload.email,
  };
}
