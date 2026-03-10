import type { Prisma } from "@prisma/client";
import type { EInvoiceLifecycleState, EInvoiceScenario } from "@/modules/einvoice/domain/provider";
import { prisma } from "@/lib/db/prisma";
import { asRecord, numberOrZero } from "@/lib/json";
import { getEInvoiceOutboundQueue } from "@/lib/queue/queues";
import { getEInvoiceProvider } from "@/modules/einvoice/providers/registry";

const terminalStates = new Set<EInvoiceLifecycleState>(["sent", "delivered", "accepted", "archived"]);

type ApplyEInvoiceStatusInput = {
  tenantId: string;
  providerCode: string;
  status: EInvoiceLifecycleState;
  source: "sync" | "webhook";
  providerReference?: string;
  documentId?: string;
  rawPayload: unknown;
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function resolveScenario(value: unknown): EInvoiceScenario {
  if (value === "TEMELFATURA" || value === "TICARIFATURA") {
    return value;
  }

  return "EARSIV";
}

function resolveProviderCode(payload: Record<string, unknown>, fallbackProviderCode?: string): string {
  return fallbackProviderCode ?? asString(payload.providerCode) ?? "mock-einvoice";
}

export async function listEInvoiceDocuments(params: {
  tenantId: string;
  status?: string;
  search?: string;
  limit?: number;
}) {
  const take = Math.min(Math.max(params.limit ?? 100, 1), 250);
  const search = params.search?.trim() ?? "";

  const rows = await prisma.eInvoiceDocuments.findMany({
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
    orderBy: [{ createdAt: "desc" }],
    take,
  });

  return rows.map((row) => {
    const payload = asRecord(row.payload);

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      status: row.status,
      scenario: asString(payload.scenario) ?? "EARSIV",
      profile: asString(payload.profile) ?? "EARSIV",
      total: numberOrZero(payload.total),
      currency: asString(payload.currency) ?? "TRY",
      providerCode: resolveProviderCode(payload),
      providerReference: row.externalId ?? asString(payload.providerReference) ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });
}

export async function enqueueEInvoiceDocument(params: {
  tenantId: string;
  documentId: string;
  providerCode?: string;
}) {
  const document = await prisma.eInvoiceDocuments.findFirst({
    where: {
      id: params.documentId,
      tenantId: params.tenantId,
      deletedAt: null,
    },
  });

  if (!document) {
    throw new Error("e-Fatura belgesi bulunamadı.");
  }

  const payload = asRecord(document.payload);
  const providerCode = resolveProviderCode(payload, params.providerCode);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.eInvoiceDocuments.update({
      where: {
        id: document.id,
      },
      data: {
        status: "queued",
        payload: {
          ...payload,
          providerCode,
          queuedAt: now.toISOString(),
        } as Prisma.InputJsonValue,
        occurredAt: now,
      },
    });

    await tx.outboundDocumentQueues.create({
      data: {
        tenantId: params.tenantId,
        code: document.id,
        name: providerCode,
        status: "queued",
        payload: {
          documentId: document.id,
          providerCode,
        } as Prisma.InputJsonValue,
        occurredAt: now,
      },
    });

    await tx.eInvoiceSendAttempts.create({
      data: {
        tenantId: params.tenantId,
        code: document.id,
        name: providerCode,
        status: "queued",
        payload: {
          documentId: document.id,
          providerCode,
        } as Prisma.InputJsonValue,
        occurredAt: now,
      },
    });

    await tx.eInvoiceStatusLogs.create({
      data: {
        tenantId: params.tenantId,
        code: document.id,
        name: providerCode,
        status: "queued",
        payload: {
          documentId: document.id,
        } as Prisma.InputJsonValue,
        occurredAt: now,
      },
    });
  });

  const queue = getEInvoiceOutboundQueue();
  await queue.add(
    "send-einvoice",
    {
      tenantId: params.tenantId,
      documentId: document.id,
      providerCode,
      idempotencyKey: `einvoice:${params.tenantId}:${document.id}`,
    },
    {
      jobId: `einvoice:${params.tenantId}:${document.id}`,
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );

  return {
    documentId: document.id,
    providerCode,
    status: "queued" as EInvoiceLifecycleState,
  };
}

