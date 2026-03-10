import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import { ensureSerialCountUnlocked, SerialCountLockedError } from "@/modules/inventory/application/serial-count-lock";
import { createProduct } from "@/modules/catalog/application/product-service";

const importRowSchema = z.object({
  code: z.string().min(1).max(100).optional(),
  name: z.string().min(2).max(255),
  barcode: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  salePrice: z.number().nonnegative().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  vatRate: z.number().nonnegative().max(100).optional(),
  defaultUnit: z.string().max(40).optional(),
  productGroup: z.string().max(120).optional(),
  productSubGroup: z.string().max(120).optional(),
  imageUrl: z.string().max(5_000_000).optional(),
  openingStock: z.number().optional(),
  minStockLevel: z.number().nonnegative().optional(),
  maxStockLevel: z.number().nonnegative().optional(),
});

const importSchema = z.object({
  rows: z.array(importRowSchema).min(1).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "product:create");
    await ensureSerialCountUnlocked({
      tenantId: access.tenantId,
      operationLabel: "Ürün içeri aktarma",
    });

    const parsed = importSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Excel içeri aktarım verisi geçersiz.", "VALIDATION_ERROR", 422);
    }

    let createdCount = 0;
    const errors: Array<{ rowIndex: number; message: string }> = [];

    for (let i = 0; i < parsed.data.rows.length; i += 1) {
      const row = parsed.data.rows[i];
      try {
        await createProduct({
          tenantId: access.tenantId,
          userId: access.userId,
          ...row,
        });
        createdCount += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Kayıt oluşturulamadı.";
        errors.push({ rowIndex: i + 1, message });
      }
    }

    await prisma.auditLog.create({
      data: {
        tenantId: access.tenantId,
        userId: access.userId,
        module: "product",
        entityName: "products",
        entityId: "excel-import",
        action: "product.excel.imported",
        payload: {
          totalRows: parsed.data.rows.length,
          createdCount,
          failedCount: errors.length,
          errors,
        },
      },
    });

    return ok({
      totalRows: parsed.data.rows.length,
      createdCount,
      failedCount: errors.length,
      errors,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    if (error instanceof SerialCountLockedError) {
      return fail(error.message, "SERIAL_COUNT_LOCKED", 409);
    }

    return fail("Excel içeri aktarım sırasında hata oluştu.", "PRODUCT_IMPORT_ERROR", 500);
  }
}
