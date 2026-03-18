import { prisma } from "@/lib/db/prisma";

type InvoiceLineInput = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
};

type CreateInvoiceInput = {
  tenantId: string;
  userId: string;
  customerCode: string;
  customerName: string;
  invoiceType: "satis" | "iade";
  scenario?: "TEMELFATURA" | "TICARIFATURA" | "EARSIV";
  profile?: "TEMELFATURA" | "TICARIFATURA" | "EARSIV";
  currency?: string;
  notes?: string;
  lines: InvoiceLineInput[];
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export async function createSalesInvoice(input: CreateInvoiceInput) {
  if (input.lines.length === 0) {
    throw new Error("Fatura satırları boş olamaz.");
  }

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const seriesCode = input.invoiceType === "satis" ? "SATIS_SERI" : "IADE_SERI";

    const sequence = await tx.invoiceSequences.create({
      data: {
        tenantId: input.tenantId,
        code: seriesCode,
        name: "Fatura Sıra Numarası",
        status: "active",
        payload: {
          issuedBy: input.userId,
          issuedAt: now.toISOString(),
        },
        occurredAt: now,
      },
    });

    const invoiceNo = `FTR-${now.getFullYear()}-${sequence.id.slice(0, 8).toUpperCase()}`;
    const totals = input.lines.map((line) => {
      const gross = roundCurrency(line.quantity * line.unitPrice);
      const taxRate = line.taxRate ?? 20;
      const taxAmount = roundCurrency((gross * taxRate) / 100);
      const net = roundCurrency(gross + taxAmount);
      return { ...line, gross, taxRate, taxAmount, net };
    });
    const netTotal = roundCurrency(totals.reduce((sum, line) => sum + line.net, 0));

    const invoice = await tx.invoices.create({
      data: {
        tenantId: input.tenantId,
        code: invoiceNo,
        name: input.customerName,
        status: "issued",
        payload: {
          invoiceType: input.invoiceType,
          customerCode: input.customerCode,
          customerName: input.customerName,
          scenario: input.scenario ?? "EARSIV",
          profile: input.profile ?? "EARSIV",
          currency: input.currency ?? "TRY",
          netTotal,
          notes: input.notes,
        },
        occurredAt: now,
      },
    });

    for (const line of totals) {
      await tx.invoiceItems.create({
        data: {
          tenantId: input.tenantId,
          code: invoice.id,
          name: line.productName,
          status: "issued",
          payload: {
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            grossAmount: line.gross,
            taxRate: line.taxRate,
            taxAmount: line.taxAmount,
            netAmount: line.net,
          },
          occurredAt: now,
        },
      });
    }

    const eInvoiceDocument = await tx.eInvoiceDocuments.create({
      data: {
        tenantId: input.tenantId,
        code: invoiceNo,
        name: input.customerName,
        status: "draft",
        payload: {
          invoiceId: invoice.id,
          scenario: input.scenario ?? "EARSIV",
          profile: input.profile ?? "EARSIV",
          customerCode: input.customerCode,
          customerName: input.customerName,
          total: netTotal,
          currency: input.currency ?? "TRY",
        },
        occurredAt: now,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        module: "invoice",
        entityName: "invoices",
        entityId: invoice.id,
        action: "invoice.created",
        payload: {
          invoiceNo,
          customerCode: input.customerCode,
          netTotal,
        },
      },
    });

    return {
      invoiceId: invoice.id,
      documentId: eInvoiceDocument.id,
      invoiceNo,
      netTotal,
    };
  });
}
