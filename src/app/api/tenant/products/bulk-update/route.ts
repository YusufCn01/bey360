import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { asRecord } from "@/lib/json";
import { fail, ok } from "@/lib/http/response";

const bulkUpdateSchema = z
  .object({
    productIds: z.array(z.string().min(1)).max(500).optional(),
    defaultUnit: z.string().max(40).optional(),
    vatRate: z.number().nonnegative().max(100).optional(),
    minStockLevel: z.number().nonnegative().optional(),
    maxStockLevel: z.number().nonnegative().optional(),
    productGroup: z.string().max(120).optional(),
    productSubGroup: z.string().max(120).optional(),
    discountRate: z.number().nonnegative().max(100).optional(),
    lockedForSale: z.boolean().optional(),
    expiryDate: z.string().max(60).optional(),
  })
  .refine(
    (value) =>
      value.defaultUnit !== undefined ||
      value.vatRate !== undefined ||
      value.minStockLevel !== undefined ||
      value.maxStockLevel !== undefined ||
      value.productGroup !== undefined ||
      value.productSubGroup !== undefined ||
      value.discountRate !== undefined ||
      value.lockedForSale !== undefined ||
      value.expiryDate !== undefined,
    "En az bir alan seçmelisiniz.",
  );

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "product:create");
    const parsed = bulkUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Toplu ürün düzenleme formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const products = await prisma.products.findMany({
      where: {
        tenantId: access.tenantId,
        deletedAt: null,
        status: "active",
        ...(parsed.data.productIds && parsed.data.productIds.length > 0
          ? { id: { in: parsed.data.productIds } }
          : {}),
      },
      take: 500,
    });

    if (products.length === 0) {
      return fail("Güncellenecek ürün bulunamadı.", "PRODUCT_NOT_FOUND", 404);
    }

    const now = new Date();
    let updatedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const product of products) {
        const payload = asRecord(product.payload);
        const patchPayload = {
          ...(parsed.data.defaultUnit !== undefined ? { defaultUnit: parsed.data.defaultUnit } : {}),
          ...(parsed.data.vatRate !== undefined ? { vatRate: parsed.data.vatRate } : {}),
          ...(parsed.data.minStockLevel !== undefined ? { minStockLevel: parsed.data.minStockLevel } : {}),
          ...(parsed.data.maxStockLevel !== undefined ? { maxStockLevel: parsed.data.maxStockLevel } : {}),
          ...(parsed.data.productGroup !== undefined ? { productGroup: parsed.data.productGroup } : {}),
          ...(parsed.data.productSubGroup !== undefined ? { productSubGroup: parsed.data.productSubGroup } : {}),
          ...(parsed.data.discountRate !== undefined ? { discountRate: parsed.data.discountRate } : {}),
          ...(parsed.data.lockedForSale !== undefined ? { lockedForSale: parsed.data.lockedForSale } : {}),
          ...(parsed.data.expiryDate !== undefined ? { expiryDate: parsed.data.expiryDate } : {}),
          lastBulkUpdateAt: now.toISOString(),
          lastBulkUpdateBy: access.userId,
        } satisfies Record<string, unknown>;

        const nextPayload: Prisma.InputJsonValue = {
          ...payload,
          ...patchPayload,
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
          entityId: "bulk-update",
          action: "product.bulk_updated",
          payload: {
            updatedCount,
            fields: {
              defaultUnit: parsed.data.defaultUnit,
              vatRate: parsed.data.vatRate,
              minStockLevel: parsed.data.minStockLevel,
              maxStockLevel: parsed.data.maxStockLevel,
              productGroup: parsed.data.productGroup,
              productSubGroup: parsed.data.productSubGroup,
              discountRate: parsed.data.discountRate,
              lockedForSale: parsed.data.lockedForSale,
              expiryDate: parsed.data.expiryDate,
            },
          },
        },
      });
    });

    return ok({ updatedCount });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Toplu ürün düzenleme sırasında hata oluştu.", "PRODUCT_BULK_UPDATE_ERROR", 500);
  }
}
