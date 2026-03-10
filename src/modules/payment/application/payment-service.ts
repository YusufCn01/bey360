import type { Prisma } from "@prisma/client";
import type { PaymentStatus } from "@/modules/payment/domain/provider";
import { prisma } from "@/lib/db/prisma";
import { asRecord, numberOrZero } from "@/lib/json";
import { appendCashTransaction } from "@/modules/accounting/application/cash-service";
import { appendCurrentAccountMovement } from "@/modules/accounting/application/current-account-service";
import { getPaymentProvider } from "@/modules/payment/providers/registry";

type CreatePaymentLinkInput = {
  tenantId: string;
  userId: string;
  providerCode: string;
  amount: number;
  currency: string;
  customerReference: string;
  customerCode?: string;
  customerName?: string;
  description: string;
  expiresAt?: string;
  successUrl?: string;
  cancelUrl?: string;
};

type ProcessPaymentStatusInput = {
  tenantId: string;
  providerCode: string;
  providerReference: string;
  status: PaymentStatus;
  rawPayload: unknown;
  source: "webhook" | "simulation";
};

export async function createPaymentLink(params: CreatePaymentLinkInput) {
  if (params.amount <= 0) {
    throw new Error("Ödeme tutarı sıfırdan büyük olmalıdır.");
  }

  const provider = getPaymentProvider(params.providerCode);
  const result = await provider.createPaymentLink({
    tenantId: params.tenantId,
    amount: params.amount,
    currency: params.currency,
    customerReference: params.customerReference,
    description: params.description,
    successUrl: params.successUrl ?? "https://example.com/success",
    cancelUrl: params.cancelUrl ?? "https://example.com/cancel",
  });

  const now = new Date();
  const created = await prisma.$transaction(async (tx) => {
    const paymentLink = await tx.paymentLinks.create({
      data: {
        tenantId: params.tenantId,
        code: result.providerReference,
        name: params.customerReference,
        status: "pending",
        payload: {
          amount: params.amount,
          currency: params.currency,
          url: result.url,
          providerCode: params.providerCode,
          customerReference: params.customerReference,
          customerCode: params.customerCode,
          customerName: params.customerName,
          description: params.description,
          createdBy: params.userId,
          expiresAt: params.expiresAt,
        },
        occurredAt: now,
      },
    });

    await tx.paymentLinkEvents.create({
      data: {
        tenantId: params.tenantId,
        code: paymentLink.id,
        name: "payment_link.created",
        status: "pending",
        payload: {
          providerReference: result.providerReference,
          amount: params.amount,
          currency: params.currency,
        },
        occurredAt: now,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        module: "payment",
        entityName: "payment_links",
        entityId: paymentLink.id,
        action: "payment.link.created",
        payload: {
          providerCode: params.providerCode,
          providerReference: result.providerReference,
          amount: params.amount,
          currency: params.currency,
        },
      },
    });

    return paymentLink;
  });

  return {
    id: created.id,
    providerReference: result.providerReference,
    url: result.url,
    status: created.status,
  };
}

