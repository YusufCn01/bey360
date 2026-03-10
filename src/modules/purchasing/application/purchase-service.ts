import { prisma } from "@/lib/db/prisma";
import { appendCashTransaction } from "@/modules/accounting/application/cash-service";
import { appendCurrentAccountMovement, ensureCurrentAccount } from "@/modules/accounting/application/current-account-service";
import { applyStockDelta } from "@/modules/catalog/application/stock-service";

type PurchaseLineInput = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  warehouseId?: string;
};

type CreatePurchaseInvoiceInput = {
  tenantId: string;
  userId: string;
  supplierCode: string;
  supplierName: string;
  documentNo?: string;
  warehouseId?: string;
  currency?: string;
  paidAmount?: number;
  notes?: string;
  lines: PurchaseLineInput[];
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export async function createPurchaseInvoice(input: CreatePurchaseInvoiceInput) {
  if (input.lines.length === 0) {
    throw new Error("Alış faturasında en az bir satır bulunmalıdır.");
  }

  const totals = input.lines.map((line) => {
    const gross = roundCurrency(line.quantity * line.unitPrice);
    const taxRate = line.taxRate ?? 20;
    const tax = roundCurrency((gross * taxRate) / 100);
    const net = roundCurrency(gross + tax);
    return { ...line, gross, tax, net, taxRate };
  });

  const netTotal = roundCurrency(totals.reduce((sum, line) => sum + line.net, 0));
  const paidAmount = roundCurrency(input.paidAmount ?? 0);
  const outstanding = roundCurrency(Math.max(0, netTotal - paidAmount));

  if (paidAmount > netTotal) {
    throw new Error("Ödeme tutarı fatura toplamını aşamaz.");
  }

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const invoiceNo = input.documentNo ?? `ALIS-${Date.now()}`;

    const invoice = await tx.purchaseInvoices.create({
      data: {
        tenantId: input.tenantId,
        code: invoiceNo,
        name: input.supplierName,
        status: "posted",
        payload: {
          supplierCode: input.supplierCode,
          supplierName: input.supplierName,
          currency: input.currency ?? "TRY",
          netTotal,
          paidAmount,
          outstanding,
          notes: input.notes,
          userId: input.userId,
        },
        occurredAt: now,
      },
    });

    for (const line of totals) {
      await tx.purchaseInvoiceItems.create({
        data: {
          tenantId: input.tenantId,
          code: invoice.id,
          name: line.productName,
          status: "posted",
          payload: {
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            grossAmount: line.gross,
            taxRate: line.taxRate,
            taxAmount: line.tax,
            netAmount: line.net,
            warehouseId: line.warehouseId ?? input.warehouseId,
          },
          occurredAt: now,
        },
      });

      await applyStockDelta({
        tx,
        tenantId: input.tenantId,
        productId: line.productId,
        warehouseId: line.warehouseId ?? input.warehouseId,
        deltaQuantity: line.quantity,
        movementCode: "PURCHASE_IN",
        movementName: "Alış Fatura Girişi",
        movementPayload: {
          purchaseInvoiceId: invoice.id,
          supplierCode: input.supplierCode,
        },
        occurredAt: now,
      });
    }

    await ensureCurrentAccount({
      tx,
      tenantId: input.tenantId,
      accountCode: input.supplierCode,
      accountName: input.supplierName,
      accountType: "supplier",
    });

    await appendCurrentAccountMovement({
      tx,
      input: {
        tenantId: input.tenantId,
        accountCode: input.supplierCode,
        accountName: input.supplierName,
        movementCode: "PURCHASE_DEBIT",
        movementName: "Alış Faturası Borç Kaydı",
        direction: "debit",
        amount: netTotal,
        sourceModule: "purchase",
        sourceId: invoice.id,
        currency: input.currency ?? "TRY",
      },
    });

    if (paidAmount > 0) {
      await tx.paymentsOut.create({
        data: {
          tenantId: input.tenantId,
          code: invoice.id,
          name: input.supplierName,
          status: "completed",
          payload: {
            supplierCode: input.supplierCode,
            amount: paidAmount,
            currency: input.currency ?? "TRY",
          },
          occurredAt: now,
        },
      });

      await appendCashTransaction({
        tx,
        input: {
          tenantId: input.tenantId,
          cashAccountCode: "KASA:MERKEZ",
          cashAccountName: "Merkez Kasa",
          movementCode: "PURCHASE_PAYMENT_OUT",
          movementName: "Tedarikçi Ödemesi",
          direction: "out",
          amount: paidAmount,
          sourceModule: "purchase",
          sourceId: invoice.id,
          currency: input.currency ?? "TRY",
        },
      });

      await appendCurrentAccountMovement({
        tx,
        input: {
          tenantId: input.tenantId,
          accountCode: input.supplierCode,
          accountName: input.supplierName,
          movementCode: "PURCHASE_PAYMENT_CREDIT",
          movementName: "Alış Fatura Ödeme Kaydı",
          direction: "credit",
          amount: paidAmount,
          sourceModule: "purchase",
          sourceId: invoice.id,
          currency: input.currency ?? "TRY",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        module: "purchase",
        entityName: "purchase_invoices",
        entityId: invoice.id,
        action: "purchase.invoice.created",
        payload: {
          supplierCode: input.supplierCode,
          netTotal,
          paidAmount,
        },
      },
    });

    return {
      purchaseInvoiceId: invoice.id,
      documentNo: invoiceNo,
      netTotal,
      paidAmount,
      outstanding,
    };
  });
}
