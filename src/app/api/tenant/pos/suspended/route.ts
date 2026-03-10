import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { listSuspendedCarts, PosValidationError, suspendCart } from "@/modules/pos/application/pos-service";

const suspendedItemSchema = z.object({
  productId: z.string().min(1),
  productCode: z.string().max(100).optional(),
  productName: z.string().min(1).max(255),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  discountAmount: z.number().nonnegative().optional(),
  taxRate: z.number().nonnegative().max(100).optional(),
  warehouseId: z.string().max(100).optional(),
});

const suspendCartSchema = z.object({
  registerId: z.string().min(1).max(100),
  registerName: z.string().min(2).max(255),
  customerCode: z.string().max(100).optional(),
  customerName: z.string().max(255).optional(),
  note: z.string().max(1000).optional(),
  items: z.array(suspendedItemSchema).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "sale:pos");
    const registerId = request.nextUrl.searchParams.get("registerId") ?? undefined;
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50");
    const rows = await listSuspendedCarts({
      tenantId: access.tenantId,
      registerId,
      limit,
    });

    return ok(rows);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Askı satışlar alınırken hata oluştu.", "SUSPENDED_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "sale:pos");
    const parsed = suspendCartSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Askı satış formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const suspended = await suspendCart({
      tenantId: access.tenantId,
      userId: access.userId,
      ...parsed.data,
    });

    return ok(suspended, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    if (error instanceof PosValidationError) {
      return fail(error.message, "POS_VALIDATION_ERROR", 422);
    }

    return fail("Askı satış oluşturulurken hata oluştu.", "SUSPEND_CART_ERROR", 500);
  }
}
