import { prisma } from "@/lib/db/prisma";
import { ensureCurrentAccount } from "@/modules/accounting/application/current-account-service";

export type CustomerCreateInput = {
  tenantId: string;
  userId: string;
  name: string;
  code?: string;
  taxNumber?: string;
  identityNumber?: string;
  email?: string;
  phone?: string;
  riskLimit?: number;
  maturityDays?: number;
  group?: string;
  subgroup?: string;
  notes?: string;
};

export async function listCustomers(params: {
  tenantId: string;
  search?: string;
  limit: number;
}) {
  const take = Math.min(Math.max(params.limit ?? 100, 1), 250);
  const search = params.search?.trim();

  return prisma.customers.findMany({
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

export async function createCustomer(input: CustomerCreateInput) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const code = input.code ?? `MUS-${Date.now()}`;

    const customer = await tx.customers.create({
      data: {
        tenantId: input.tenantId,
        code,
        name: input.name,
        status: "active",
        payload: {
          taxNumber: input.taxNumber,
          identityNumber: input.identityNumber,
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

    await tx.customerRiskProfiles.create({
      data: {
        tenantId: input.tenantId,
        code,
        name: input.name,
        status: "active",
        payload: {
          customerId: customer.id,
          riskLimit: input.riskLimit ?? 0,
          maturityDays: input.maturityDays ?? 0,
        },
        occurredAt: now,
      },
    });

    await tx.customerBalances.create({
      data: {
        tenantId: input.tenantId,
        code,
        name: input.name,
        status: "active",
        payload: {
          customerId: customer.id,
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
      accountType: "customer",
    });

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        module: "customer",
        entityName: "customers",
        entityId: customer.id,
        action: "customer.created",
        payload: {
          code,
          name: input.name,
        },
      },
    });

    return customer;
  });
}
