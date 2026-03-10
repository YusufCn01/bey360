import { prisma } from "@/lib/db/prisma";
import { ensureCurrentAccount } from "@/modules/accounting/application/current-account-service";

export type SupplierCreateInput = {
  tenantId: string;
  userId: string;
  name: string;
  code?: string;
  taxNumber?: string;
  email?: string;
  phone?: string;
  riskLimit?: number;
  maturityDays?: number;
  group?: string;
  subgroup?: string;
  notes?: string;
};

export async function listSuppliers(params: {
  tenantId: string;
  search?: string;
  limit: number;
}) {
  const take = Math.min(Math.max(params.limit ?? 100, 1), 250);
  const search = params.search?.trim();

  return prisma.suppliers.findMany({
    where: {
      tenantId: params.tenantId,
      deletedAt: null,
      OR: search
        ? [
            { name: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function createSupplier(input: SupplierCreateInput) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const code = input.code ?? `TED-${Date.now()}`;

    const supplier = await tx.suppliers.create({
      data: {
        tenantId: input.tenantId,
        code,
        name: input.name,
        status: "active",
        payload: {
          taxNumber: input.taxNumber,
          email: input.email,
          phone: input.phone,
          group: input.group,
          subgroup: input.subgroup,
          notes: input.notes,
          maturityDays: input.maturityDays ?? 0,
        },
        occurredAt: now,
      },
    });

    await tx.supplierLimits.create({
      data: {
        tenantId: input.tenantId,
        code,
        name: input.name,
        status: "active",
        payload: {
          supplierId: supplier.id,
          riskLimit: input.riskLimit ?? 0,
          maturityDays: input.maturityDays ?? 0,
        },
        occurredAt: now,
      },
    });

    await tx.supplierBalances.create({
      data: {
        tenantId: input.tenantId,
        code,
        name: input.name,
        status: "active",
        payload: {
          supplierId: supplier.id,
          balance: 0,
          currency: "TRY",
        },
        occurredAt: now,
      },
    });

    await ensureCurrentAccount({
      tx,
      tenantId: input.tenantId,
      accountCode: code,
      accountName: input.name,
      accountType: "supplier",
    });

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        module: "supplier",
        entityName: "suppliers",
        entityId: supplier.id,
        action: "supplier.created",
        payload: {
          code,
          name: input.name,
        },
      },
    });

    return supplier;
  });
}
