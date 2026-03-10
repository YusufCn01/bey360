import { prisma } from "@/lib/db/prisma";
import { planLimits, type TenantPlanCode } from "@/lib/subscription/limits";

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
    };
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
  };
}
