import { prisma } from "@/lib/db/prisma";
import { asRecord } from "@/lib/json";

export const BACKUP_SCOPE = "daily_backup_status";

export type BackupSummary = {
  generatedAt: string;
  counts: {
    products: number;
    customers: number;
    stockBalances: number;
    sales: number;
    collections: number;
    supplierPayments: number;
  };
};

type BackupState = {
  autoEnabled: boolean;
  retentionDays: number;
  lastRunAt: string | null;
  lastCounts: BackupSummary["counts"] | null;
  history: BackupSummary[];
};

function toBackupState(payload: Record<string, unknown>): BackupState {
  const historyRaw = Array.isArray(payload.history) ? payload.history : [];
  const history: BackupSummary[] = historyRaw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      const row = item as Record<string, unknown>;
      const counts = asRecord(row.counts);
      return {
        generatedAt: typeof row.generatedAt === "string" ? row.generatedAt : new Date().toISOString(),
        counts: {
          products: Number(counts.products ?? 0),
          customers: Number(counts.customers ?? 0),
          stockBalances: Number(counts.stockBalances ?? 0),
          sales: Number(counts.sales ?? 0),
          collections: Number(counts.collections ?? 0),
          supplierPayments: Number(counts.supplierPayments ?? 0),
        },
      };
    })
    .filter((row): row is BackupSummary => row !== null);

  const lastCountsRaw = asRecord(payload.lastCounts);

  return {
    autoEnabled: payload.autoEnabled !== false,
    retentionDays: Math.max(7, Number(payload.retentionDays ?? 30)),
    lastRunAt: typeof payload.lastRunAt === "string" ? payload.lastRunAt : null,
    lastCounts: payload.lastCounts
      ? {
          products: Number(lastCountsRaw.products ?? 0),
          customers: Number(lastCountsRaw.customers ?? 0),
          stockBalances: Number(lastCountsRaw.stockBalances ?? 0),
          sales: Number(lastCountsRaw.sales ?? 0),
          collections: Number(lastCountsRaw.collections ?? 0),
          supplierPayments: Number(lastCountsRaw.supplierPayments ?? 0),
        }
      : null,
    history,
  };
}

async function collectCounts(tenantId: string): Promise<BackupSummary["counts"]> {
  const [products, customers, stockBalances, sales, collections, supplierPayments] = await Promise.all([
    prisma.products.count({ where: { tenantId, deletedAt: null } }),
    prisma.customers.count({ where: { tenantId, deletedAt: null } }),
    prisma.stockBalances.count({ where: { tenantId, deletedAt: null } }),
    prisma.sales.count({ where: { tenantId, deletedAt: null, status: "completed" } }),
    prisma.collections.count({ where: { tenantId, deletedAt: null } }),
    prisma.paymentsOut.count({ where: { tenantId, deletedAt: null } }),
  ]);

  return {
    products,
    customers,
    stockBalances,
    sales,
    collections,
    supplierPayments,
  };
}

export async function getBackupState(tenantId: string): Promise<BackupState> {
  const row = await prisma.tenantSettings.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      code: BACKUP_SCOPE,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!row) {
    return {
      autoEnabled: true,
      retentionDays: 30,
      lastRunAt: null,
      lastCounts: null,
      history: [],
    };
  }

  return toBackupState(asRecord(row.payload));
}

export async function runTenantBackup(tenantId: string, userId: string | null): Promise<BackupSummary> {
  const now = new Date();
  const counts = await collectCounts(tenantId);
  const summary: BackupSummary = {
    generatedAt: now.toISOString(),
    counts,
  };

  await prisma.$transaction(async (tx) => {
    const existing = await tx.tenantSettings.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        code: BACKUP_SCOPE,
      },
      orderBy: { createdAt: "desc" },
    });

    const previous = toBackupState(asRecord(existing?.payload));
    const nextHistory = [summary, ...previous.history].slice(0, 90);
    const nextPayload = {
      autoEnabled: previous.autoEnabled,
      retentionDays: previous.retentionDays,
      lastRunAt: summary.generatedAt,
      lastCounts: summary.counts,
      history: nextHistory,
    };

    if (existing) {
      await tx.tenantSettings.update({
        where: { id: existing.id },
        data: {
          payload: nextPayload,
          occurredAt: now,
        },
      });
    } else {
      await tx.tenantSettings.create({
        data: {
          tenantId,
          code: BACKUP_SCOPE,
          name: "Günlük Yedekleme Durumu",
          status: "active",
          payload: nextPayload,
          occurredAt: now,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        userId: userId ?? undefined,
        module: "backup",
        entityName: "tenant_settings",
        entityId: BACKUP_SCOPE,
        action: "backup.manual.run",
        payload: summary,
      },
    });
  });

  return summary;
}

export async function updateBackupPreferences(
  tenantId: string,
  userId: string,
  input: { autoEnabled?: boolean; retentionDays?: number },
): Promise<BackupState> {
  const now = new Date();
  const existing = await prisma.tenantSettings.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      code: BACKUP_SCOPE,
    },
    orderBy: { createdAt: "desc" },
  });

  const previous = toBackupState(asRecord(existing?.payload));
  const nextPayload = {
    autoEnabled: input.autoEnabled ?? previous.autoEnabled,
    retentionDays: input.retentionDays ? Math.min(365, Math.max(7, input.retentionDays)) : previous.retentionDays,
    lastRunAt: previous.lastRunAt,
    lastCounts: previous.lastCounts,
    history: previous.history.slice(0, 90),
  };

  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.tenantSettings.update({
        where: { id: existing.id },
        data: {
          payload: nextPayload,
          occurredAt: now,
        },
      });
    } else {
      await tx.tenantSettings.create({
        data: {
          tenantId,
          code: BACKUP_SCOPE,
          name: "Günlük Yedekleme Durumu",
          status: "active",
          payload: nextPayload,
          occurredAt: now,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        userId,
        module: "backup",
        entityName: "tenant_settings",
        entityId: BACKUP_SCOPE,
        action: "backup.settings.updated",
        payload: {
          autoEnabled: nextPayload.autoEnabled,
          retentionDays: nextPayload.retentionDays,
        },
      },
    });
  });

  return toBackupState(nextPayload);
}
