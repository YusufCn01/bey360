import type { Prisma } from "@prisma/client";
import { asRecord, numberOrZero } from "@/lib/json";

export type CashTransactionInput = {
  tenantId: string;
  cashAccountCode: string;
  cashAccountName: string;
  movementCode: string;
  movementName: string;
  direction: "in" | "out";
  amount: number;
  sourceModule: string;
  sourceId: string;
  currency?: string;
  note?: string;
  occurredAt?: Date;
  extraPayload?: Record<string, unknown>;
};

async function ensureCashAccount(params: {
  tx: Prisma.TransactionClient;
  tenantId: string;
  cashAccountCode: string;
  cashAccountName: string;
}) {
  const existing = await params.tx.cashAccounts.findFirst({
    where: {
      tenantId: params.tenantId,
      code: params.cashAccountCode,
      deletedAt: null,
    },
  });

  if (existing) {
    return existing;
  }

  return params.tx.cashAccounts.create({
    data: {
      tenantId: params.tenantId,
      code: params.cashAccountCode,
      name: params.cashAccountName,
      status: "active",
      payload: {
        currency: "TRY",
      },
      occurredAt: new Date(),
    },
  });
}

export async function appendCashTransaction(params: { tx: Prisma.TransactionClient; input: CashTransactionInput }) {
  const occurredAt = params.input.occurredAt ?? new Date();
  await ensureCashAccount({
    tx: params.tx,
    tenantId: params.input.tenantId,
    cashAccountCode: params.input.cashAccountCode,
    cashAccountName: params.input.cashAccountName,
  });

  await params.tx.cashTransactions.create({
    data: {
      tenantId: params.input.tenantId,
      code: params.input.movementCode,
      name: params.input.movementName,
      description: params.input.note ?? "",
      status: "posted",
      payload: {
        cashAccountCode: params.input.cashAccountCode,
        direction: params.input.direction,
        amount: params.input.amount,
        currency: params.input.currency ?? "TRY",
        sourceModule: params.input.sourceModule,
        sourceId: params.input.sourceId,
        ...(params.input.extraPayload ?? {}),
      },
      occurredAt,
    },
  });

  const summaryCode = `SUMMARY:${params.input.cashAccountCode}`;
  const existingSummary = await params.tx.dailyCashClosings.findFirst({
    where: {
      tenantId: params.input.tenantId,
      code: summaryCode,
      deletedAt: null,
    },
  });

  const delta = params.input.direction === "in" ? params.input.amount : -params.input.amount;

  if (!existingSummary) {
    await params.tx.dailyCashClosings.create({
      data: {
        tenantId: params.input.tenantId,
        code: summaryCode,
        name: params.input.cashAccountName,
        status: "open",
        payload: {
          cashAccountCode: params.input.cashAccountCode,
          runningBalance: delta,
        },
        occurredAt,
      },
    });
    return;
  }

  const payload = asRecord(existingSummary.payload);
  const currentBalance = numberOrZero(payload.runningBalance);

  await params.tx.dailyCashClosings.update({
    where: { id: existingSummary.id },
    data: {
      payload: {
        ...payload,
        runningBalance: currentBalance + delta,
      },
      occurredAt,
    },
  });
}
