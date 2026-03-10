import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { createPaymentLink, listPaymentLinks } from "@/modules/payment/application/payment-service";

const createPaymentLinkSchema = z.object({
  providerCode: z.string().default("mock-payment"),
  amount: z.number().positive(),
  currency: z.string().length(3).default("TRY"),
  customerReference: z.string().min(1).max(255),
  customerCode: z.string().max(100).optional(),
  customerName: z.string().max(255).optional(),
  description: z.string().min(1).max(1000),
  expiresAt: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const status = request.nextUrl.searchParams.get("status") ?? undefined;
    const search = request.nextUrl.searchParams.get("q") ?? undefined;
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "100");

    const rows = await listPaymentLinks({
      tenantId: access.tenantId,
      status,
      search,
      limit,
    });

    return ok(rows);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Ödeme linkleri listelenirken hata oluştu.", "PAYMENT_LINK_LIST_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const parsed = createPaymentLinkSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Ödeme linki formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const created = await createPaymentLink({
      tenantId: access.tenantId,
      userId: access.userId,
      ...parsed.data,
    });

    return ok(created, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }

    return fail("Ödeme linki oluşturulurken hata oluştu.", "PAYMENT_LINK_CREATE_ERROR", 500);
  }
}
