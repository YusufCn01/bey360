import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "sale:pos");
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const [suspendedItems, suspendedCarts, cartEvents, priceChecks, openSessions] = await Promise.all([
        tx.suspendedSaleItems.updateMany({
          where: {
            tenantId: access.tenantId,
            deletedAt: null,
          },
          data: {
            status: "cancelled",
            deletedAt: now,
            occurredAt: now,
          },
        }),
        tx.suspendedSales.updateMany({
          where: {
            tenantId: access.tenantId,
            deletedAt: null,
          },
          data: {
            status: "cancelled",
            deletedAt: now,
            occurredAt: now,
          },
        }),
        tx.cartEvents.updateMany({
          where: {
            tenantId: access.tenantId,
            deletedAt: null,
          },
          data: {
            status: "reset",
            deletedAt: now,
            occurredAt: now,
          },
        }),
        tx.priceCheckLogs.updateMany({
          where: {
            tenantId: access.tenantId,
            deletedAt: null,
          },
          data: {
            status: "reset",
            deletedAt: now,
            occurredAt: now,
          },
        }),
        tx.saleRegisterSessions.updateMany({
          where: {
            tenantId: access.tenantId,
            deletedAt: null,
            status: "open",
          },
          data: {
            status: "closed",
            occurredAt: now,
          },
        }),
      ]);

      const payload = {
        suspendedItems: suspendedItems.count,
        suspendedCarts: suspendedCarts.count,
        cartEvents: cartEvents.count,
        priceChecks: priceChecks.count,
        openSessions: openSessions.count,
      };

      await tx.auditLog.create({
        data: {
          tenantId: access.tenantId,
          userId: access.userId,
          module: "pos",
          entityName: "pos_maintenance",
          entityId: "reset-movements",
          action: "pos.maintenance.movements_reset",
          payload,
        },
      });

      return payload;
    });

    return ok(result);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("POS hareketleri sıfırlanırken hata oluştu.", "POS_MOVEMENTS_RESET_ERROR", 500);
  }
}
