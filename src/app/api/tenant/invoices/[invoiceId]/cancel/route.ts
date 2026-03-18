import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { cancelSalesInvoice } from "@/modules/invoicing/application/invoice-service";

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

type Context = { params: Promise<{ invoiceId: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const { invoiceId } = await context.params;
    const parsed = cancelSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("İptal formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const result = await cancelSalesInvoice({
      tenantId: access.tenantId,
      userId: access.userId,
      invoiceId,
      reason: parsed.data.reason,
    });

    return ok(result);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail(error instanceof Error ? error.message : "Fatura iptal edilemedi.", "INVOICE_CANCEL_ERROR", 500);
  }
}
