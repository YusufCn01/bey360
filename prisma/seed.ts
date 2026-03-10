import { PrismaClient, RoleScope, TenantStatus, UserStatus } from "@prisma/client";
import { hashPassword } from "@/lib/security/password";

const prisma = new PrismaClient();

const defaultPermissions = [
  { key: "dashboard:view", module: "dashboard", action: "view" },
  { key: "product:view", module: "product", action: "view" },
  { key: "product:create", module: "product", action: "create" },
  { key: "sale:pos", module: "sale", action: "pos" },
  { key: "sale:return", module: "sale", action: "return" },
  { key: "sale:discount", module: "sale", action: "discount" },
  { key: "report:view", module: "report", action: "view" },
  { key: "tenant:user.manage", module: "tenant", action: "user.manage" },
  { key: "einvoice:view", module: "einvoice", action: "view" },
  { key: "einvoice:manage", module: "einvoice", action: "manage" },
];

async function ensureDemoProduct(params: {
  tenantId: string;
  code: string;
  name: string;
  salePrice: number;
  purchasePrice: number;
  minStockLevel: number;
  quantity: number;
}) {
  let product = await prisma.products.findFirst({
    where: {
      tenantId: params.tenantId,
      code: params.code,
      deletedAt: null,
    },
  });

  if (!product) {
    product = await prisma.products.create({
      data: {
        tenantId: params.tenantId,
        code: params.code,
        name: params.name,
        status: "active",
        payload: {
          salePrice: params.salePrice,
          purchasePrice: params.purchasePrice,
          minStockLevel: params.minStockLevel,
          maxStockLevel: params.minStockLevel * 10,
          defaultUnit: "ADET",
          vatRate: 20,
        },
        occurredAt: new Date(),
      },
    });
  }

  const balanceCode = `${product.id}:main`;
  const existingBalance = await prisma.stockBalances.findFirst({
    where: {
      tenantId: params.tenantId,
      code: balanceCode,
      deletedAt: null,
    },
  });

  if (!existingBalance) {
    await prisma.stockBalances.create({
      data: {
        tenantId: params.tenantId,
        code: balanceCode,
        name: product.name,
        status: "active",
        payload: {
          productId: product.id,
          warehouseId: "main",
          quantity: params.quantity,
          reserved: 0,
          available: params.quantity,
        },
        occurredAt: new Date(),
      },
    });
  }

  return product;
}

async function ensureOperationalDemoData(params: {
  tenantId: string;
  userId: string;
  products: Array<{ id: string; name: string; salePrice: number }>;
}) {
  const existingSale = await prisma.sales.findFirst({
    where: {
      tenantId: params.tenantId,
      code: "SAT-DEMO-0001",
      deletedAt: null,
    },
  });

  if (!existingSale) {
    const now = new Date();
    const sale = await prisma.sales.create({
      data: {
        tenantId: params.tenantId,
        code: "SAT-DEMO-0001",
        name: "Merkez Kasa",
        status: "completed",
        payload: {
          registerId: "REG-1",
          customerCode: "MUS-DEMO-001",
          customerName: "Demo Musteri",
          currency: "TRY",
          netTotal: 1240,
          paymentTotal: 1240,
          outstanding: 0,
          cashierUserId: params.userId,
        },
        occurredAt: now,
      },
    });

    for (const item of params.products.slice(0, 3)) {
      await prisma.saleItems.create({
        data: {
          tenantId: params.tenantId,
          code: sale.id,
          name: item.name,
          status: "completed",
          payload: {
            productId: item.id,
            quantity: item.id === params.products[0]?.id ? 6 : 3,
            unitPrice: item.salePrice,
            netAmount: item.id === params.products[0]?.id ? item.salePrice * 6 : item.salePrice * 3,
          },
          occurredAt: now,
        },
      });
    }

    await prisma.cashTransactions.createMany({
      data: [
        {
          tenantId: params.tenantId,
          code: "SALE_CASH_IN",
          name: "POS Nakit Tahsilat",
          status: "posted",
          payload: {
            direction: "in",
            amount: 1240,
            currency: "TRY",
            sourceId: sale.id,
          },
          occurredAt: now,
        },
        {
          tenantId: params.tenantId,
          code: "EXPENSE_OUT",
          name: "Gunluk Masraf",
          status: "posted",
          payload: {
            direction: "out",
            amount: 220,
            currency: "TRY",
            sourceId: "expense-demo",
          },
          occurredAt: now,
        },
      ],
    });

    await prisma.collections.create({
      data: {
        tenantId: params.tenantId,
        code: "TAHSILAT-DEMO-1",
        name: "Demo Tahsilat",
        status: "completed",
        payload: {
          amount: 1240,
          currency: "TRY",
          customerCode: "MUS-DEMO-001",
        },
        occurredAt: now,
      },
    });

    await prisma.paymentsOut.create({
      data: {
        tenantId: params.tenantId,
        code: "ODEME-DEMO-1",
        name: "Demo Odeme",
        status: "completed",
        payload: {
          amount: 220,
          currency: "TRY",
          supplierCode: "TED-DEMO-001",
        },
        occurredAt: now,
      },
    });
  }

  const existingPurchase = await prisma.purchaseInvoices.findFirst({
    where: {
      tenantId: params.tenantId,
      code: "ALIS-DEMO-0001",
      deletedAt: null,
    },
  });

  if (!existingPurchase) {
    await prisma.purchaseInvoices.create({
      data: {
        tenantId: params.tenantId,
        code: "ALIS-DEMO-0001",
        name: "Demo Tedarikci",
        status: "posted",
        payload: {
          supplierCode: "TED-DEMO-001",
          supplierName: "Demo Tedarikci",
          currency: "TRY",
          netTotal: 880,
          paidAmount: 500,
          outstanding: 380,
        },
        occurredAt: new Date(),
      },
    });
  }
}

