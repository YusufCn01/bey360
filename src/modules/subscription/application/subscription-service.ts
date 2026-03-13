import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { planLimits, type TenantPlanCode } from "@/lib/subscription/limits";
import {
  PANEL_MODULE_CODES,
  PANEL_MODULE_LABELS,
  getCancelledModuleAccess,
  getPlanModuleAccess,
  mergeModuleAccessWithOverrides,
  normalizePlanCode,
  type PanelModuleAccess,
  type PanelModuleCode,
} from "@/lib/subscription/module-access";

type PrismaTx = Prisma.TransactionClient;

function toPlanCode(value: string | null | undefined): TenantPlanCode {
  return normalizePlanCode(value);
}

async function syncTenantModuleAccess(
  tx: PrismaTx,
  tenantId: string,
  accessMap: PanelModuleAccess,
  now: Date,
) {
  for (const moduleCode of PANEL_MODULE_CODES) {
    const isEnabled = accessMap[moduleCode];

    await tx.tenantModule.upsert({
      where: {
        tenantId_code: {
          tenantId,
          code: moduleCode,
        },
      },
      update: {
        name: PANEL_MODULE_LABELS[moduleCode],
        isEnabled,
      },
      create: {
        tenantId,
        code: moduleCode,
        name: PANEL_MODULE_LABELS[moduleCode],
        isEnabled,
      },
    });

    await tx.tenantModuleEntitlement.upsert({
      where: {
        tenantId_moduleCode_entitlementKey: {
          tenantId,
          moduleCode,
          entitlementKey: "enabled",
        },
      },
      update: {
        entitlementValue: isEnabled ? "1" : "0",
        updatedAt: now,
      },
      create: {
        tenantId,
        moduleCode,
        entitlementKey: "enabled",
        entitlementValue: isEnabled ? "1" : "0",
      },
    });
  }
}

export async function getCurrentSubscription(tenantId: string) {
  return prisma.tenantSubscriptions.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      status: {
        in: ["trialing", "active", "past_due", "suspended"],
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function getTenantModuleAccess(
  tenantId: string,
  planCode: string | null | undefined,
): Promise<PanelModuleAccess> {
  const overrides = await prisma.tenantModule.findMany({
    where: {
      tenantId,
    },
    select: {
      code: true,
      isEnabled: true,
    },
  });

  return mergeModuleAccessWithOverrides(getPlanModuleAccess(planCode), overrides);
}

export async function changeSubscriptionPlan(params: {
  tenantId: string;
  userId: string;
  planCode: TenantPlanCode;
  billingCycle: "monthly" | "yearly";
  startAt?: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const now = params.startAt ?? new Date();
    const limits = planLimits[params.planCode];
    const endAt = new Date(now);
    endAt.setMonth(endAt.getMonth() + (params.billingCycle === "monthly" ? 1 : 12));
    const moduleAccess = getPlanModuleAccess(params.planCode);

    await tx.tenantSubscriptions.updateMany({
      where: {
        tenantId: params.tenantId,
        status: {
          in: ["trialing", "active", "past_due"],
        },
      },
      data: {
        status: "cancelled",
        occurredAt: now,
      },
    });

    const subscription = await tx.tenantSubscriptions.create({
      data: {
        tenantId: params.tenantId,
        code: params.planCode,
        name: `${params.planCode.toUpperCase()} Plan`,
        status: "active",
        payload: {
          planCode: params.planCode,
          billingCycle: params.billingCycle,
          startedAt: now.toISOString(),
          endsAt: endAt.toISOString(),
          changedBy: params.userId,
        },
        occurredAt: now,
      },
    });

    const itemCode = `${subscription.id}:base`;
    await tx.subscriptionItems.create({
      data: {
        tenantId: params.tenantId,
        code: itemCode,
        name: "base_plan",
        status: "active",
        payload: {
          subscriptionId: subscription.id,
          planCode: params.planCode,
          billingCycle: params.billingCycle,
        },
        occurredAt: now,
      },
    });

    const entitlementEntries: Array<[keyof typeof limits, number]> = Object.entries(limits) as Array<
      [keyof typeof limits, number]
    >;

    for (const [key, value] of entitlementEntries) {
      await tx.tenantModuleEntitlement.upsert({
        where: {
          tenantId_moduleCode_entitlementKey: {
            tenantId: params.tenantId,
            moduleCode: "core",
            entitlementKey: key,
          },
        },
        update: {
          entitlementValue: String(value),
          updatedAt: now,
        },
        create: {
          tenantId: params.tenantId,
          moduleCode: "core",
          entitlementKey: key,
          entitlementValue: String(value),
        },
      });
    }

    await syncTenantModuleAccess(tx, params.tenantId, moduleAccess, now);

    await tx.billingInvoices.create({
      data: {
        tenantId: params.tenantId,
        code: `SUB-${Date.now()}`,
        name: `${params.planCode.toUpperCase()} Abonelik Faturası`,
        status: "issued",
        payload: {
          subscriptionId: subscription.id,
          planCode: params.planCode,
          billingCycle: params.billingCycle,
        },
        occurredAt: now,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        module: "subscription",
        entityName: "tenant_subscriptions",
        entityId: subscription.id,
        action: "subscription.plan.changed",
        payload: {
          planCode: params.planCode,
          billingCycle: params.billingCycle,
          modules: moduleAccess,
        },
      },
    });

    return {
      subscriptionId: subscription.id,
      planCode: params.planCode,
      billingCycle: params.billingCycle,
      limits,
      startsAt: now.toISOString(),
      endsAt: endAt.toISOString(),
      moduleAccess,
    };
  });
}

export async function cancelTenantLicense(params: {
  tenantId: string;
  userId: string;
  reason?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const moduleAccess = getCancelledModuleAccess();

    await tx.tenantSubscriptions.updateMany({
      where: {
        tenantId: params.tenantId,
        status: {
          in: ["trialing", "active", "past_due", "suspended"],
        },
      },
      data: {
        status: "cancelled",
        occurredAt: now,
      },
    });

    await syncTenantModuleAccess(tx, params.tenantId, moduleAccess, now);

    await tx.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        module: "subscription",
        entityName: "tenant_subscriptions",
        entityId: params.tenantId,
        action: "subscription.license.cancelled",
        payload: {
          reason: params.reason ?? null,
          modules: moduleAccess,
        },
      },
    });

    return {
      cancelledAt: now.toISOString(),
      moduleAccess,
    };
  });
}