export async function sendEInvoiceDocument(params: {
  tenantId: string;
  providerCode?: string;
  documentId: string;
}) {
  const document = await prisma.eInvoiceDocuments.findFirst({
    where: {
      id: params.documentId,
      tenantId: params.tenantId,
      deletedAt: null,
    },
  });

  if (!document) {
    throw new Error("e-Fatura belgesi bulunamadı.");
  }

  const payload = asRecord(document.payload);
  const providerCode = resolveProviderCode(payload, params.providerCode);
  const existingProviderReference = document.externalId ?? asString(payload.providerReference);

  if (existingProviderReference && terminalStates.has(document.status as EInvoiceLifecycleState)) {
    return existingProviderReference;
  }

  const provider = getEInvoiceProvider(providerCode);
  const scenario = resolveScenario(payload.scenario);
  const receiverTaxId = asString(payload.receiverTaxId) ?? asString(payload.customerTaxId) ?? "11111111111";
  const amount = numberOrZero(payload.total) > 0 ? numberOrZero(payload.total) : 100;
  const currency = asString(payload.currency) ?? "TRY";
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.eInvoiceDocuments.update({
      where: {
        id: document.id,
      },
      data: {
        status: "sending",
        payload: {
          ...payload,
          providerCode,
          sendingAt: now.toISOString(),
        } as Prisma.InputJsonValue,
        occurredAt: now,
      },
    });

    await tx.eInvoiceSendAttempts.create({
      data: {
        tenantId: params.tenantId,
        code: document.id,
        name: providerCode,
        status: "sending",
        payload: {
          documentId: document.id,
        } as Prisma.InputJsonValue,
        occurredAt: now,
      },
    });
  });

  try {
    await provider.authenticate();
    const recipient = await provider.checkRecipient({ taxId: receiverTaxId });

    const draft = await provider.createDraft({
      tenantId: params.tenantId,
      documentId: document.id,
      scenario,
      receiverTaxId,
      amount,
      currency,
    });

    const sent = await provider.sendDocument({ providerDraftId: draft.providerDraftId });
    const completedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.eInvoiceDocuments.update({
        where: {
          id: document.id,
        },
        data: {
          status: "sent",
          externalId: sent.providerReference,
          payload: {
            ...payload,
            providerCode,
            providerReference: sent.providerReference,
            providerAlias: recipient.alias,
            receiverTaxId,
            scenario,
            lastSentAt: completedAt.toISOString(),
          } as Prisma.InputJsonValue,
          occurredAt: completedAt,
        },
      });

      await tx.eInvoiceSendAttempts.create({
        data: {
          tenantId: params.tenantId,
          code: document.id,
          name: providerCode,
          status: "sent",
          payload: {
            providerReference: sent.providerReference,
            providerAlias: recipient.alias,
          } as Prisma.InputJsonValue,
          occurredAt: completedAt,
        },
      });

      await tx.eInvoiceStatusLogs.create({
        data: {
          tenantId: params.tenantId,
          code: document.id,
          name: providerCode,
          status: "sent",
          payload: {
            providerReference: sent.providerReference,
            providerAlias: recipient.alias,
          } as Prisma.InputJsonValue,
          occurredAt: completedAt,
        },
      });
    });

    return sent.providerReference;
  } catch (error) {
    const failedAt = new Date();
    const message = error instanceof Error ? error.message : "Bilinmeyen gonderim hatasi";

    await prisma.$transaction(async (tx) => {
      await tx.eInvoiceDocuments.update({
        where: {
          id: document.id,
        },
        data: {
          status: "failed",
          payload: {
            ...payload,
            providerCode,
            lastError: message,
            failedAt: failedAt.toISOString(),
          } as Prisma.InputJsonValue,
          occurredAt: failedAt,
        },
      });

      await tx.eInvoiceSendAttempts.create({
        data: {
          tenantId: params.tenantId,
          code: document.id,
          name: providerCode,
          status: "failed",
          payload: {
            error: message,
          } as Prisma.InputJsonValue,
          occurredAt: failedAt,
        },
      });

      await tx.eInvoiceStatusLogs.create({
        data: {
          tenantId: params.tenantId,
          code: document.id,
          name: providerCode,
          status: "failed",
          payload: {
            error: message,
          } as Prisma.InputJsonValue,
          occurredAt: failedAt,
        },
      });
    });

    throw error;
  }
}

