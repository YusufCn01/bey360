import { prisma } from "@/lib/db/prisma";
import { asRecord } from "@/lib/json";
import { appendCashTransaction } from "@/modules/accounting/application/cash-service";
import { appendCurrentAccountMovement, ensureCurrentAccount } from "@/modules/accounting/application/current-account-service";
import { applyStockDelta } from "@/modules/catalog/application/stock-service";
import { queueSaleSmsNotification, readSmsSettings } from "@/modules/notifications/application/sms-service";
import { calculateSaleTotals } from "@/modules/pos/application/pos-calculation";
import type { CreatePosReturnInput, CreatePosSaleInput, PosPaymentInput, SuspendCartInput } from "@/modules/pos/domain/pos-types";

export class PosValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function ensurePositiveAmount(value: number, fieldName: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new PosValidationError(`${fieldName} sıfırdan büyük olmalıdır.`);
  }
}

function sumPayments(payments: PosPaymentInput[]) {
  return Math.round(payments.reduce((sum, payment) => sum + payment.amount, 0) * 100) / 100;
}

function sumCollectedPayments(payments: PosPaymentInput[]) {
  return Math.round(payments.reduce((sum, payment) => (payment.method === "cari" ? sum : sum + payment.amount), 0) * 100) / 100;
}

function readText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateDueDateIso(base: Date, maturityDays: number): string | undefined {
  if (!Number.isFinite(maturityDays) || maturityDays <= 0) {
    return undefined;
  }
  const due = new Date(base);
  due.setDate(due.getDate() + Math.floor(maturityDays));
  return due.toISOString();
}

export async function openRegisterSession(params: {
  tenantId: string;
  userId: string;
  registerId: string;
  registerName: string;
  openingCash?: number;
  currency?: string;
}) {
  const existing = await prisma.saleRegisterSessions.findFirst({
    where: {
      tenantId: params.tenantId,
      code: params.registerId,
      status: "open",
      deletedAt: null,
    },
  });

  if (existing) {
    throw new PosValidationError("Bu kasada zaten açık bir POS oturumu var.");
  }

  return prisma.saleRegisterSessions.create({
    data: {
      tenantId: params.tenantId,
      code: params.registerId,
      name: params.registerName,
      status: "open",
      payload: {
        openedBy: params.userId,
        openingCash: params.openingCash ?? 0,
        currency: params.currency ?? "TRY",
      },
      occurredAt: new Date(),
    },
  });
}

export async function closeRegisterSession(params: {
  tenantId: string;
  userId: string;
  sessionId: string;
  closingCash?: number;
  note?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.saleRegisterSessions.findFirst({
      where: {
        id: params.sessionId,
        tenantId: params.tenantId,
        deletedAt: null,
        status: "open",
      },
    });

    if (!session) {
      throw new PosValidationError("Kapatilacak acik POS oturumu bulunamadi.");
    }

    const sessionPayload = asRecord(session.payload);
    const registerId = session.code ?? readText(sessionPayload.registerId);
    const sessionOpenedAt = session.occurredAt ?? session.createdAt ?? new Date();
    const closedAt = new Date();

    const openingCash = roundCurrency(readNumber(sessionPayload.openingCash));
    const countedClosingCash = roundCurrency(Math.max(0, params.closingCash ?? 0));
    const currency = readText(sessionPayload.currency) || "TRY";
    const noteText = readText(params.note);

    const sales = await tx.sales.findMany({
      where: {
        tenantId: params.tenantId,
        deletedAt: null,
        status: "completed",
        occurredAt: {
          gte: sessionOpenedAt,
          lte: closedAt,
        },
        ...(registerId
          ? {
              payload: {
                path: ["registerId"],
                equals: registerId,
              },
            }
          : {}),
      },
      select: {
        payload: true,
      },
    });

    let salesTotal = 0;
    for (const sale of sales) {
      const salePayload = asRecord(sale.payload);
      salesTotal += readNumber(salePayload.netTotal);
    }
    salesTotal = roundCurrency(salesTotal);

    let cashNetMovement = 0;
    if (registerId) {
      const cashMovements = await tx.cashTransactions.findMany({
        where: {
          tenantId: params.tenantId,
          deletedAt: null,
          occurredAt: {
            gte: sessionOpenedAt,
            lte: closedAt,
          },
          payload: {
            path: ["cashAccountCode"],
            equals: "KASA:" + registerId,
          },
        },
        select: {
          payload: true,
        },
      });

      for (const movement of cashMovements) {
        const movementPayload = asRecord(movement.payload);
        const direction = readText(movementPayload.direction).toLowerCase();
        const amount = readNumber(movementPayload.amount);
        cashNetMovement += direction === "out" ? -amount : amount;
      }
    }

    cashNetMovement = roundCurrency(cashNetMovement);
    const expectedClosingCash = roundCurrency(openingCash + cashNetMovement);
    const cashVariance = roundCurrency(countedClosingCash - expectedClosingCash);
    const varianceStatus = cashVariance > 0 ? "surplus" : cashVariance < 0 ? "deficit" : "balanced";

    const closureReport = {
      registerId: registerId || null,
      openedAt: sessionOpenedAt.toISOString(),
      closedAt: closedAt.toISOString(),
      currency,
      openingCash,
      expectedClosingCash,
      countedClosingCash,
      cashNetMovement,
      salesCount: sales.length,
      salesTotal,
      cashVariance,
      varianceStatus,
    };

    const updatedSession = await tx.saleRegisterSessions.update({
      where: { id: session.id },
      data: {
        status: "closed",
        payload: {
          ...sessionPayload,
          closedBy: params.userId,
          closingCash: countedClosingCash,
          note: noteText || undefined,
          closureReport,
        },
        occurredAt: closedAt,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        module: "pos",
        entityName: "sale_register_sessions",
        entityId: session.id,
        action: "session.closed",
        payload: {
          sessionId: session.id,
          registerId: registerId || null,
          openingCash,
          expectedClosingCash,
          countedClosingCash,
          cashVariance,
          varianceStatus,
          salesCount: sales.length,
          salesTotal,
          currency,
        },
      },
    });

    return updatedSession;
  });
}

