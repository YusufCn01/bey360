import { z } from "zod";
import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import { asRecord, numberOrZero } from "@/lib/json";
import { recordSupplierPayment } from "@/modules/finance/application/finance-service";

const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(["nakit", "havale_eft", "kart", "dekont"]),
  currency: z.string().length(3).optional(),
  note: z.string().max(1000).optional(),
});

type Context = { params: Promise<{ invoiceId: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const { invoiceId } = await context.params;
    const parsed = paymentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Ödeme formu geçersiz.", "VALIDATION_ERROR", 422);
    }

    const invoice = await prisma.purchaseInvoices.findFirst({
      where: {
        id: invoiceId,
        tenantId: access.tenantId,
        deletedAt: null,
      },
    });

    if (!invoice) {
      return fail("Alış faturası bulunamadı.", "PURCHASE_INVOICE_NOT_FOUND", 404);
    }

    const payload = asRecord(invoice.payload);
    const supplierCode = String(payload.supplierCode ?? "");
    const supplierName = String(payload.supplierName ?? invoice.name ?? "");
    const netTotal = numberOrZero(payload.netTotal);
    const paidAmount = numberOrZero(payload.paidAmount);
    const outstanding = Math.max(0, netTotal - paidAmount);

    if (invoice.status === "cancelled") {
      return fail("İptal edilen alış faturası için ödeme yapılamaz.", "PURCHASE_INVOICE_CANCELLED", 409);
    }
    if (!supplierCode || !supplierName) {
      return fail("Tedarikçi bilgisi eksik.", "PURCHASE_SUPPLIER_INVALID", 422);
    }
    if (parsed.data.amount > outstanding) {
      return fail("Ödeme tutarı kalan borçtan büyük olamaz.", "PURCHASE_PAYMENT_EXCEEDS_OUTSTANDING", 422);
    }

    const payment = await recordSupplierPayment({
      tenantId: access.tenantId,
      userId: access.userId,
      supplierCode,
      supplierName,
      amount: parsed.data.amount,
      method: parsed.data.method,
      currency: parsed.data.currency ?? String(payload.currency ?? "TRY"),
      note: parsed.data.note ?? `${invoice.code} numaralı alış faturası ödemesi`,
      sourceModule: "purchase_invoice",
      sourceId: invoice.id,
    });

    const nextPaidAmount = paidAmount + parsed.data.amount;
    const nextOutstanding = Math.max(0, netTotal - nextPaidAmount);

    await prisma.purchaseInvoices.update({
      where: { id: invoice.id },
      data: {
        payload: {
          ...payload,
          paidAmount: nextPaidAmount,
          outstanding: nextOutstanding,
          paymentStatus: nextOutstanding <= 0 ? "paid" : "partial",
        },
      },
    });

    return ok({
      invoiceId: invoice.id,
      paymentId: payment.paymentId,
      paidAmount: nextPaidAmount,
      outstanding: nextOutstanding,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail(error instanceof Error ? error.message : "Alış faturası ödemesi kaydedilemedi.", "PURCHASE_INVOICE_PAYMENT_ERROR", 500);
  }
}
