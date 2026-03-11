import { prisma } from "@/lib/db/prisma";
import { asRecord, numberOrZero } from "@/lib/json";

function parseScanLimit(raw: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(raw ?? fallback);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

const SALES_SCAN_LIMIT = parseScanLimit(process.env.DASHBOARD_SALES_SCAN_LIMIT, 320, 80, 5000);
const SALE_ITEMS_SCAN_LIMIT = parseScanLimit(process.env.DASHBOARD_SALE_ITEMS_SCAN_LIMIT, 600, 120, 7000);
const STOCK_SCAN_LIMIT = parseScanLimit(process.env.DASHBOARD_STOCK_SCAN_LIMIT, 700, 150, 7000);
const FINANCE_SCAN_LIMIT = parseScanLimit(process.env.DASHBOARD_FINANCE_SCAN_LIMIT, 320, 80, 5000);
const CUSTOMER_SCAN_LIMIT = parseScanLimit(process.env.DASHBOARD_CUSTOMER_SCAN_LIMIT, 1200, 150, 10000);

function isSameDay(date: Date, target: Date) {
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth() &&
    date.getDate() === target.getDate()
  );
}

function isSameMonth(date: Date, target: Date) {
  return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth();
}

function toIso(date: Date | null | undefined) {
  return (date ?? new Date()).toISOString();
}