export async function suspendCart(input: SuspendCartInput) {
  if (input.items.length === 0) {
    throw new PosValidationError("Askıya alınacak sepette en az bir ürün olmalıdır.");
  }

  const code = `ASKI-${Date.now()}`;
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const suspended = await tx.suspendedSales.create({
      data: {
        tenantId: input.tenantId,
        code,
        name: input.registerName,
        status: "suspended",
        payload: {
          registerId: input.registerId,
          customerCode: input.customerCode,
          customerName: input.customerName,
          note: input.note,
          suspendedBy: input.userId,
          itemCount: input.items.length,
        },
        occurredAt: now,
      },
    });

    for (const line of input.items) {
      await tx.suspendedSaleItems.create({
        data: {
          tenantId: input.tenantId,
          code: suspended.id,
          name: line.productName,
          status: "suspended",
          payload: line,
          occurredAt: now,
        },
      });
    }

    return suspended;
  });
}

export async function listSuspendedCarts(params: {
  tenantId: string;
  registerId?: string;
  limit: number;
}) {
  const take = Math.min(Math.max(params.limit ?? 50, 1), 100);

  return prisma.suspendedSales.findMany({
    where: {
      tenantId: params.tenantId,
      deletedAt: null,
      status: "suspended",
      ...(params.registerId ?
         {
            payload: {
              path: ["registerId"],
              equals: params.registerId,
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function completePosSale(input: CreatePosSaleInput) {
  if (input.items.length === 0) {
    throw new PosValidationError("Satışta en az bir ürün olmalıdır.");
  }

  if (input.payments.length === 0) {
    throw new PosValidationError("Satışta en az bir ödeme satırı olmalıdır.");
  }

  for (const line of input.items) {
    ensurePositiveAmount(line.quantity, "Ürün miktarı");
    ensurePositiveAmount(line.unitPrice, "Ürün birim fiyatı");
  }

  for (const payment of input.payments) {
    ensurePositiveAmount(payment.amount, "Ödeme tutarı");
  }

  const totals = calculateSaleTotals(input.items);
  const paymentTotal = sumPayments(input.payments);
  const collectedTotal = sumCollectedPayments(input.payments);
  const cariTotal = Math.round((paymentTotal - collectedTotal) * 100) / 100;
  const outstanding = Math.round((totals.netTotal - collectedTotal) * 100) / 100;
  const changeAmount = Math.max(0, Math.round((collectedTotal - totals.netTotal) * 100) / 100);

  if ((outstanding > 0 || cariTotal > 0) && !input.customerCode) {
    throw new PosValidationError("Kısmi ödeme için müşteri/cari seçimi zorunludur.");
  }

  if (cariTotal > 0 && Math.abs(cariTotal - Math.max(0, outstanding)) > 0.01) {
    throw new PosValidationError("Cari odeme tutari kalan borc ile eslesmelidir.");
  }

  if (changeAmount > 0 && !input.payments.some((payment) => payment.method === "nakit")) {
    throw new PosValidationError("Para üstü yalnızca nakit ödeme ile hesaplanabilir.");
  }

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const saleCode = `SAT-${Date.now()}`;
    const customerCode = input.customerCode?.trim() ? input.customerCode : undefined;
    let customerName = input.customerName?.trim() || customerCode;
    let customerPhone: string | null = null;
    let customerMaturityDays = 0;
    let customerDueDateIso: string | undefined;
    let sendSaleSms = false;

    if (customerCode) {
      const smsSettings = await readSmsSettings(tx, input.tenantId);
      sendSaleSms = smsSettings.saleNotificationEnabled;

      const customer = await tx.customers.findFirst({
        where: {
          tenantId: input.tenantId,
          code: customerCode,
          deletedAt: null,
        },
      });
      if (!customer) {
        throw new PosValidationError("Secilen cari musteri bulunamadi.");
      }
      customerName = customer.name ?? customerName;
      const customerPayload = asRecord(customer.payload);
      customerPhone = readText(customerPayload.phone);
    }

      if (outstanding > 0) {
        if (!customerCode) {
          throw new PosValidationError("Kısmi ödeme için müşteri/cari seçimi zorunludur.");
        }

      const [snapshot, riskProfile] = await Promise.all([
        tx.balanceSnapshots.findFirst({
          where: {
            tenantId: input.tenantId,
            code: `SNAP:${customerCode}`,
            deletedAt: null,
          },
        }),
        tx.customerRiskProfiles.findFirst({
          where: {
            tenantId: input.tenantId,
            code: customerCode,
            deletedAt: null,
          },
          orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        }),
      ]);

      const snapshotPayload = asRecord(snapshot?.payload);
      const riskPayload = asRecord(riskProfile?.payload);
      const currentBalance = readNumber(snapshotPayload.balance);
      const riskLimit = readNumber(riskPayload.riskLimit);
      customerMaturityDays = Math.max(0, Math.floor(readNumber(riskPayload.maturityDays)));
      customerDueDateIso = calculateDueDateIso(now, customerMaturityDays);
      const projectedBalance = Math.round((currentBalance + Math.max(0, outstanding)) * 100) / 100;
      if (riskLimit > 0 && projectedBalance > riskLimit + 0.000001) {
        throw new PosValidationError(
          `Risk limiti asildi. Mevcut borc: ${currentBalance.toFixed(2)}, yeni borc: ${projectedBalance.toFixed(2)}, limit: ${riskLimit.toFixed(2)}`,
        );
      }
    }

    const sale = await tx.sales.create({
      data: {
        tenantId: input.tenantId,
        code: saleCode,
        name: input.registerName,
        status: "completed",
        payload: {
          registerId: input.registerId,
          branchId: input.branchId,
          warehouseId: input.warehouseId,
          customerCode,
          customerName,
          currency: input.currency ?? "TRY",
          notes: input.notes,
          grossTotal: totals.grossTotal,
          totalDiscount: totals.totalDiscount,
          totalTax: totals.totalTax,
          netTotal: totals.netTotal,
          paymentTotal: collectedTotal,
          declaredPaymentTotal: paymentTotal,
          outstanding: Math.max(0, outstanding),
          maturityDays: customerMaturityDays,
          dueDate: customerDueDateIso,
          changeAmount,
          cashierUserId: input.userId,
        },
        occurredAt: now,
      },
    });

    for (const line of totals.lines) {
      await tx.saleItems.create({
        data: {
          tenantId: input.tenantId,
          code: sale.id,
          name: line.productName,
          status: "completed",
          payload: {
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            grossAmount: line.grossAmount,
            discountAmount: line.discountAmount,
            taxableAmount: line.taxableAmount,
            taxAmount: line.taxAmount,
            netAmount: line.netAmount,
            taxRate: line.taxRate,
            warehouseId: line.warehouseId ?? input.warehouseId,
          },
          occurredAt: now,
        },
      });

      await tx.saleItemDiscounts.create({
        data: {
          tenantId: input.tenantId,
          code: sale.id,
          name: line.productName,
          status: "applied",
          payload: {
            productId: line.productId,
            amount: line.discountAmount,
          },
          occurredAt: now,
        },
      });

      await tx.saleItemTaxes.create({
        data: {
          tenantId: input.tenantId,
          code: sale.id,
          name: line.productName,
          status: "calculated",
          payload: {
            productId: line.productId,
            taxRate: line.taxRate,
            taxAmount: line.taxAmount,
          },
          occurredAt: now,
        },
      });

      await applyStockDelta({
        tx,
        tenantId: input.tenantId,
        productId: line.productId,
        warehouseId: line.warehouseId ?? input.warehouseId,
        deltaQuantity: -line.quantity,
        movementCode: "SALE_OUT",
        movementName: "POS Satış Çıkışı",
        movementPayload: {
          saleId: sale.id,
          registerId: input.registerId,
        },
        occurredAt: now,
      });
    }

    for (const payment of input.payments) {
      await tx.salePayments.create({
        data: {
          tenantId: input.tenantId,
          code: sale.id,
          name: payment.method,
          status: "completed",
          payload: {
            method: payment.method,
            amount: payment.amount,
            reference: payment.reference,
          },
          occurredAt: now,
        },
      });

      if (payment.method === "nakit") {
        await appendCashTransaction({
          tx,
          input: {
            tenantId: input.tenantId,
            cashAccountCode: `KASA:${input.registerId}`,
            cashAccountName: `Kasa ${input.registerName}`,
            movementCode: "SALE_CASH_IN",
            movementName: "POS Nakit Tahsilat",
            direction: "in",
            amount: payment.amount,
            sourceModule: "pos",
            sourceId: sale.id,
            currency: input.currency ?? "TRY",
          },
        });
      }
    }

    if (changeAmount > 0) {
      await appendCashTransaction({
        tx,
        input: {
          tenantId: input.tenantId,
          cashAccountCode: `KASA:${input.registerId}`,
          cashAccountName: `Kasa ${input.registerName}`,
          movementCode: "SALE_CHANGE_OUT",
          movementName: "POS Para Üstü",
          direction: "out",
          amount: changeAmount,
          sourceModule: "pos",
          sourceId: sale.id,
          currency: input.currency ?? "TRY",
        },
      });
    }

    if (customerCode) {
      await ensureCurrentAccount({
        tx,
        tenantId: input.tenantId,
        accountCode: customerCode,
        accountName: customerName ?? customerCode,
        accountType: "customer",
      });

      await appendCurrentAccountMovement({
        tx,
        input: {
          tenantId: input.tenantId,
          accountCode: customerCode,
          accountName: customerName ?? customerCode,
          movementCode: "SALE_DEBIT",
          movementName: "Satış Borç Kaydı",
          direction: "debit",
          amount: totals.netTotal,
          sourceModule: "pos",
          sourceId: sale.id,
          currency: input.currency ?? "TRY",
          extraPayload:
            customerDueDateIso || customerMaturityDays > 0
              ? {
                  maturityDays: customerMaturityDays,
                  dueDate: customerDueDateIso,
                  outstandingAmount: Math.max(0, outstanding),
                }
              : undefined,
        },
      });

      const settledAmount = Math.min(totals.netTotal, collectedTotal - changeAmount);
      if (settledAmount > 0) {
        await appendCurrentAccountMovement({
          tx,
          input: {
            tenantId: input.tenantId,
            accountCode: customerCode,
            accountName: customerName ?? customerCode,
            movementCode: "SALE_SETTLEMENT",
            movementName: "Satış Tahsilat Kaydı",
            direction: "credit",
            amount: settledAmount,
            sourceModule: "pos",
            sourceId: sale.id,
            currency: input.currency ?? "TRY",
          },
        });
      }
    }

    await tx.saleReceipts.create({
      data: {
        tenantId: input.tenantId,
        code: sale.id,
        name: saleCode,
        status: "printed",
        payload: {
          saleId: sale.id,
          registerId: input.registerId,
          customerName: input.customerName,
          total: totals.netTotal,
          currency: input.currency ?? "TRY",
        },
        occurredAt: now,
      },
    });

    if (customerCode && sendSaleSms) {
      await queueSaleSmsNotification(tx, {
        tenantId: input.tenantId,
        saleCode,
        customerCode,
        customerName,
        phone: customerPhone,
        netTotal: totals.netTotal,
        outstanding: Math.max(0, outstanding),
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        module: "pos",
        entityName: "sales",
        entityId: sale.id,
        action: "sale.completed",
        payload: {
          registerId: input.registerId,
          total: totals.netTotal,
          itemCount: input.items.length,
        },
      },
    });

    return {
      saleId: sale.id,
      saleCode,
      netTotal: totals.netTotal,
      paidTotal: collectedTotal,
      declaredPaymentTotal: paymentTotal,
      outstanding: Math.max(0, outstanding),
      changeAmount,
    };
  });
}

export async function createPosReturn(input: CreatePosReturnInput) {
  if (input.items.length === 0) {
    throw new PosValidationError("İade için en az bir ürün satırı gereklidir.");
  }

  for (const line of input.items) {
    ensurePositiveAmount(line.quantity, "İade miktarı");
    ensurePositiveAmount(line.unitPrice, "İade birim fiyatı");
  }

  const totals = calculateSaleTotals(input.items);
  const refundTotal = sumPayments(input.refundPayments);

  if (Math.abs(refundTotal - totals.netTotal) > 0.01) {
    throw new PosValidationError("İade ödeme toplamı ürün iade toplamı ile eşleşmelidir.");
  }

  return prisma.$transaction(async (tx) => {
    const originalSale = await tx.sales.findFirst({
      where: {
        id: input.originalSaleId,
        tenantId: input.tenantId,
        deletedAt: null,
        status: "completed",
      },
    });
    if (!originalSale) {
      throw new PosValidationError("İade için referans satış fişi bulunamadı.");
    }

    const originalSalePayload = asRecord(originalSale.payload);
    const originalCustomerCode = readText(originalSalePayload.customerCode);
    const originalCustomerName = readText(originalSalePayload.customerName);
    const defaultWarehouseId = readText(originalSalePayload.warehouseId);
    const originalNetTotal = readNumber(originalSalePayload.netTotal);

    if (input.customerCode && originalCustomerCode && input.customerCode !== originalCustomerCode) {
      throw new PosValidationError("İade müşterisi, satış fişindeki müşteri ile uyuşmuyor.");
    }

    const resolvedCustomerCode = input.customerCode || originalCustomerCode || undefined;
    const resolvedCustomerName = input.customerName || originalCustomerName || resolvedCustomerCode;

    const originalSaleItems = await tx.saleItems.findMany({
      where: {
        tenantId: input.tenantId,
        code: originalSale.id,
        deletedAt: null,
        status: "completed",
      },
    });
    if (originalSaleItems.length === 0) {
      throw new PosValidationError("Satış fişine ait iade edilebilir ürün satırı bulunamadı.");
    }

    const soldByProduct = new Map<string, number>();
    for (const row of originalSaleItems) {
      const payload = asRecord(row.payload);
      const productId = readText(payload.productId);
      if (!productId) {
        continue;
      }
      const quantity = readNumber(payload.quantity);
      soldByProduct.set(productId, (soldByProduct.get(productId) ?? 0) + quantity);
    }

    const previousReturns = await tx.salesReturns.findMany({
      where: {
        tenantId: input.tenantId,
        deletedAt: null,
        status: "completed",
        payload: {
          path: ["originalSaleId"],
          equals: input.originalSaleId,
        },
      },
      select: {
        id: true,
        payload: true,
      },
    });
    const previousReturnIds = previousReturns.map((row) => row.id);
    const previousRefundTotal = previousReturns.reduce((sum, row) => {
      const payload = asRecord(row.payload);
      return sum + readNumber(payload.totalRefund);
    }, 0);

    const refundableTotal = Math.max(0, originalNetTotal - previousRefundTotal);
    if (totals.netTotal > refundableTotal + 0.01) {
      throw new PosValidationError(
        `İade tutarı satış fişi kalan iade tutarını aşıyor. Kalan: ${refundableTotal.toFixed(2)}`,
      );
    }

    const returnedByProduct = new Map<string, number>();
    if (previousReturnIds.length > 0) {
      const previousReturnItems = await tx.salesReturnItems.findMany({
        where: {
          tenantId: input.tenantId,
          deletedAt: null,
          status: "completed",
          code: { in: previousReturnIds },
        },
      });

      for (const row of previousReturnItems) {
        const payload = asRecord(row.payload);
        const productId = readText(payload.productId);
        if (!productId) {
          continue;
        }
        const quantity = readNumber(payload.quantity);
        returnedByProduct.set(productId, (returnedByProduct.get(productId) ?? 0) + quantity);
      }
    }

    const requestedByProduct = new Map<string, number>();
    for (const row of input.items) {
      requestedByProduct.set(row.productId, (requestedByProduct.get(row.productId) ?? 0) + row.quantity);
    }

    for (const [productId, requestedQuantity] of requestedByProduct.entries()) {
      const soldQuantity = soldByProduct.get(productId) ?? 0;
      if (soldQuantity <= 0) {
        throw new PosValidationError("İade satırlarından biri satış fişinde bulunamadı.");
      }

      const returnedQuantity = returnedByProduct.get(productId) ?? 0;
      const remainingQuantity = Math.max(0, soldQuantity - returnedQuantity);
      if (requestedQuantity > remainingQuantity + 0.000001) {
        throw new PosValidationError(
          `${productId} için iade miktarı kalan miktarı aşıyor. Kalan: ${remainingQuantity.toFixed(2)}`,
        );
      }
    }

    const now = new Date();
    const returnCode = `IADE-${Date.now()}`;

    const returnRecord = await tx.salesReturns.create({
      data: {
        tenantId: input.tenantId,
        code: returnCode,
        name: input.registerName,
        status: "completed",
        payload: {
          originalSaleId: input.originalSaleId,
          originalSaleCode: originalSale.code,
          reason: input.reason,
          customerCode: resolvedCustomerCode,
          customerName: resolvedCustomerName,
          totalRefund: totals.netTotal,
          currency: input.currency ?? "TRY",
        },
        occurredAt: now,
      },
    });

    for (const line of totals.lines) {
      await tx.salesReturnItems.create({
        data: {
          tenantId: input.tenantId,
          code: returnRecord.id,
          name: line.productName,
          status: "completed",
          payload: {
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            netAmount: line.netAmount,
            warehouseId: (line.warehouseId ?? defaultWarehouseId) || undefined,
          },
          occurredAt: now,
        },
      });

      await applyStockDelta({
        tx,
        tenantId: input.tenantId,
        productId: line.productId,
        warehouseId: (line.warehouseId ?? defaultWarehouseId) || undefined,
        deltaQuantity: line.quantity,
        movementCode: "RETURN_IN",
        movementName: "POS İade Girişi",
        movementPayload: {
          returnId: returnRecord.id,
          originalSaleId: input.originalSaleId,
        },
        occurredAt: now,
      });
    }

    for (const refund of input.refundPayments) {
      await tx.refundTransactions.create({
        data: {
          tenantId: input.tenantId,
          code: returnRecord.id,
          name: refund.method,
          status: "completed",
          payload: {
            method: refund.method,
            amount: refund.amount,
            reference: refund.reference,
          },
          occurredAt: now,
        },
      });

      if (refund.method === "nakit") {
        await appendCashTransaction({
          tx,
          input: {
            tenantId: input.tenantId,
            cashAccountCode: `KASA:${input.registerId}`,
            cashAccountName: `Kasa ${input.registerName}`,
            movementCode: "RETURN_CASH_OUT",
            movementName: "POS İade Nakit Çıkış",
            direction: "out",
            amount: refund.amount,
            sourceModule: "pos_return",
            sourceId: returnRecord.id,
            currency: input.currency ?? "TRY",
          },
        });
      }
    }

    if (resolvedCustomerCode) {
      await appendCurrentAccountMovement({
        tx,
        input: {
          tenantId: input.tenantId,
          accountCode: resolvedCustomerCode,
          accountName: resolvedCustomerName ?? resolvedCustomerCode,
          movementCode: "RETURN_CREDIT",
          movementName: "Satış İade Alacak Kaydı",
          direction: "credit",
          amount: totals.netTotal,
          sourceModule: "pos_return",
          sourceId: returnRecord.id,
          currency: input.currency ?? "TRY",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        module: "pos",
        entityName: "sales_returns",
        entityId: returnRecord.id,
        action: "sale.returned",
        payload: {
          originalSaleId: input.originalSaleId,
          totalRefund: totals.netTotal,
        },
      },
    });

    return {
      returnId: returnRecord.id,
      returnCode,
      refundTotal: totals.netTotal,
    };
  });
}
