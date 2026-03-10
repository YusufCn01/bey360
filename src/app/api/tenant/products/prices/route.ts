import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { asRecord, numberOrZero } from "@/lib/json";
import { fail, ok } from "@/lib/http/response";

const updateProductPricesSchema = z.object({
  productIds: z.array(z.string().min(1)).max(500).optional(),
  operation: z.enum(["increase_percent", "decrease_percent", "set_price"]),
  value: z.number().nonnegative(),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "product:create");
    const parsed = updateProductPricesSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Toplu fiyat güncelleme formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const products = await prisma.products.findMany({
      where: {
        tenantId: access.tenantId,
        deletedAt: null,
        status: "active",
        ...(parsed.data.productIds && parsed.data.productIds.length > 0 ?
           { id: { in: parsed.data.productIds } }
          : {}),
      },
      take: 500,
    });

    if (products.length === 0) {
      return fail("Güncellenecek ürün bulunamadı.", "PRODUCT_NOT_FOUND", 404);
    }

    let updatedCount = 0;
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      for (const product of products) {
        const payload = asRecord(product.payload);
        const currentSalePrice = numberOrZero(payload.salePrice);
        let nextSalePrice = currentSalePrice;

        if (parsed.data.operation === "set_price") {
          nextSalePrice = parsed.data.value;
        } else if (parsed.data.operation === "increase_percent") {
          nextSalePrice = currentSalePrice * (1 + parsed.data.value / 100);
        } else if (parsed.data.operation === "decrease_percent") {
          nextSalePrice = currentSalePrice * (1 - parsed.data.value / 100);
        }

        // Fiyat asla negatif olamaz.
        nextSalePrice = Math.max(0, Math.round(nextSalePrice * 100) / 100);

        const nextPayload: Prisma.InputJsonValue = {
          ...payload,
          salePrice: nextSalePrice,
          lastPriceUpdateAt: now.toISOString(),
          lastPriceUpdateBy: access.userId,
        };

        await tx.products.update({
          where: { id: product.id },
          data: {
            payload: nextPayload,
            occurredAt: now,
          },
        });

        updatedCount += 1;
      }

      await tx.auditLog.create({
        data: {
          tenantId: access.tenantId,
          userId: access.userId,
          module: "product",
          entityName: "products",
          entityId: "bulk-price-update",
          action: "product.price.bulk_updated",
          payload: {
            operation: parsed.data.operation,
            value: parsed.data.value,
            updatedCount,
          },
        },
      });
    });

    return ok({
      updatedCount,
      operation: parsed.data.operation,
      value: parsed.data.value,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Toplu fiyat güncelleme sırasında hata oluştu.", "BULK_PRICE_UPDATE_ERROR", 500);
  }
}
