import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { asRecord } from "@/lib/json";
import { appendCashTransaction } from "@/modules/accounting/application/cash-service";
import { appendCurrentAccountMovement } from "@/modules/accounting/application/current-account-service";

type CollectionInput = {
  tenantId: string;
  userId: string;
  customerCode: string;
  customerName: string;
  amount: number;
  method: "nakit" | "kart" | "havale_eft" | "cek" | "dekont";
  currency?: string;
  note?: string;
};

type SupplierPaymentInput = {
  tenantId: string;
  userId: string;
  supplierCode: string;
  supplierName: string;
  amount: number;
  method: "nakit" | "havale_eft" | "kart" | "dekont";
  currency?: string;
  note?: string;
};

type CashTransferInput = {
  tenantId: string;
  userId: string;
  fromCashCode: string;
  fromCashName: string;
  toCashCode: string;
  toCashName: string;
  amount: number;
  currency?: string;
  note?: string;
};

function readNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function nextCardStatementDate(base: Date, statementDay: number) {
  const day = Math.min(28, Math.max(1, Math.floor(statementDay)));
  const current = new Date(base);
  const candidate = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), day, 12, 0, 0));
  if (candidate.getTime() < base.getTime()) {
    candidate.setUTCMonth(candidate.getUTCMonth() + 1);
  }
  return candidate;
}

function addDays(base: Date, days: number) {
  const result = new Date(base);
  result.setUTCDate(result.getUTCDate() + Math.max(0, Math.floor(days)));
  return result;
}

async function resolveCardTrackingSettings(
  tx: Prisma.TransactionClient,
  tenantId: string,
) {
  const row = await tx.tenantSettings.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      code: "credit_card_tracking",
    },
    orderBy: { createdAt: "desc" },
  });
  const payload = asRecord(row?.payload);
  return {
    statementDay: readNumber(payload.statementDay, 10),
    paymentDelayDays: readNumber(payload.paymentDelayDays, 10),
  };
}

export async function recordCustomerCollection(input: CollectionInput) {
  if (input.amount <= 0) {
    throw new Error("Tahsilat tutarı sıfırdan büyük olmalıdır.");
  }

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const code = `TAH-${Date.now()}`;

    const collection = await tx.collections.create({
      data: {
        tenantId: input.tenantId,
        code,
        name: input.customerName,
        status: "completed",
        payload: {
          customerCode: input.customerCode,
          customerName: input.customerName,
          amount: input.amount,
          method: input.method,
          currency: input.currency ?? "TRY",
          note: input.note,
        },
        occurredAt: now,
      },
    });

    await tx.collectionItems.create({
      data: {
        tenantId: input.tenantId,
        code: collection.id,
        name: input.customerName,
        status: "completed",
        payload: {
          amount: input.amount,
          method: input.method,
        },
        occurredAt: now,
      },
    });

    if (input.method === "nakit") {
      await appendCashTransaction({
        tx,
        input: {
          tenantId: input.tenantId,
          cashAccountCode: "KASA:MERKEZ",
          cashAccountName: "Merkez Kasa",
          movementCode: "COLLECTION_IN",
          movementName: "Müşteri Tahsilatı",
          direction: "in",
          amount: input.amount,
          sourceModule: "collection",
          sourceId: collection.id,
          currency: input.currency ?? "TRY",
          note: input.note,
        },
      });
    } else {
      await tx.bankTransactions.create({
        data: {
          tenantId: input.tenantId,
          code,
          name: input.customerName,
          status: "completed",
          payload: {
            customerCode: input.customerCode,
            customerName: input.customerName,
            amount: input.amount,
            method: input.method,
            currency: input.currency ?? "TRY",
            note: input.note,
            sourceModule: "collection",
            sourceId: collection.id,
          },
          occurredAt: now,
        },
      });
    }

    await appendCurrentAccountMovement({
      tx,
      input: {
        tenantId: input.tenantId,
        accountCode: input.customerCode,
        accountName: input.customerName,
        movementCode: "COLLECTION_CREDIT",
        movementName: "Müşteri Tahsilat Kaydı",
        direction: "credit",
        amount: input.amount,
        sourceModule: "collection",
        sourceId: collection.id,
        currency: input.currency ?? "TRY",
      },
    });

    return {
      collectionId: collection.id,
      code,
      amount: input.amount,
    };
  });
}

