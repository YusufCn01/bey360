import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const moduleName = request.nextUrl.searchParams.get("module") ?? undefined;
    const action = request.nextUrl.searchParams.get("action") ?? undefined;
    const query = request.nextUrl.searchParams.get("q")?.trim() || undefined;
    const dateFromRaw = request.nextUrl.searchParams.get("dateFrom");
    const dateToRaw = request.nextUrl.searchParams.get("dateTo");
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? "100"), 1), 500);
    const dateFrom = dateFromRaw ? new Date(dateFromRaw) : null;
    const dateTo = dateToRaw ? new Date(dateToRaw) : null;

    if (dateFromRaw && Number.isNaN(dateFrom?.getTime())) {
      return fail("Geçersiz başlangıç tarihi.", "VALIDATION_ERROR", 422);
    }
    if (dateToRaw && Number.isNaN(dateTo?.getTime())) {
      return fail("Geçersiz bitiş tarihi.", "VALIDATION_ERROR", 422);
    }

    const createdAtFilter: Prisma.DateTimeFilter | undefined =
      dateFrom || dateTo
        ? {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          }
        : undefined;

    const rows = await prisma.auditLog.findMany({
      where: {
        tenantId: access.tenantId,
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
        ...(moduleName ? { module: moduleName } : {}),
        ...(action ? { action } : {}),
        ...(query
          ? {
              OR: [
                { module: { contains: query, mode: "insensitive" } },
                { entityName: { contains: query, mode: "insensitive" } },
                { entityId: { contains: query, mode: "insensitive" } },
                { action: { contains: query, mode: "insensitive" } },
                { userId: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return ok(rows);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Denetim kayıtları alınırken hata oluştu.", "AUDIT_LOG_LIST_ERROR", 500);
  }
}
