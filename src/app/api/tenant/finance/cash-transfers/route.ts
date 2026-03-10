import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import { transferCash } from "@/modules/finance/application/finance-service";

const transferSchema = z.object({
  fromCashCode: z.string().min(1).max(100),
  fromCashName: z.string().min(1).max(255),
  toCashCode: z.string().min(1).max(100),
  toCashName: z.string().min(1).max(255),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
  note: z.string().max(1000).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? "200"), 1), 500);

    const rows = await prisma.cashTransferRecords.findMany({
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

    return fail("Kasa transfer listesi alınırken hata oluştu.", "CASH_TRANSFER_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const parsed = transferSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Kasa transfer formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const result = await transferCash({
      tenantId: access.tenantId,
      userId: access.userId,
      ...parsed.data,
    });

    return ok(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Kasa transfer kaydı oluşturulurken hata oluştu.", "CASH_TRANSFER_ERROR", 500);
  }
}
