import type { Prisma } from "@prisma/client";
import { asRecord, numberOrZero } from "@/lib/json";
import { ensureSerialCountUnlocked } from "@/modules/inventory/application/serial-count-lock";

export async function applyStockDelta(params: {
  tx: Prisma.TransactionClient;
  tenantId: string;
  productId: string;
  warehouseId?: string;
  deltaQuantity: number;
  movementCode: string;
  movementName: string;
  movementPayload: Record<string, unknown>;
  occurredAt: Date;
  allowDuringSerialCount?: boolean;
}) {
  if (!params.allowDuringSerialCount) {
    await ensureSerialCountUnlocked({
      tenantId: params.tenantId,
      tx: params.tx,
      operationLabel: params.movementName,
    });
  }

  const occurredAt = params.occurredAt ?? new Date();
  const warehouseKey = params.warehouseId ?? "main";
  const balanceCode = `${params.productId}:${warehouseKey}`;

  await params.tx.stockMovements.create({
    data: {
      tenantId: params.tenantId,
      code: params.movementCode,
      name: params.movementName,
      status: "posted",
      payload: {
        productId: params.productId,
        warehouseId: params.warehouseId,
        deltaQuantity: params.deltaQuantity,
        ...params.movementPayload,
      },
      occurredAt,
    },
  });

  const currentBalance = await params.tx.stockBalances.findFirst({
    where: {
      tenantId: params.tenantId,
      code: balanceCode,
      deletedAt: null,
    },
  });

  if (!currentBalance) {
    await params.tx.stockBalances.create({
      data: {
        tenantId: params.tenantId,
        code: balanceCode,
        name: params.movementName,
        status: "active",
        payload: {
          productId: params.productId,
          warehouseId: params.warehouseId,
          quantity: params.deltaQuantity,
          reserved: 0,
          available: params.deltaQuantity,
        },
        occurredAt,
      },
    });
    return;
  }

  const payload = asRecord(currentBalance.payload);
  const quantity = numberOrZero(payload.quantity) + params.deltaQuantity;
  const reserved = numberOrZero(payload.reserved);

  await params.tx.stockBalances.update({
    where: { id: currentBalance.id },
    data: {
      name: params.movementName,
      payload: {
        ...payload,
        productId: params.productId,
        warehouseId: params.warehouseId,
        quantity,
        reserved,
        available: quantity - reserved,
      },
      occurredAt,
    },
  });
}