export async function recordSupplierPayment(input: SupplierPaymentInput) {
  if (input.amount <= 0) {
    throw new Error("Ödeme tutarı sıfırdan büyük olmalıdır.");
  }

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const code = `ODE-${Date.now()}`;

    const payment = await tx.paymentsOut.create({
      data: {
        tenantId: input.tenantId,
        code,
        name: input.supplierName,
        status: "completed",
        payload: {
          supplierCode: input.supplierCode,
          supplierName: input.supplierName,
          amount: input.amount,
          method: input.method,
          currency: input.currency ?? "TRY",
          note: input.note,
        },
        occurredAt: now,
      },
    });

    await tx.paymentOutItems.create({
      data: {
        tenantId: input.tenantId,
        code: payment.id,
        name: input.supplierName,
        status: "completed",
        payload: {
          amount: input.amount,
          method: input.method,
        },
        occurredAt: now,
      },
    });

    if (input.method === "nakit") {
      await appendCashTransaction({
        tx,
        input: {
          tenantId: input.tenantId,
          cashAccountCode: "KASA:MERKEZ",
          cashAccountName: "Merkez Kasa",
          movementCode: "SUPPLIER_PAYMENT_OUT",
          movementName: "Tedarikçi Ödeme Çıkışı",
          direction: "out",
          amount: input.amount,
          sourceModule: "supplier_payment",
          sourceId: payment.id,
          currency: input.currency ?? "TRY",
          note: input.note,
        },
      });
    } else {
      const cardSettings = await resolveCardTrackingSettings(tx, input.tenantId);
      const statementDate =
        input.method === "kart" ? nextCardStatementDate(now, cardSettings.statementDay).toISOString() : undefined;
      const paymentDueDate =
        input.method === "kart" && statementDate
          ? addDays(new Date(statementDate), cardSettings.paymentDelayDays).toISOString()
          : undefined;

      await tx.bankTransactions.create({
        data: {
          tenantId: input.tenantId,
          code,
          name: input.supplierName,
          status: "completed",
          payload: {
            supplierCode: input.supplierCode,
            supplierName: input.supplierName,
            amount: input.amount,
            method: input.method,
            currency: input.currency ?? "TRY",
            note: input.note,
            statementDate,
            paymentDueDate,
            sourceModule: "supplier_payment",
            sourceId: payment.id,
          },
          occurredAt: now,
        },
      });
    }

    await appendCurrentAccountMovement({
      tx,
      input: {
        tenantId: input.tenantId,
        accountCode: input.supplierCode,
        accountName: input.supplierName,
        movementCode: "SUPPLIER_PAYMENT_CREDIT",
        movementName: "Tedarikçi Ödeme Cari Kaydı",
        direction: "credit",
        amount: input.amount,
        sourceModule: "supplier_payment",
        sourceId: payment.id,
        currency: input.currency ?? "TRY",
      },
    });

    return {
      paymentId: payment.id,
      code,
      amount: input.amount,
    };
  });
}

export async function transferCash(input: CashTransferInput) {
  if (input.amount <= 0) {
    throw new Error("Transfer tutarı sıfırdan büyük olmalıdır.");
  }

  if (input.fromCashCode === input.toCashCode) {
    throw new Error("Kaynak ve hedef kasa aynı olamaz.");
  }

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const code = `KTR-${Date.now()}`;

    const transfer = await tx.cashTransferRecords.create({
      data: {
        tenantId: input.tenantId,
        code,
        name: `${input.fromCashName} -> ${input.toCashName}`,
        status: "completed",
        payload: {
          fromCashCode: input.fromCashCode,
          toCashCode: input.toCashCode,
          amount: input.amount,
          currency: input.currency ?? "TRY",
          note: input.note,
        },
        occurredAt: now,
      },
    });

    await appendCashTransaction({
      tx,
      input: {
        tenantId: input.tenantId,
        cashAccountCode: input.fromCashCode,
        cashAccountName: input.fromCashName,
        movementCode: "TRANSFER_OUT",
        movementName: "Kasalar Arası Transfer Çıkış",
        direction: "out",
        amount: input.amount,
        sourceModule: "cash_transfer",
        sourceId: transfer.id,
        currency: input.currency ?? "TRY",
      },
    });

    await appendCashTransaction({
      tx,
      input: {
        tenantId: input.tenantId,
        cashAccountCode: input.toCashCode,
        cashAccountName: input.toCashName,
        movementCode: "TRANSFER_IN",
        movementName: "Kasalar Arası Transfer Giriş",
        direction: "in",
        amount: input.amount,
        sourceModule: "cash_transfer",
        sourceId: transfer.id,
        currency: input.currency ?? "TRY",
      },
    });

    return {
      transferId: transfer.id,
      code,
      amount: input.amount,
    };
  });
}
