import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import { userHasPermission } from "@/lib/rbac/guard";
import { ensureSerialCountUnlocked, SerialCountLockedError } from "@/modules/inventory/application/serial-count-lock";
import { createPosReturn, PosValidationError } from "@/modules/pos/application/pos-service";

const returnItemSchema = z.object({
  productId: z.string().min(1),
  productCode: z.string().max(100).optional(),
  productName: z.string().min(1).max(255),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  discountAmount: z.number().nonnegative().optional(),
  taxRate: z.number().nonnegative().max(100).optional(),
  warehouseId: z.string().max(100).optional(),
});

const refundSchema = z.object({
  method: z.enum(["nakit", "kart", "havale_eft", "cari", "cek", "dekont"]),
  amount: z.number().positive(),
  reference: z.string().max(200).optional(),
});

const returnSaleSchema = z.object({
  registerId: z.string().min(1).max(100),
  registerName: z.string().min(2).max(255),
  originalSaleId: z.string().min(1),
  customerCode: z.string().max(100).optional(),
  customerName: z.string().max(255).optional(),
  reason: z.string().max(1000).optional(),
  currency: z.string().length(3).optional(),
  items: z.array(returnItemSchema).min(1),
  refundPayments: z.array(refundSchema).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "sale:pos");
    const returnPermissionDefined = await prisma.permission.findUnique({
      where: { key: "sale:return" },
      select: { id: true },
    });
    if (returnPermissionDefined) {
      const allowed = await userHasPermission(access.userId, "sale:return");
      if (!allowed) {
        return fail("POS iade islemi icin yetkiniz yok.", "FORBIDDEN", 403);
      }
    }

    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? "200"), 1), 500);

    const rows = await prisma.salesReturns.findMany({
      where: {
        tenantId: access.tenantId,
        deletedAt: null,
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return ok(rows);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("POS iade listesi alınırken hata oluştu.", "POS_RETURN_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "sale:pos");
    const returnPermissionDefined = await prisma.permission.findUnique({
      where: { key: "sale:return" },
      select: { id: true },
    });
    if (returnPermissionDefined) {
      const allowed = await userHasPermission(access.userId, "sale:return");
      if (!allowed) {
        return fail("POS iade islemi icin yetkiniz yok.", "FORBIDDEN", 403);
      }
    }

    await ensureSerialCountUnlocked({
      tenantId: access.tenantId,
      operationLabel: "POS satış iade",
    });

    const parsed = returnSaleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("POS iade formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const result = await createPosReturn({
      tenantId: access.tenantId,
      userId: access.userId,
      ...parsed.data,
    });

    return ok(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    if (error instanceof PosValidationError) {
      return fail(error.message, "POS_VALIDATION_ERROR", 422);
    }
    if (error instanceof SerialCountLockedError) {
      return fail(error.message, "SERIAL_COUNT_LOCKED", 409);
    }

    return fail("POS iade işlemi tamamlanırken hata oluştu.", "POS_RETURN_ERROR", 500);
  }
}
