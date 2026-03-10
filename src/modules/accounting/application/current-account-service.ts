import type { Prisma } from "@prisma/client";
import { asRecord, numberOrZero } from "@/lib/json";

export type CurrentAccountMovementInput = {
  tenantId: string;
  accountCode: string;
  accountName: string;
  movementCode: string;
  movementName: string;
  direction: "debit" | "credit";
  amount: number;
  sourceModule: string;
  sourceId: string;
  currency?: string;
  description?: string;
  occurredAt?: Date;
  extraPayload?: Record<string, unknown>;
};

export async function ensureCurrentAccount(params: {
  tx: Prisma.TransactionClient;
  tenantId: string;
  accountCode: string;
  accountName: string;
  accountType: "customer" | "supplier" | "other";
}) {
  const existing = await params.tx.currentAccounts.findFirst({
    where: {
      tenantId: params.tenantId,
      code: params.accountCode,
      deletedAt: null,
    },
  });

  if (existing) {
    return existing;
  }

  return params.tx.currentAccounts.create({
    data: {
      tenantId: params.tenantId,
      code: params.accountCode,
      name: params.accountName,
      status: "active",
      payload: {
        type: params.accountType,
      },
      occurredAt: new Date(),
    },
  });
}

export async function appendCurrentAccountMovement(params: {
  tx: Prisma.TransactionClient;
  input: CurrentAccountMovementInput;
}) {
  const occurredAt = params.input.occurredAt ?? new Date();
  await ensureCurrentAccount({
    tx: params.tx,
    tenantId: params.input.tenantId,
    accountCode: params.input.accountCode,
    accountName: params.input.accountName,
    accountType: params.input.accountCode.startsWith("MUS-")
      ? "customer"
      : params.input.accountCode.startsWith("TED-")
        ? "supplier"
        : "other",
  });

  await params.tx.currentAccountMovements.create({
    data: {
      tenantId: params.input.tenantId,
      code: params.input.movementCode,
      name: params.input.movementName,
      description: params.input.description ?? "",
      status: "posted",
      payload: {
        accountCode: params.input.accountCode,
        accountName: params.input.accountName,
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

  const snapshotCode = `SNAP:${params.input.accountCode}`;
  const existingSnapshot = await params.tx.balanceSnapshots.findFirst({
    where: {
      tenantId: params.input.tenantId,
      code: snapshotCode,
      deletedAt: null,
    },
  });

  const delta = params.input.direction === "debit" ? params.input.amount : -params.input.amount;

  if (!existingSnapshot) {
    await params.tx.balanceSnapshots.create({
      data: {
        tenantId: params.input.tenantId,
        code: snapshotCode,
        name: params.input.accountName,
        status: "active",
        payload: {
          accountCode: params.input.accountCode,
          balance: delta,
          currency: params.input.currency ?? "TRY",
        },
        occurredAt,
      },
    });
    return;
  }

  const payload = asRecord(existingSnapshot.payload);
  const currentBalance = numberOrZero(payload.balance);

  await params.tx.balanceSnapshots.update({
    where: { id: existingSnapshot.id },
    data: {
      payload: {
        ...payload,
        accountCode: params.input.accountCode,
        balance: currentBalance + delta,
        currency: params.input.currency ?? "TRY",
      },
      occurredAt,
    },
  });
}
