import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import { ensureSerialCountUnlocked, SerialCountLockedError } from "@/modules/inventory/application/serial-count-lock";
import { createPurchaseInvoice } from "@/modules/purchasing/application/purchase-service";

const purchaseLineSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1).max(255),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  taxRate: z.number().nonnegative().max(100).optional(),
  warehouseId: z.string().max(100).optional(),
});

const createPurchaseInvoiceSchema = z.object({
  supplierCode: z.string().min(1).max(100),
  supplierName: z.string().min(1).max(255),
  documentNo: z.string().max(100).optional(),
  warehouseId: z.string().max(100).optional(),
  currency: z.string().length(3).optional(),
  paidAmount: z.number().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
  lines: z.array(purchaseLineSchema).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? "200"), 1), 500);

    const rows = await prisma.purchaseInvoices.findMany({
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

    return fail("Alış faturası listesi alınırken hata oluştu.", "PURCHASE_INVOICE_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    await ensureSerialCountUnlocked({
      tenantId: access.tenantId,
      operationLabel: "Ürün girişi",
    });

    const parsed = createPurchaseInvoiceSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Alış faturası formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const result = await createPurchaseInvoice({
      tenantId: access.tenantId,
      userId: access.userId,
      ...parsed.data,
    });

    return ok(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    if (error instanceof SerialCountLockedError) {
      return fail(error.message, "SERIAL_COUNT_LOCKED", 409);
    }

    return fail("Alış faturası oluşturulurken hata oluştu.", "PURCHASE_INVOICE_ERROR", 500);
  }
}
