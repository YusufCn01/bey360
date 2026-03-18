import { prisma } from "@/lib/db/prisma";
import { asRecord, numberOrZero } from "@/lib/json";
import { recordCustomerCollection } from "@/modules/finance/application/finance-service";

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

type UpdateInvoiceInput = CreateInvoiceInput & {
  invoiceId: string;
};

type CancelInvoiceInput = {
  tenantId: string;
  userId: string;
  invoiceId: string;
  reason?: string;
};

type RegisterInvoiceCollectionInput = {
  tenantId: string;
  userId: string;
  invoiceId: string;
  amount: number;
  method: "nakit" | "kart" | "havale_eft" | "cek" | "dekont";
  note?: string;
  currency?: string;
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function buildTotals(lines: InvoiceLineInput[]) {
  return lines.map((line) => {
    const gross = roundCurrency(line.quantity * line.unitPrice);
    const taxRate = line.taxRate ?? 20;
    const taxAmount = roundCurrency((gross * taxRate) / 100);
    const net = roundCurrency(gross + taxAmount);
    return { ...line, gross, taxRate, taxAmount, net };
  });
}

async function resolveInvoiceWithItems(tenantId: string, invoiceId: string) {
  const invoice = await prisma.invoices.findFirst({
    where: {
      id: invoiceId,
      tenantId,
      deletedAt: null,
    },
  });

  if (!invoice) {
    throw new Error("Fatura bulunamadı.");
  }

  const [items, eDocument, collections] = await Promise.all([
    prisma.invoiceItems.findMany({
      where: {
        tenantId,
        code: invoice.id,
        deletedAt: null,
      },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.eInvoiceDocuments.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        payload: {
          path: ["invoiceId"],
          equals: invoice.id,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.collections.findMany({
      where: {
        tenantId,
        deletedAt: null,
        payload: {
          path: ["sourceId"],
          equals: invoice.id,
        },
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return { invoice, items, eDocument, collections };
}

function normalizeInvoicePayload(payload: Record<string, unknown>, netTotal: number) {
  const collectedAmount = numberOrZero(payload.collectedAmount);
  const outstandingAmount = roundCurrency(Math.max(0, netTotal - collectedAmount));
  return {
    ...payload,
    netTotal,
    collectedAmount,
    outstandingAmount,
    paymentStatus: outstandingAmount <= 0 ? "paid" : collectedAmount > 0 ? "partial" : "open",
  };
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
    const totals = buildTotals(input.lines);
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
          collectedAmount: 0,
          outstandingAmount: netTotal,
          paymentStatus: "open",
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

export async function getSalesInvoiceDetail(tenantId: string, invoiceId: string) {
  const { invoice, items, eDocument, collections } = await resolveInvoiceWithItems(tenantId, invoiceId);
  const payload = asRecord(invoice.payload);
  const currency = String(payload.currency ?? "TRY");
  const netTotal = numberOrZero(payload.netTotal);
  const collectedAmount = collections.reduce((sum, row) => sum + numberOrZero(asRecord(row.payload).amount), 0);
  const outstandingAmount = roundCurrency(Math.max(0, netTotal - collectedAmount));

  return {
    id: invoice.id,
    code: invoice.code,
    customerCode: String(payload.customerCode ?? ""),
    customerName: String(payload.customerName ?? invoice.name ?? ""),
    invoiceType: String(payload.invoiceType ?? "satis"),
    scenario: String(payload.scenario ?? "EARSIV"),
    profile: String(payload.profile ?? "EARSIV"),
    currency,
    notes: typeof payload.notes === "string" ? payload.notes : "",
    status: invoice.status,
    occurredAt: invoice.occurredAt?.toISOString() ?? null,
    netTotal,
    collectedAmount,
    outstandingAmount,
    paymentStatus: outstandingAmount <= 0 ? "paid" : collectedAmount > 0 ? "partial" : "open",
    documentId: eDocument?.id ?? null,
    eDocumentStatus: eDocument?.status ?? null,
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
    collections: collections.map((row) => {
      const collectionPayload = asRecord(row.payload);
      return {
        id: row.id,
        code: row.code,
        amount: numberOrZero(collectionPayload.amount),
        method: String(collectionPayload.method ?? "nakit"),
        occurredAt: row.occurredAt?.toISOString() ?? row.createdAt.toISOString(),
      };
    }),
  };
}

export async function updateSalesInvoice(input: UpdateInvoiceInput) {
  if (input.lines.length === 0) {
    throw new Error("Fatura satırları boş olamaz.");
  }

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoices.findFirst({
      where: {
        id: input.invoiceId,
        tenantId: input.tenantId,
        deletedAt: null,
      },
    });

    if (!invoice) {
      throw new Error("Fatura bulunamadı.");
    }

    if (invoice.status === "cancelled") {
      throw new Error("İptal edilen fatura düzenlenemez.");
    }

    const previousPayload = asRecord(invoice.payload);
    const previousCollected = numberOrZero(previousPayload.collectedAmount);
    const totals = buildTotals(input.lines);
    const netTotal = roundCurrency(totals.reduce((sum, line) => sum + line.net, 0));
    const outstandingAmount = roundCurrency(Math.max(0, netTotal - previousCollected));

    await tx.invoices.update({
      where: { id: invoice.id },
      data: {
        name: input.customerName,
        payload: {
          ...previousPayload,
          invoiceType: input.invoiceType,
          customerCode: input.customerCode,
          customerName: input.customerName,
          scenario: input.scenario ?? "EARSIV",
          profile: input.profile ?? "EARSIV",
          currency: input.currency ?? "TRY",
          notes: input.notes,
          netTotal,
          collectedAmount: previousCollected,
          outstandingAmount,
          paymentStatus: outstandingAmount <= 0 ? "paid" : previousCollected > 0 ? "partial" : "open",
          updatedBy: input.userId,
        },
      },
    });

    await tx.invoiceItems.deleteMany({
      where: {
        tenantId: input.tenantId,
        code: invoice.id,
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
          occurredAt: invoice.occurredAt ?? new Date(),
        },
      });
    }

    const eDocument = await tx.eInvoiceDocuments.findFirst({
      where: {
        tenantId: input.tenantId,
        deletedAt: null,
        payload: {
          path: ["invoiceId"],
          equals: invoice.id,
        },
      },
    });

    if (eDocument) {
      const ePayload = asRecord(eDocument.payload);
      await tx.eInvoiceDocuments.update({
        where: { id: eDocument.id },
        data: {
          name: input.customerName,
          payload: {
            ...ePayload,
            customerCode: input.customerCode,
            customerName: input.customerName,
            scenario: input.scenario ?? "EARSIV",
            profile: input.profile ?? "EARSIV",
            total: netTotal,
            currency: input.currency ?? "TRY",
          },
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        module: "invoice",
        entityName: "invoices",
        entityId: invoice.id,
        action: "invoice.updated",
        payload: {
          customerCode: input.customerCode,
          netTotal,
        },
      },
    });

    return {
      invoiceId: invoice.id,
      documentId: eDocument?.id ?? null,
      invoiceNo: invoice.code,
      netTotal,
      collectedAmount: previousCollected,
      outstandingAmount,
    };
  });
}

export async function cancelSalesInvoice(input: CancelInvoiceInput) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoices.findFirst({
      where: {
        id: input.invoiceId,
        tenantId: input.tenantId,
        deletedAt: null,
      },
    });

    if (!invoice) {
      throw new Error("Fatura bulunamadı.");
    }

    if (invoice.status === "cancelled") {
      return {
        invoiceId: invoice.id,
        invoiceNo: invoice.code,
      };
    }

    const payload = asRecord(invoice.payload);
    await tx.invoices.update({
      where: { id: invoice.id },
      data: {
        status: "cancelled",
        payload: {
          ...payload,
          cancelledBy: input.userId,
          cancelledAt: new Date().toISOString(),
          cancelReason: input.reason ?? "Kullanıcı iptali",
        },
      },
    });

    await tx.invoiceItems.updateMany({
      where: {
        tenantId: input.tenantId,
        code: invoice.id,
        deletedAt: null,
      },
      data: {
        status: "cancelled",
      },
    });

    await tx.eInvoiceDocuments.updateMany({
      where: {
        tenantId: input.tenantId,
        deletedAt: null,
        payload: {
          path: ["invoiceId"],
          equals: invoice.id,
        },
      },
      data: {
        status: "cancelled",
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        module: "invoice",
        entityName: "invoices",
        entityId: invoice.id,
        action: "invoice.cancelled",
        payload: {
          invoiceNo: invoice.code,
          reason: input.reason ?? null,
        },
      },
    });

    return {
      invoiceId: invoice.id,
      invoiceNo: invoice.code,
    };
  });
}

export async function registerSalesInvoiceCollection(input: RegisterInvoiceCollectionInput) {
  const { invoice } = await resolveInvoiceWithItems(input.tenantId, input.invoiceId);
  const payload = asRecord(invoice.payload);
  const customerCode = String(payload.customerCode ?? "");
  const customerName = String(payload.customerName ?? invoice.name ?? "");
  const netTotal = numberOrZero(payload.netTotal);
  const collectedAmount = numberOrZero(payload.collectedAmount);
  const outstandingAmount = roundCurrency(Math.max(0, netTotal - collectedAmount));

  if (!customerCode || !customerName) {
    throw new Error("Fatura cari bilgisi eksik.");
  }
  if (invoice.status === "cancelled") {
    throw new Error("İptal edilen fatura için tahsilat alınamaz.");
  }
  if (input.amount <= 0) {
    throw new Error("Tahsilat tutarı sıfırdan büyük olmalıdır.");
  }
  if (input.amount > outstandingAmount) {
    throw new Error("Tahsilat tutarı açık tutardan büyük olamaz.");
  }

  const collection = await recordCustomerCollection({
    tenantId: input.tenantId,
    userId: input.userId,
    customerCode,
    customerName,
    amount: input.amount,
    method: input.method,
    currency: input.currency ?? String(payload.currency ?? "TRY"),
    note: input.note ?? `${invoice.code} numaralı fatura tahsilatı`,
    sourceModule: "invoice",
    sourceId: invoice.id,
  });

  const nextCollected = roundCurrency(collectedAmount + input.amount);
  const nextOutstanding = roundCurrency(Math.max(0, netTotal - nextCollected));

  await prisma.invoices.update({
    where: { id: invoice.id },
    data: {
      payload: {
        ...normalizeInvoicePayload(payload, netTotal),
        collectedAmount: nextCollected,
        outstandingAmount: nextOutstanding,
        paymentStatus: nextOutstanding <= 0 ? "paid" : "partial",
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      module: "invoice",
      entityName: "invoices",
      entityId: invoice.id,
      action: "invoice.collection.recorded",
      payload: {
        invoiceNo: invoice.code,
        amount: input.amount,
        collectionId: collection.collectionId,
      },
    },
  });

  return {
    invoiceId: invoice.id,
    collectionId: collection.collectionId,
    collectedAmount: nextCollected,
    outstandingAmount: nextOutstanding,
  };
}