export async function applyEInvoiceProviderStatus(input: ApplyEInvoiceStatusInput) {
  const now = new Date();
  const safeRawPayload = asRecord(input.rawPayload);

  return prisma.$transaction(async (tx) => {
    let document = null as { id: string; externalId: string | null; payload: Prisma.JsonValue | null } | null;

    if (input.documentId) {
      document = await tx.eInvoiceDocuments.findFirst({
        where: {
          id: input.documentId,
          tenantId: input.tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
          externalId: true,
          payload: true,
        },
      });
    }

    if (!document && input.providerReference) {
      document = await tx.eInvoiceDocuments.findFirst({
        where: {
          tenantId: input.tenantId,
          externalId: input.providerReference,
          deletedAt: null,
        },
        select: {
          id: true,
          externalId: true,
          payload: true,
        },
      });
    }

    if (document) {
      const existingPayload = asRecord(document.payload);
      await tx.eInvoiceDocuments.update({
        where: {
          id: document.id,
        },
        data: {
          status: input.status,
          externalId: input.providerReference ?? document.externalId,
          payload: {
            ...existingPayload,
            providerCode: input.providerCode,
            providerReference: input.providerReference ?? document.externalId,
            lastStatus: input.status,
            lastStatusSource: input.source,
            lastStatusAt: now.toISOString(),
            lastProviderPayload: safeRawPayload,
          } as Prisma.InputJsonValue,
          occurredAt: now,
        },
      });
    }

    await tx.eInvoiceStatusLogs.create({
      data: {
        tenantId: input.tenantId,
        code: document?.id ?? input.providerReference ?? "unknown",
        name: input.providerCode,
        status: input.status,
        payload: {
          source: input.source,
          documentId: document?.id ?? null,
          providerReference: input.providerReference ?? document?.externalId ?? null,
          rawPayload: safeRawPayload,
        } as Prisma.InputJsonValue,
        occurredAt: now,
      },
    });

    return {
      documentId: document?.id ?? null,
      status: input.status,
    };
  });
}

export async function syncEInvoiceStatus(params: {
  tenantId: string;
  providerCode: string;
  providerReference: string;
  documentId?: string;
}): Promise<EInvoiceLifecycleState> {
  const provider = getEInvoiceProvider(params.providerCode);
  const status = await provider.getDocumentStatus({ providerReference: params.providerReference });

  await applyEInvoiceProviderStatus({
    tenantId: params.tenantId,
    providerCode: params.providerCode,
    providerReference: params.providerReference,
    documentId: params.documentId,
    status: status.status,
    rawPayload: status.rawPayload,
    source: "sync",
  });

  return status.status;
}

export async function syncEInvoiceDocumentStatus(params: {
  tenantId: string;
  documentId: string;
  providerCode?: string;
}) {
  const document = await prisma.eInvoiceDocuments.findFirst({
    where: {
      id: params.documentId,
      tenantId: params.tenantId,
      deletedAt: null,
    },
  });

  if (!document) {
    throw new Error("e-Fatura belgesi bulunamadı.");
  }

  const payload = asRecord(document.payload);
  const providerReference = document.externalId ?? asString(payload.providerReference);
  if (!providerReference) {
    throw new Error("Belge için provider referansı bulunamadı.");
  }

  const providerCode = resolveProviderCode(payload, params.providerCode);
  const status = await syncEInvoiceStatus({
    tenantId: params.tenantId,
    providerCode,
    providerReference,
    documentId: document.id,
  });

  return {
    documentId: document.id,
    providerReference,
    status,
  };
}