export async function listPaymentLinks(params: {
  tenantId: string;
  status?: string;
  search?: string;
  limit: number;
}) {
  const take = Math.min(Math.max(params.limit ?? 100, 1), 250);
  const search = params.search?.trim() ?? "";

  return prisma.paymentLinks.findMany({
    where: {
      tenantId: params.tenantId,
      deletedAt: null,
      status: params.status ?? undefined,
      OR: search
        ? [
            { code: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getPaymentLinkByReference(params: {
  tenantId: string;
  reference: string;
}) {
  return prisma.paymentLinks.findFirst({
    where: {
      tenantId: params.tenantId,
      code: params.reference,
      deletedAt: null,
    },
  });
}

export async function getPublicPaymentLink(reference: string) {
  return prisma.paymentLinks.findFirst({
    where: {
      code: reference,
      deletedAt: null,
    },
  });
}

export async function processPaymentStatusUpdate(input: ProcessPaymentStatusInput) {
  return prisma.$transaction(async (tx) => {
    const paymentLink = await tx.paymentLinks.findFirst({
      where: {
        tenantId: input.tenantId,
        code: input.providerReference,
        deletedAt: null,
      },
    });

    const safeRawPayload = asRecord(input.rawPayload);

    if (!paymentLink) {
      await tx.paymentWebhookLogs.create({
        data: {
          tenantId: input.tenantId,
          code: input.providerReference,
          name: input.providerCode,
          status: "not_found",
          payload: {
            source: input.source,
            status: input.status,
            rawPayload: safeRawPayload,
          } as Prisma.InputJsonValue,
          occurredAt: new Date(),
        },
      });

      return {
        processed: false,
        reason: "PAYMENT_LINK_NOT_FOUND",
      };
    }

    const payload = asRecord(paymentLink.payload);
    const amount = numberOrZero(payload.amount);
    const currency = typeof payload.currency === "string" ? payload.currency : "TRY";
    const customerCode = typeof payload.customerCode === "string" ? payload.customerCode : undefined;
    const customerName = typeof payload.customerName === "string" ? payload.customerName : undefined;
    const now = new Date();

    const alreadyProcessed = await tx.paymentTransactions.findFirst({
      where: {
        tenantId: input.tenantId,
        code: input.providerReference,
        status: input.status,
        deletedAt: null,
      },
    });

    if (alreadyProcessed) {
      return {
        processed: true,
        paymentLinkId: paymentLink.id,
        status: input.status,
        duplicate: true,
      };
    }

    await tx.paymentTransactions.create({
      data: {
        tenantId: input.tenantId,
        code: input.providerReference,
        name: input.providerCode,
        status: input.status,
        payload: {
          paymentLinkId: paymentLink.id,
          amount,
          currency,
          source: input.source,
          rawPayload: safeRawPayload,
        } as Prisma.InputJsonValue,
        occurredAt: now,
      },
    });

    await tx.paymentLinkEvents.create({
      data: {
        tenantId: input.tenantId,
        code: paymentLink.id,
        name: `payment_link.${input.status}`,
        status: input.status,
        payload: {
          providerReference: input.providerReference,
          source: input.source,
          rawPayload: safeRawPayload,
        } as Prisma.InputJsonValue,
        occurredAt: now,
      },
    });

    await tx.paymentWebhookLogs.create({
      data: {
        tenantId: input.tenantId,
        code: input.providerReference,
        name: input.providerCode,
        status: input.status,
        payload: {
          paymentLinkId: paymentLink.id,
          source: input.source,
          rawPayload: safeRawPayload,
        } as Prisma.InputJsonValue,
        occurredAt: now,
      },
    });

    await tx.paymentLinks.update({
      where: { id: paymentLink.id },
      data: {
        status: input.status,
        payload: {
          ...payload,
          lastStatus: input.status,
          lastStatusAt: now.toISOString(),
          rawPayload: safeRawPayload,
        } as Prisma.InputJsonValue,
        occurredAt: now,
      },
    });

    if (input.status === "succeeded") {
      await appendCashTransaction({
        tx,
        input: {
          tenantId: input.tenantId,
          cashAccountCode: "KASA:ONLINE",
          cashAccountName: "Online Tahsilat",
          movementCode: "PAYMENT_LINK_IN",
          movementName: "Ödeme Linki Tahsilatı",
          direction: "in",
          amount,
          sourceModule: "payment_link",
          sourceId: paymentLink.id,
          currency,
        },
      });

      if (customerCode) {
        await appendCurrentAccountMovement({
          tx,
          input: {
            tenantId: input.tenantId,
            accountCode: customerCode,
            accountName: customerName ?? customerCode,
            movementCode: "PAYMENT_LINK_CREDIT",
            movementName: "Ödeme Linki Cari Tahsilat",
            direction: "credit",
            amount,
            sourceModule: "payment_link",
            sourceId: paymentLink.id,
            currency,
          },
        });
      }
    }

    if (input.status === "refunded" || input.status === "partial_refunded") {
      await appendCashTransaction({
        tx,
        input: {
          tenantId: input.tenantId,
          cashAccountCode: "KASA:ONLINE",
          cashAccountName: "Online Tahsilat",
          movementCode: "PAYMENT_LINK_REFUND_OUT",
          movementName: "Ödeme Linki İade Çıkışı",
          direction: "out",
          amount,
          sourceModule: "payment_link",
          sourceId: paymentLink.id,
          currency,
        },
      });

      if (customerCode) {
        await appendCurrentAccountMovement({
          tx,
          input: {
            tenantId: input.tenantId,
            accountCode: customerCode,
            accountName: customerName ?? customerCode,
            movementCode: "PAYMENT_LINK_REFUND_DEBIT",
            movementName: "Ödeme Linki Cari İade",
            direction: "debit",
            amount,
            sourceModule: "payment_link",
            sourceId: paymentLink.id,
            currency,
          },
        });
      }
    }

    return {
      processed: true,
      paymentLinkId: paymentLink.id,
      status: input.status,
      duplicate: false,
    };
  });
}

export async function simulatePaymentStatus(params: {
  tenantId: string;
  reference: string;
  status: PaymentStatus;
}) {
  return processPaymentStatusUpdate({
    tenantId: params.tenantId,
    providerCode: "mock-payment",
    providerReference: params.reference,
    status: params.status,
    rawPayload: {
      simulated: true,
      status: params.status,
    },
    source: "simulation",
  });
}