function toDateOrNull(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function dateAtStartOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export type DashboardMonthlyPoint = {
  day: number;
  sales: number;
  cashIn: number;
  cashOut: number;
};

export type DashboardTopProduct = {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
};

export type DashboardLastSoldItem = {
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  netAmount: number;
  occurredAt: string;
};

export type DashboardRecentSale = {
  saleId: string;
  saleCode: string;
  customerName: string;
  netTotal: number;
  occurredAt: string;
};

export type DashboardLowStockProduct = {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  minStockLevel: number;
};

export type DashboardRecentFinancialMove = {
  kind: string;
  code: string;
  amount: number;
  direction: "in" | "out" | "none";
  occurredAt: string;
  description: string;
};

export type DashboardRiskCustomer = {
  customerCode: string;
  customerName: string;
  currentBalance: number;
  riskLimit: number;
  availableRisk: number;
  usageRate: number;
  status: "ok" | "warning" | "over_limit";
};

export type DashboardClosingChecklistItem = {
  key: string;
  title: string;
  status: "ok" | "warning" | "critical";
  detail: string;
};

export type DashboardSummary = {
  dailySales: number;
  dailyPurchases: number;
  dailyCashIn: number;
  dailyCashOut: number;
  weeklySales: number;
  monthlyRevenue: number;
  lowStockCount: number;
  totalCollections: number;
  totalPayments: number;
  cashBalance: number;
  customerDebtTotal: number;
  customersNearRiskLimit: number;
  customersOverRiskLimit: number;
  overdueReceivablesTotal: number;
  overdueReceivablesCount: number;
  dueSoonReceivablesCount: number;
  openPosSessionCount: number;
  suspendedCartCount: number;
  monthlyCashFlow: DashboardMonthlyPoint[];
  topProducts: DashboardTopProduct[];
  lastSoldItems: DashboardLastSoldItem[];
  recentSales: DashboardRecentSale[];
  lowStockProducts: DashboardLowStockProduct[];
  recentFinancialMoves: DashboardRecentFinancialMove[];
  riskyCustomers: DashboardRiskCustomer[];
  closingChecklist: DashboardClosingChecklistItem[];
  updatedAt: string;
};

export async function getDashboardSummary(params: { tenantId: string }): Promise<DashboardSummary> {
  const [
    sales,
    saleItems,
    stockBalances,
    products,
    collections,
    payments,
    cashTransactions,
    purchaseInvoices,
    openPosSessionCount,
    suspendedCartCount,
    customers,
    customerRiskProfiles,
    balanceSnapshots,
  ] =
    await Promise.all([
      prisma.sales.findMany({
        where: {
          tenantId: params.tenantId,
          deletedAt: null,
          status: "completed",
        },
        select: {
          id: true,
          code: true,
          name: true,
          payload: true,
          occurredAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: SALES_SCAN_LIMIT,
      }),
      prisma.saleItems.findMany({
        where: {
          tenantId: params.tenantId,
          deletedAt: null,
          status: "completed",
        },
        select: {
          id: true,
          code: true,
          name: true,
          payload: true,
          occurredAt: true,
          createdAt: true,
        },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: SALE_ITEMS_SCAN_LIMIT,
      }),
      prisma.stockBalances.findMany({
        where: {
          tenantId: params.tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          payload: true,
        },
        take: STOCK_SCAN_LIMIT,
      }),
      prisma.products.findMany({
        where: {
          tenantId: params.tenantId,
          deletedAt: null,
          status: "active",
        },
        select: {
          id: true,
          code: true,
          name: true,
          payload: true,
        },
        take: STOCK_SCAN_LIMIT,
      }),
      prisma.collections.findMany({
        where: {
          tenantId: params.tenantId,
          deletedAt: null,
          status: "completed",
        },
        select: {
          payload: true,
        },
        take: FINANCE_SCAN_LIMIT,
      }),
      prisma.paymentsOut.findMany({
        where: {
          tenantId: params.tenantId,
          deletedAt: null,
          status: "completed",
        },
        select: {
          payload: true,
        },
        take: FINANCE_SCAN_LIMIT,
      }),
      prisma.cashTransactions.findMany({
        where: {
          tenantId: params.tenantId,
          deletedAt: null,
          status: "posted",
        },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          payload: true,
          occurredAt: true,
          createdAt: true,
        },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: FINANCE_SCAN_LIMIT,
      }),
      prisma.purchaseInvoices.findMany({
        where: {
          tenantId: params.tenantId,
          deletedAt: null,
          status: "posted",
        },
        select: {
          payload: true,
          occurredAt: true,
          createdAt: true,
        },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: FINANCE_SCAN_LIMIT,
      }),
      prisma.saleRegisterSessions.count({
        where: {
          tenantId: params.tenantId,
          deletedAt: null,
          status: "open",
        },
      }),
      prisma.suspendedSales.count({
        where: {
          tenantId: params.tenantId,
          deletedAt: null,
          status: "suspended",
        },
      }),
      prisma.customers.findMany({
        where: {
          tenantId: params.tenantId,
          deletedAt: null,
        },
        select: {
          code: true,
          name: true,
        },
        take: CUSTOMER_SCAN_LIMIT,
      }),
      prisma.customerRiskProfiles.findMany({
        where: {
          tenantId: params.tenantId,
          deletedAt: null,
        },
        select: {
          code: true,
          payload: true,
          occurredAt: true,
          createdAt: true,
        },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: STOCK_SCAN_LIMIT,
      }),
      prisma.balanceSnapshots.findMany({
        where: {
          tenantId: params.tenantId,
          deletedAt: null,
        },
        select: {
          code: true,
          payload: true,
        },
        take: STOCK_SCAN_LIMIT,
      }),
    ]);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthSeries = Array.from({ length: daysInMonth }, (_, index) => ({
    day: index + 1,
    sales: 0,
    cashIn: 0,
    cashOut: 0,
  }));

  const productMeta = new Map<
    string,
    {
      code: string;
      name: string;
      minStockLevel: number;
    }
  >();

  for (const product of products) {
    const payload = asRecord(product.payload);
    productMeta.set(product.id, {
      code: product.code ?? "-",
      name: product.name ?? "Ürün",
      minStockLevel: numberOrZero(payload.minStockLevel),
    });
  }

  const salesAmounts = sales.map((sale) => {
    const payload = asRecord(sale.payload);
    const value = numberOrZero(payload.netTotal);
    const when = sale.occurredAt ?? sale.createdAt;

    if (isSameMonth(when, now)) {
      monthSeries[when.getDate() - 1].sales += value;
    }

    return {
      saleId: sale.id,
      saleCode: sale.code ?? `SAT-${sale.id.slice(0, 6)}`,
      customerName: (payload.customerName as string | undefined) ?? sale.name ?? "Müşteri",
      value,
      when,
    };
  });

  const dailySales = salesAmounts
    .filter((sale) => isSameDay(sale.when, now))
    .reduce((sum, sale) => sum + sale.value, 0);

  const weeklySales = salesAmounts
    .filter((sale) => {
      const diff = now.getTime() - sale.when.getTime();
      return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
    })
    .reduce((sum, sale) => sum + sale.value, 0);

  const monthlyRevenue = salesAmounts
    .filter((sale) => isSameMonth(sale.when, now))
    .reduce((sum, sale) => sum + sale.value, 0);

  const today = dateAtStartOfDay(now);
  const dueSoonThreshold = new Date(today);
  dueSoonThreshold.setDate(dueSoonThreshold.getDate() + 3);

  let overdueReceivablesTotal = 0;
  let overdueReceivablesCount = 0;
  let dueSoonReceivablesCount = 0;
  for (const sale of sales) {
    const payload = asRecord(sale.payload);
    const outstanding = numberOrZero(payload.outstanding);
    if (outstanding <= 0) {
      continue;
    }

    const maturityDays = Math.max(0, Math.floor(numberOrZero(payload.maturityDays)));
    const explicitDue = toDateOrNull(payload.dueDate);
    const fallbackDue =
      maturityDays > 0
        ? new Date((sale.occurredAt ?? sale.createdAt).getTime() + maturityDays * 24 * 60 * 60 * 1000)
        : null;
    const dueDate = explicitDue ?? fallbackDue;
    if (!dueDate) {
      continue;
    }

    const normalizedDue = dateAtStartOfDay(dueDate);
    if (normalizedDue < today) {
      overdueReceivablesTotal += outstanding;
      overdueReceivablesCount += 1;
      continue;
    }
    if (normalizedDue <= dueSoonThreshold) {
      dueSoonReceivablesCount += 1;
    }
  }

  const dailyPurchases = purchaseInvoices
    .map((row) => {
      const payload = asRecord(row.payload);
      return {
        when: row.occurredAt ?? row.createdAt,
        amount: numberOrZero(payload.netTotal),
      };
    })
    .filter((row) => isSameDay(row.when, now))
    .reduce((sum, row) => sum + row.amount, 0);

  let dailyCashIn = 0;
  let dailyCashOut = 0;
  let cashIn = 0;
  let cashOut = 0;

  const recentFinancialMoves: DashboardRecentFinancialMove[] = [];

  for (const row of cashTransactions) {
    const payload = asRecord(row.payload);
    const amount = numberOrZero(payload.amount);
    const direction = payload.direction === "in" ? "in" : payload.direction === "out" ? "out" : "none";
    const when = row.occurredAt ?? row.createdAt;

    if (direction === "in") {
      cashIn += amount;
      if (isSameDay(when, now)) {
        dailyCashIn += amount;
      }
      if (isSameMonth(when, now)) {
        monthSeries[when.getDate() - 1].cashIn += amount;
      }
    }

    if (direction === "out") {
      cashOut += amount;
      if (isSameDay(when, now)) {
        dailyCashOut += amount;
      }
      if (isSameMonth(when, now)) {
        monthSeries[when.getDate() - 1].cashOut += amount;
      }
    }

    recentFinancialMoves.push({
      kind: row.name ?? row.code ?? "Kasa Hareketi",
      code: row.code ?? row.id,
      amount,
      direction,
      occurredAt: toIso(when),
      description: row.description ?? "",
    });
  }

  const totalCollections = collections.reduce((sum, row) => {
    const payload = asRecord(row.payload);
    return sum + numberOrZero(payload.amount);
  }, 0);

  const totalPayments = payments.reduce((sum, row) => {
    const payload = asRecord(row.payload);
    return sum + numberOrZero(payload.amount);
  }, 0);

  const productAgg = new Map<string, DashboardTopProduct>();
  const lastSoldItems: DashboardLastSoldItem[] = [];

  for (const item of saleItems) {
    const payload = asRecord(item.payload);
    const productId = (payload.productId as string | undefined) ?? `unknown-${item.id}`;
    const quantity = numberOrZero(payload.quantity);
    const revenue = numberOrZero(payload.netAmount);
    const unitPrice = numberOrZero(payload.unitPrice);
    const productName = item.name ?? productMeta.get(productId)?.name ?? "Ürün";

    const existing = productAgg.get(productId);
    if (existing) {
      existing.quantity += quantity;
      existing.revenue += revenue;
    } else {
      productAgg.set(productId, {
        productId,
        productName,
        quantity,
        revenue,
      });
    }

    if (lastSoldItems.length < 8) {
      lastSoldItems.push({
        saleId: item.code ?? "-",
        productId,
        productName,
        quantity,
        unitPrice,
        netAmount: revenue,
        occurredAt: toIso(item.occurredAt ?? item.createdAt),
      });
    }
  }

  const topProducts = Array.from(productAgg.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const recentSales = salesAmounts
    .sort((a, b) => b.when.getTime() - a.when.getTime())
    .slice(0, 8)
    .map((sale) => ({
      saleId: sale.saleId,
      saleCode: sale.saleCode,
      customerName: sale.customerName,
      netTotal: sale.value,
      occurredAt: sale.when.toISOString(),
    }));

  const lowStockProducts: DashboardLowStockProduct[] = [];

  for (const row of stockBalances) {
    const payload = asRecord(row.payload);
    const productId = payload.productId as string | undefined;
    if (!productId) {
      continue;
    }

    const quantity = numberOrZero(payload.quantity);
    const metadata = productMeta.get(productId);
    const minStockLevel = metadata?.minStockLevel ?? 0;
    const threshold = minStockLevel > 0 ? minStockLevel : 5;

    if (quantity <= threshold) {
      lowStockProducts.push({
        productId,
        productCode: metadata?.code ?? "-",
        productName: metadata?.name ?? row.name ?? "Ürün",
        quantity,
        minStockLevel: threshold,
      });
    }
  }

  lowStockProducts.sort((a, b) => a.quantity - b.quantity);

  const latestRiskByCode = new Map<string, number>();
  const customerCodeSet = new Set(customers.map((row) => row.code).filter((code): code is string => Boolean(code)));
  for (const row of customerRiskProfiles) {
    const riskCode = row.code ?? "";
    if (!riskCode || latestRiskByCode.has(riskCode)) {
      continue;
    }
    const payload = asRecord(row.payload);
    latestRiskByCode.set(riskCode, numberOrZero(payload.riskLimit));
  }

  const balanceByCode = new Map<string, number>();
  for (const row of balanceSnapshots) {
    const payload = asRecord(row.payload);
    const fallbackCode = row.code ?? "";
    const accountCode = (payload.accountCode as string | undefined) ?? fallbackCode.replace("SNAP:", "");
    if (!accountCode || !customerCodeSet.has(accountCode)) {
      continue;
    }
    balanceByCode.set(accountCode, numberOrZero(payload.balance));
  }

  const riskyCustomers: DashboardRiskCustomer[] = [];
  let customerDebtTotal = 0;
  let customersNearRiskLimit = 0;
  let customersOverRiskLimit = 0;

  for (const customer of customers) {
    const customerCode = customer.code ?? "";
    if (!customerCode) {
      continue;
    }

    const currentBalance = Math.max(0, balanceByCode.get(customerCode) ?? 0);
    customerDebtTotal += currentBalance;

    const riskLimit = latestRiskByCode.get(customerCode) ?? 0;
    if (riskLimit <= 0) {
      continue;
    }

    const usageRate = riskLimit > 0 ? currentBalance / riskLimit : 0;
    const status: DashboardRiskCustomer["status"] =
      currentBalance > riskLimit ? "over_limit" : usageRate >= 0.8 ? "warning" : "ok";

    if (status === "over_limit") {
      customersOverRiskLimit += 1;
    } else if (status === "warning") {
      customersNearRiskLimit += 1;
    }

    if (status === "ok") {
      continue;
    }

    riskyCustomers.push({
      customerCode,
      customerName: customer.name ?? customerCode,
      currentBalance,
      riskLimit,
      availableRisk: Math.max(0, riskLimit - currentBalance),
      usageRate,
      status,
    });
  }

  riskyCustomers.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "over_limit" ? -1 : 1;
    }
    return b.usageRate - a.usageRate;
  });

  const closingChecklist: DashboardClosingChecklistItem[] = [
    openPosSessionCount === 0
      ? {
          key: "open_pos_sessions",
          title: "Açık POS oturumu",
          status: "ok",
          detail: "Açık kasa oturumu bulunmuyor.",
        }
      : {
          key: "open_pos_sessions",
          title: "Açık POS oturumu",
          status: "warning",
          detail: `${openPosSessionCount} adet açık POS oturumu var, gün sonu öncesi kapatılmalı.`,
        },
    suspendedCartCount === 0
      ? {
          key: "suspended_carts",
          title: "Askı sepet kontrolü",
          status: "ok",
          detail: "Bekleyen askı sepet yok.",
        }
      : {
          key: "suspended_carts",
          title: "Askı sepet kontrolü",
          status: "warning",
          detail: `${suspendedCartCount} adet askı sepet bekliyor.`,
        },
    overdueReceivablesCount === 0
      ? {
          key: "overdue_receivables",
          title: "Vadesi geçen alacak",
          status: "ok",
          detail: "Vadesi geçmiş cari alacak bulunmuyor.",
        }
      : {
          key: "overdue_receivables",
          title: "Vadesi geçen alacak",
          status: "critical",
          detail: `${overdueReceivablesCount} müşteride toplam ${overdueReceivablesTotal.toFixed(2)} TL gecikmiş alacak var.`,
        },
    customersOverRiskLimit === 0
      ? {
          key: "risk_limit_breaches",
          title: "Risk limit ihlali",
          status: "ok",
          detail: "Risk limiti aşan müşteri yok.",
        }
      : {
          key: "risk_limit_breaches",
          title: "Risk limit ihlali",
          status: "critical",
          detail: `${customersOverRiskLimit} müşteri risk limitini aşmış durumda.`,
        },
  ];

  return {
    dailySales,
    dailyPurchases,
    dailyCashIn,
    dailyCashOut,
    weeklySales,
    monthlyRevenue,
    lowStockCount: lowStockProducts.length,
    totalCollections,
    totalPayments,
    cashBalance: cashIn - cashOut,
    customerDebtTotal,
    customersNearRiskLimit,
    customersOverRiskLimit,
    overdueReceivablesTotal,
    overdueReceivablesCount,
    dueSoonReceivablesCount,
    openPosSessionCount,
    suspendedCartCount,
    monthlyCashFlow: monthSeries,
    topProducts,
    lastSoldItems,
    recentSales,
    lowStockProducts: lowStockProducts.slice(0, 8),
    recentFinancialMoves: recentFinancialMoves
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 10),
    riskyCustomers: riskyCustomers.slice(0, 8),
    closingChecklist,
    updatedAt: new Date().toISOString(),
  };
}
