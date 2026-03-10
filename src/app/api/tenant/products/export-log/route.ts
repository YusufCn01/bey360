import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";

const exportLogSchema = z.object({
  format: z.string().min(2).max(20),
  rowCount: z.number().nonnegative(),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "product:view");
    const parsed = exportLogSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Dışa aktarma log verisi geçersiz.", "VALIDATION_ERROR", 422);
    }

    const row = await prisma.auditLog.create({
      data: {
        tenantId: access.tenantId,
        userId: access.userId,
        module: "product",
        entityName: "products",
        entityId: "excel-export",
        action: "product.excel.exported",
        payload: {
          format: parsed.data.format,
          rowCount: parsed.data.rowCount,
        },
      },
    });

    return ok({
      id: row.id,
      format: parsed.data.format,
      rowCount: parsed.data.rowCount,
      createdAt: row.createdAt,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail("Dışa aktarma logu yazılırken hata oluştu.", "PRODUCT_EXPORT_LOG_ERROR", 500);
  }
}