async function main() {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-market" },
    update: {
      legalName: "Beyoglu Ticaret A.S.",
      tradeName: "Beyoglu",
      locale: "tr-TR",
      timezone: "Europe/Istanbul",
      currency: "TRY",
      status: TenantStatus.TRIALING,
      trialEndsAt,
      activeUntil: null,
    },
    create: {
      slug: "demo-market",
      legalName: "Beyoglu Ticaret A.S.",
      tradeName: "Beyoglu",
      taxNumber: "1234567890",
      locale: "tr-TR",
      timezone: "Europe/Istanbul",
      currency: "TRY",
      status: TenantStatus.TRIALING,
      trialEndsAt,
      activeUntil: null,
    },
  });

  for (const permission of defaultPermissions) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: permission,
      create: permission,
    });
  }

  const ownerRole = await prisma.role.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: "tenant-owner",
      },
    },
    update: {
      name: "Tenant Owner",
      scope: RoleScope.TENANT,
      isSystem: true,
    },
    create: {
      tenantId: tenant.id,
      code: "tenant-owner",
      name: "Tenant Owner",
      scope: RoleScope.TENANT,
      isSystem: true,
    },
  });

  const permissions = await prisma.permission.findMany();
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId_contextKey: {
          roleId: ownerRole.id,
          permissionId: permission.id,
          contextKey: "global",
        },
      },
      update: {},
      create: {
        roleId: ownerRole.id,
        permissionId: permission.id,
      },
    });
  }

  const owner = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "owner@demo.local",
      },
    },
    update: {
      firstName: "Sistem",
      lastName: "Yoneticisi",
      status: UserStatus.ACTIVE,
    },
    create: {
      tenantId: tenant.id,
      email: "owner@demo.local",
      username: "owner",
      firstName: "Sistem",
      lastName: "Yoneticisi",
      passwordHash: await hashPassword("Demo1234!"),
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: owner.id,
        roleId: ownerRole.id,
      },
    },
    update: {},
    create: {
      userId: owner.id,
      roleId: ownerRole.id,
      assignedBy: "seed",
    },
  });

  await prisma.tenantModule.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: "pos",
      },
    },
    update: { isEnabled: true, name: "POS" },
    create: {
      tenantId: tenant.id,
      code: "pos",
      name: "POS",
      isEnabled: true,
    },
  });

  const p1 = await ensureDemoProduct({
    tenantId: tenant.id,
    code: "URUN-DEMO-001",
    name: "Espresso Cekirdegi 1kg",
    salePrice: 420,
    purchasePrice: 300,
    minStockLevel: 8,
    quantity: 6,
  });
  const p2 = await ensureDemoProduct({
    tenantId: tenant.id,
    code: "URUN-DEMO-002",
    name: "Filtre Kahve 500gr",
    salePrice: 260,
    purchasePrice: 180,
    minStockLevel: 10,
    quantity: 17,
  });
  const p3 = await ensureDemoProduct({
    tenantId: tenant.id,
    code: "URUN-DEMO-003",
    name: "Bardak Kapak Seti",
    salePrice: 80,
    purchasePrice: 40,
    minStockLevel: 15,
    quantity: 9,
  });

  await ensureOperationalDemoData({
    tenantId: tenant.id,
    userId: owner.id,
    products: [
      { id: p1.id, name: p1.name ?? "Urun", salePrice: 420 },
      { id: p2.id, name: p2.name ?? "Urun", salePrice: 260 },
      { id: p3.id, name: p3.name ?? "Urun", salePrice: 80 },
    ],
  });

  await prisma.tenantUsageCounter.upsert({
    where: {
      tenantId_metricKey_periodStart_periodEnd: {
        tenantId: tenant.id,
        metricKey: "active_users",
        periodStart: new Date("2026-01-01T00:00:00.000Z"),
        periodEnd: new Date("2026-12-31T23:59:59.999Z"),
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      metricKey: "active_users",
      metricValue: 1,
      periodStart: new Date("2026-01-01T00:00:00.000Z"),
      periodEnd: new Date("2026-12-31T23:59:59.999Z"),
    },
  });

  console.log("Seed tamamlandi. Demo giris: owner@demo.local / Demo1234!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
