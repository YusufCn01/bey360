import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { asRecord } from "@/lib/json";
import { fail, ok } from "@/lib/http/response";

const updateProductSchema = z.object({
  code: z.string().min(1).max(100).optional(),
  name: z.string().min(2).max(255).optional(),
  description: z.string().max(1000).optional(),
  barcode: z.string().max(100).optional(),
  parallelBarcodes: z.array(z.string().max(100)).max(50).optional(),
  defaultUnit: z.string().max(40).optional(),
  salePrice: z.number().nonnegative().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  vatRate: z.number().nonnegative().max(100).optional(),
  minStockLevel: z.number().nonnegative().optional(),
  maxStockLevel: z.number().nonnegative().optional(),
  imageUrl: z.string().max(5_000_000).optional(),
  purchaseCurrency: z.string().max(10).optional(),
  saleCurrency1: z.string().max(10).optional(),
  salePrice2: z.number().nonnegative().optional(),
  saleCurrency2: z.string().max(10).optional(),
  salePrice3: z.number().nonnegative().optional(),
  saleCurrency3: z.string().max(10).optional(),
  salePrice4: z.number().nonnegative().optional(),
  saleCurrency4: z.string().max(10).optional(),
  specialCode1: z.string().max(120).optional(),
  specialCode2: z.string().max(120).optional(),
  specialCode3: z.string().max(120).optional(),
  specialCode4: z.string().max(120).optional(),
  productGroup: z.string().max(120).optional(),
  productSubGroup: z.string().max(120).optional(),
  expiryDate: z.string().max(60).optional(),
  discountRate: z.number().nonnegative().max(100).optional(),
  lockedForSale: z.boolean().optional(),
  expiryTracking: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> },
) {
  try {
    const access = await requireTenantAccess(request, "product:view");
    const { productId } = await context.params;

    const row = await prisma.products.findFirst({
      where: {
        id: productId,
        tenantId: access.tenantId,
        deletedAt: null,
      },
    });

    if (!row) {
      return fail("Ürün bulunamadı.", "PRODUCT_NOT_FOUND", 404);
    }

    return ok(row);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail("Ürün detayı alınırken hata oluştu.", "PRODUCT_READ_ERROR", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> },
) {
  try {
    const access = await requireTenantAccess(request, "product:create");
    const { productId } = await context.params;
    const parsed = updateProductSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Ürün güncelleme formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const existing = await prisma.products.findFirst({
      where: {
        id: productId,
        tenantId: access.tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return fail("Ürün bulunamadı.", "PRODUCT_NOT_FOUND", 404);
    }

    const now = new Date();
    const payload = asRecord(existing.payload);
    const nextPayload: Prisma.InputJsonValue = {
      ...payload,
      ...parsed.data,
      lastUpdateAt: now.toISOString(),
      lastUpdateBy: access.userId,
    };

    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.products.update({
        where: { id: existing.id },
        data: {
          code: parsed.data.code ?? existing.code,
          name: parsed.data.name ?? existing.name,
          payload: nextPayload,
          occurredAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: access.tenantId,
          userId: access.userId,
          module: "product",
          entityName: "products",
          entityId: existing.id,
          action: "product.updated",
          payload: {
            productId: existing.id,
            changedFields: Object.keys(parsed.data),
          },
        },
      });

      return updated;
    });

    return ok(row);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail("Ürün güncellenirken hata oluştu.", "PRODUCT_UPDATE_ERROR", 500);
  }
}
