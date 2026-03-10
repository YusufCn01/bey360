import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";

const restoreSchema = z.object({
  suspendedSaleId: z.string().min(1),
});

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
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

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "sale:pos");
    const parsed = restoreSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Askı geri çağırma formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.suspendedSales.findFirst({
        where: {
          id: parsed.data.suspendedSaleId,
          tenantId: access.tenantId,
          deletedAt: null,
          status: "suspended",
        },
      });

      if (!sale) {
        throw new Error("Geri çağrılacak askı sepet bulunamadı.");
      }

      const items = await tx.suspendedSaleItems.findMany({
        where: {
          tenantId: access.tenantId,
          code: sale.id,
          deletedAt: null,
          status: "suspended",
        },
      });

      if (items.length === 0) {
        throw new Error("Askı sepet satırı bulunamadı.");
      }

      const now = new Date();
      await tx.suspendedSaleItems.updateMany({
        where: {
          tenantId: access.tenantId,
          code: sale.id,
          deletedAt: null,
          status: "suspended",
        },
        data: {
          status: "restored",
          deletedAt: now,
          occurredAt: now,
        },
      });

      await tx.suspendedSales.update({
        where: { id: sale.id },
        data: {
          status: "restored",
          deletedAt: now,
          occurredAt: now,
        },
      });

      const salePayload = asRecord(sale.payload);
      const registerId = asText(salePayload.registerId);
      const customerCode = asText(salePayload.customerCode);
      const customerName = asText(salePayload.customerName);
      const restoredItems = items.map((row) => {
        const itemPayload = asRecord(row.payload);
        return {
          productId: asText(itemPayload.productId),
          productCode: asText(itemPayload.productCode),
          productName: row.name ?? asText(itemPayload.productName),
          quantity: asNumber(itemPayload.quantity, 1),
          unitPrice: asNumber(itemPayload.unitPrice, 0),
          taxRate: asNumber(itemPayload.taxRate, 0),
          warehouseId: asText(itemPayload.warehouseId),
        };
      });

      await tx.auditLog.create({
        data: {
          tenantId: access.tenantId,
          userId: access.userId,
          module: "pos",
          entityName: "suspended_sales",
          entityId: sale.id,
          action: "pos.suspended.restored",
          payload: {
            registerId,
            customerCode,
            customerName,
            itemCount: restoredItems.length,
          },
        },
      });

      return {
        suspendedSaleId: sale.id,
        registerId,
        customerCode,
        customerName,
        items: restoredItems,
      };
    });

    return ok(result);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    if (error instanceof Error) {
      return fail(error.message, "SUSPENDED_RESTORE_ERROR", 422);
    }

    return fail("Askı sepet geri çağrılırken hata oluştu.", "SUSPENDED_RESTORE_ERROR", 500);
  }
}
