import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import { getPlatformMaintenanceState } from "@/lib/platform/maintenance";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const [maintenance, row] = await Promise.all([
      getPlatformMaintenanceState(),
      prisma.tenantSettings.findFirst({
        where: {
          tenantId: access.tenantId,
          deletedAt: null,
          code: "sistem_guncelleme",
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const payload = asRecord(row?.payload);
    const items = Array.isArray(payload.items) ? payload.items : [];
    const activeUpdate = items
      .map((item) =>
        typeof item === "object" && item !== null && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : null,
      )
      .filter((item): item is Record<string, unknown> => item !== null)
      .find((item) => asBoolean(item.isActive, true));

    return ok({
      maintenance,
      update: activeUpdate
        ? {
            version: asText(activeUpdate.version),
            title: asText(activeUpdate.title),
            summary: asText(activeUpdate.summary),
            isForce: asBoolean(activeUpdate.isForce, false),
            publishAt: asText(activeUpdate.publishAt) || null,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Platform durumu alinamadi.", "PLATFORM_STATUS_ERROR", 500);
  }
}
