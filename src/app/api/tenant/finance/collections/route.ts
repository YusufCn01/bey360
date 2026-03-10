import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import { recordCustomerCollection } from "@/modules/finance/application/finance-service";

const collectionSchema = z.object({
  customerCode: z.string().min(1).max(100),
  customerName: z.string().min(1).max(255),
  amount: z.number().positive(),
  method: z.enum(["nakit", "kart", "havale_eft"]),
  currency: z.string().length(3).optional(),
  note: z.string().max(1000).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? "200"), 1), 500);
    const customerCode = request.nextUrl.searchParams.get("customerCode") ?? undefined;

    const rows = await prisma.collections.findMany({
      where: {
        tenantId: access.tenantId,
        deletedAt: null,
        ...(customerCode ?
           {
              payload: {
                path: ["customerCode"],
                equals: customerCode,
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

    return fail("Tahsilat listesi alınırken hata oluştu.", "COLLECTION_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const parsed = collectionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Tahsilat formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const result = await recordCustomerCollection({
      tenantId: access.tenantId,
      userId: access.userId,
      ...parsed.data,
    });

    return ok(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Tahsilat kaydı oluşturulurken hata oluştu.", "COLLECTION_CREATE_ERROR", 500);
  }
}