export async function setTenantModuleState(params: {
  tenantId: string;
  userId: string;
  moduleCode: PanelModuleCode;
  isEnabled: boolean;
  reason?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const moduleLabel = PANEL_MODULE_LABELS[params.moduleCode];

    await tx.tenantModule.upsert({
      where: {
        tenantId_code: {
          tenantId: params.tenantId,
          code: params.moduleCode,
        },
      },
      update: {
        name: moduleLabel,
        isEnabled: params.isEnabled,
      },
      create: {
        tenantId: params.tenantId,
        code: params.moduleCode,
        name: moduleLabel,
        isEnabled: params.isEnabled,
      },
    });

    await tx.tenantModuleEntitlement.upsert({
      where: {
        tenantId_moduleCode_entitlementKey: {
          tenantId: params.tenantId,
          moduleCode: params.moduleCode,
          entitlementKey: "enabled",
        },
      },
      update: {
        entitlementValue: params.isEnabled ? "1" : "0",
        updatedAt: now,
      },
      create: {
        tenantId: params.tenantId,
        moduleCode: params.moduleCode,
        entitlementKey: "enabled",
        entitlementValue: params.isEnabled ? "1" : "0",
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        module: "subscription",
        entityName: "tenant_modules",
        entityId: params.moduleCode,
        action: "tenant.module.toggled",
        payload: {
          moduleCode: params.moduleCode,
          isEnabled: params.isEnabled,
          reason: params.reason ?? null,
        },
      },
    });

    const currentSubscription = await tx.tenantSubscriptions.findFirst({
      where: {
        tenantId: params.tenantId,
        deletedAt: null,
        status: {
          in: ["trialing", "active", "past_due", "suspended"],
        },
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        code: true,
      },
    });

    const rows = await tx.tenantModule.findMany({
      where: {
        tenantId: params.tenantId,
      },
      select: {
        code: true,
        isEnabled: true,
      },
    });

    return mergeModuleAccessWithOverrides(getPlanModuleAccess(toPlanCode(currentSubscription?.code)), rows);
  });
}

export async function getPlanUsageSummary(tenantId: string) {
  const [subscription, usageRows, entitlements] = await Promise.all([
    getCurrentSubscription(tenantId),
    prisma.tenantUsageCounter.findMany({
      where: {
        tenantId,
      },
      take: 200,
    }),
    prisma.tenantModuleEntitlement.findMany({
      where: {
        tenantId,
        moduleCode: "core",
      },
    }),
  ]);

  const moduleAccess = await getTenantModuleAccess(tenantId, subscription?.code ?? null);

  return {
    subscription,
    usage: usageRows.map((row) => ({
      key: row.metricKey,
      value: row.metricValue.toNumber(),
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
    })),
    entitlements: entitlements.map((row) => ({
      key: row.entitlementKey,
      value: row.entitlementValue,
    })),
    modules: PANEL_MODULE_CODES.map((moduleCode) => ({
      code: moduleCode,
      label: PANEL_MODULE_LABELS[moduleCode],
      isEnabled: moduleAccess[moduleCode],
    })),
  };
}
