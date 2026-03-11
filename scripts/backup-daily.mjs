import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BACKUP_SCOPE = "daily_backup_status";

function dateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

async function collectTenantSnapshot(tenantId, slug, limit) {
  const [products, customers, stockBalances, sales, collections, paymentsOut] = await Promise.all([
    prisma.products.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: { id: true, code: true, name: true, status: true, updatedAt: true, payload: true },
    }),
    prisma.customers.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: { id: true, code: true, name: true, status: true, updatedAt: true, payload: true },
    }),
    prisma.stockBalances.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: { id: true, code: true, name: true, status: true, updatedAt: true, payload: true },
    }),
    prisma.sales.findMany({
      where: { tenantId, deletedAt: null, status: "completed" },
      orderBy: { occurredAt: "desc" },
      take: limit,
      select: { id: true, code: true, name: true, status: true, occurredAt: true, payload: true },
    }),
    prisma.collections.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { occurredAt: "desc" },
      take: limit,
      select: { id: true, code: true, name: true, status: true, occurredAt: true, payload: true },
    }),
    prisma.paymentsOut.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { occurredAt: "desc" },
      take: limit,
      select: { id: true, code: true, name: true, status: true, occurredAt: true, payload: true },
    }),
  ]);

  const now = new Date();
  const payload = {
    generatedAt: now.toISOString(),
    tenantSlug: slug,
    limits: { perCollection: limit },
    counts: {
      products: products.length,
      customers: customers.length,
      stockBalances: stockBalances.length,
      sales: sales.length,
      collections: collections.length,
      supplierPayments: paymentsOut.length,
    },
    data: {
      products,
      customers,
      stockBalances,
      sales,
      collections,
      supplierPayments: paymentsOut,
    },
  };

  return payload;
}

async function updateBackupStatus(tenantId, filePath, counts) {
  const now = new Date();
  const existing = await prisma.tenantSettings.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      code: BACKUP_SCOPE,
    },
    orderBy: { createdAt: "desc" },
  });

  const previous = asRecord(existing?.payload);
  const history = Array.isArray(previous.history) ? previous.history : [];
  const nextHistory = [
    {
      generatedAt: now.toISOString(),
      filePath,
      counts,
    },
    ...history,
  ].slice(0, 90);

  const nextPayload = {
    autoEnabled: previous.autoEnabled === false ? false : true,
    lastRunAt: now.toISOString(),
    lastFilePath: filePath,
    lastCounts: counts,
    history: nextHistory,
  };

  if (existing) {
    await prisma.tenantSettings.update({
      where: { id: existing.id },
      data: {
        payload: nextPayload,
        occurredAt: now,
      },
    });
  } else {
    await prisma.tenantSettings.create({
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

  await prisma.auditLog.create({
    data: {
      tenantId,
      module: "backup",
      entityName: "tenant_settings",
      entityId: BACKUP_SCOPE,
      action: "backup.daily.generated",
      payload: {
        filePath,
        counts,
      },
    },
  });
}

async function main() {
  const backupRoot = process.env.BACKUP_DIR || ".backups";
  const maxRows = Number(process.env.BACKUP_MAX_ROWS || "5000");
  const take = Number.isFinite(maxRows) ? Math.min(Math.max(maxRows, 100), 50000) : 5000;

  const activeTenants = await prisma.tenant.findMany({
    where: {
      deletedAt: null,
      status: {
        in: ["TRIALING", "ACTIVE", "PAST_DUE"],
      },
    },
    select: {
      id: true,
      slug: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (activeTenants.length === 0) {
    throw new Error("Yedek alinacak aktif tenant bulunamadi.");
  }

  const dayFolder = path.join(process.cwd(), backupRoot, dateStamp());
  await fs.mkdir(dayFolder, { recursive: true });

  for (const tenant of activeTenants) {
    const snapshot = await collectTenantSnapshot(tenant.id, tenant.slug, take);
    const fileName = `${tenant.slug}-${Date.now()}.json`;
    const absolutePath = path.join(dayFolder, fileName);
    await fs.writeFile(absolutePath, JSON.stringify(snapshot), "utf8");
    await updateBackupStatus(tenant.id, absolutePath, snapshot.counts);
    console.log(`[ok] Backup yazildi: ${absolutePath}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("[hata] backup-daily basarisiz:", error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
