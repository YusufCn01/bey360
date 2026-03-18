import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { registerSalesInvoiceCollection } from "@/modules/invoicing/application/invoice-service";

const collectionSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(["nakit", "kart", "havale_eft", "cek", "dekont"]),
  currency: z.string().length(3).optional(),
  note: z.string().max(1000).optional(),
});

type Context = { params: Promise<{ invoiceId: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const { invoiceId } = await context.params;
    const parsed = collectionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Tahsilat formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const result = await registerSalesInvoiceCollection({
      tenantId: access.tenantId,
      userId: access.userId,
      invoiceId,
      ...parsed.data,
    });

    return ok(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail(error instanceof Error ? error.message : "Tahsilat kaydı oluşturulamadı.", "INVOICE_COLLECTION_ERROR", 500);
  }
}
