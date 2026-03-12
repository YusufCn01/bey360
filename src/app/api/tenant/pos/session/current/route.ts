import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "sale:pos");
    const registerId = request.nextUrl.searchParams.get("registerId")?.trim() ?? "";
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const openSession = await prisma.saleRegisterSessions.findFirst({
      where: {
        tenantId: access.tenantId,
        deletedAt: null,
        status: "open",
        ...(registerId
          ? {
              code: registerId,
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    const targetRegisterId = registerId || openSession?.code || "";
    const saleRows = await prisma.sales.findMany({
      where: {
        tenantId: access.tenantId,
        deletedAt: null,
        status: "completed",
        occurredAt: {
          gte: dayStart,
        },
      },
      select: {
        payload: true,
      },
      orderBy: {
        occurredAt: "desc",
      },
      take: 3000,
    });

    let todaysSalesCount = 0;
    let todaysSalesTotal = 0;
    for (const row of saleRows) {
      const payload = asRecord(row.payload);
      const saleRegisterId = asText(payload.registerId);
      if (targetRegisterId && saleRegisterId !== targetRegisterId) {
        continue;
      }
      todaysSalesCount += 1;
      todaysSalesTotal += asNumber(payload.netTotal, 0);
    }

    const openPayload = asRecord(openSession?.payload);
    const openingCash = asNumber(openPayload.openingCash, 0);
    const closingCash = asNumber(openPayload.closingCash, 0);

    return ok({
      registerId: targetRegisterId || null,
      openSession: openSession
        ? {
            id: openSession.id,
            code: openSession.code,
            name: openSession.name,
            status: openSession.status,
            createdAt: openSession.createdAt,
            occurredAt: openSession.occurredAt,
            payload: openSession.payload ?? {},
          }
        : null,
      openingCash: roundCurrency(openingCash),
      closingCash: roundCurrency(closingCash),
      todaysSalesCount,
      todaysSalesTotal: roundCurrency(todaysSalesTotal),
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("POS oturum özeti alınırken hata oluştu.", "POS_SESSION_CURRENT_ERROR", 500);
  }
}
