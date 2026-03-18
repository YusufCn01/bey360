import { NextRequest } from "next/server";
import { AuthorizationError, requireTenantAccess } from "@/lib/auth/tenant-access";
import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/http/response";
import { asRecord, numberOrZero } from "@/lib/json";

type Context = { params: Promise<{ invoiceId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const access = await requireTenantAccess(request, "dashboard:view");
    const { invoiceId } = await context.params;

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

    const [items, payments] = await Promise.all([
      prisma.purchaseInvoiceItems.findMany({
        where: {
          tenantId: access.tenantId,
          code: invoice.id,
          deletedAt: null,
        },
        orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
      }),
      prisma.paymentsOut.findMany({
        where: {
          tenantId: access.tenantId,
          deletedAt: null,
          payload: {
            path: ["sourceId"],
            equals: invoice.id,
          },
        },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    const payload = asRecord(invoice.payload);
    const netTotal = numberOrZero(payload.netTotal);
    const paidAmount = payments.reduce((sum, row) => sum + numberOrZero(asRecord(row.payload).amount), 0) || numberOrZero(payload.paidAmount);
    const outstanding = Math.max(0, netTotal - paidAmount);

    return ok({
      id: invoice.id,
      code: invoice.code,
      supplierCode: String(payload.supplierCode ?? ""),
      supplierName: String(payload.supplierName ?? invoice.name ?? ""),
      currency: String(payload.currency ?? "TRY"),
      notes: typeof payload.notes === "string" ? payload.notes : "",
      netTotal,
      paidAmount,
      outstanding,
      status: invoice.status,
      occurredAt: invoice.occurredAt?.toISOString() ?? null,
      lines: items.map((item) => {
        const itemPayload = asRecord(item.payload);
        return {
          id: item.id,
          productId: String(itemPayload.productId ?? ""),
          productName: item.name ?? "",
          quantity: numberOrZero(itemPayload.quantity),
          unitPrice: numberOrZero(itemPayload.unitPrice),
          taxRate: numberOrZero(itemPayload.taxRate),
          netAmount: numberOrZero(itemPayload.netAmount),
        };
      }),
      payments: payments.map((row) => {
        const paymentPayload = asRecord(row.payload);
        return {
          id: row.id,
          code: row.code,
          amount: numberOrZero(paymentPayload.amount),
          method: String(paymentPayload.method ?? "nakit"),
          occurredAt: row.occurredAt?.toISOString() ?? row.createdAt.toISOString(),
        };
      }),
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return fail(error.message, error.code, error.statusCode);
    }
    return fail("Alış faturası detayı alınırken hata oluştu.", "PURCHASE_INVOICE_DETAIL_ERROR", 500);
  }
}
