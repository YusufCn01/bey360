import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import { recordSupplierPayment } from "@/modules/finance/application/finance-service";

const paymentSchema = z.object({
  supplierCode: z.string().min(1).max(100),
  supplierName: z.string().min(1).max(255),
  amount: z.number().positive(),
  method: z.enum(["nakit", "havale_eft"]),
  currency: z.string().length(3).optional(),
  note: z.string().max(1000).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? "200"), 1), 500);
    const supplierCode = request.nextUrl.searchParams.get("supplierCode") ?? undefined;

    const rows = await prisma.paymentsOut.findMany({
      where: {
        tenantId: access.tenantId,
        deletedAt: null,
        ...(supplierCode ?
           {
              payload: {
                path: ["supplierCode"],
                equals: supplierCode,
              },
            }
          : {}),
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return ok(rows);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Ödeme listesi alınırken hata oluştu.", "PAYMENT_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const parsed = paymentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Ödeme formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const result = await recordSupplierPayment({
      tenantId: access.tenantId,
      userId: access.userId,
      ...parsed.data,
    });

    return ok(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Tedarikçi ödeme kaydı oluşturulurken hata oluştu.", "PAYMENT_CREATE_ERROR", 500);
  }
}
