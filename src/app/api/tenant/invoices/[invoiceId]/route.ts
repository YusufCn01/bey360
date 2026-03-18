import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { fail, ok } from "@/lib/http/response";
import { getSalesInvoiceDetail, updateSalesInvoice } from "@/modules/invoicing/application/invoice-service";

const invoiceLineSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1).max(255),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  taxRate: z.number().nonnegative().max(100).optional(),
});

const updateInvoiceSchema = z.object({
  customerCode: z.string().min(1).max(100),
  customerName: z.string().min(1).max(255),
  invoiceType: z.enum(["satis", "iade"]),
  scenario: z.enum(["TEMELFATURA", "TICARIFATURA", "EARSIV"]).optional(),
  profile: z.enum(["TEMELFATURA", "TICARIFATURA", "EARSIV"]).optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(2000).optional(),
  lines: z.array(invoiceLineSchema).min(1),
});

type Context = { params: Promise<{ invoiceId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const { invoiceId } = await context.params;
    const result = await getSalesInvoiceDetail(access.tenantId, invoiceId);
    return ok(result);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail(error instanceof Error ? error.message : "Fatura detayı alınamadı.", "INVOICE_DETAIL_ERROR", 500);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const { invoiceId } = await context.params;
    const parsed = updateInvoiceSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Fatura düzenleme formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const result = await updateSalesInvoice({
      tenantId: access.tenantId,
      userId: access.userId,
      invoiceId,
      ...parsed.data,
    });

    return ok(result);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail(error instanceof Error ? error.message : "Fatura güncellenemedi.", "INVOICE_UPDATE_ERROR", 500);
  }
}
