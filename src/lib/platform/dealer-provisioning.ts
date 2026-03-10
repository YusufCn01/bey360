import { RoleScope, TenantStatus, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/security/password";
import { slugifyForTenant } from "@/lib/platform/dealer-application";
import { changeSubscriptionPlan } from "@/modules/subscription/application/subscription-service";
import type { TenantPlanCode } from "@/lib/subscription/limits";

export type ProvisionDealerTenantInput = {
  legalName: string;
  tradeName?: string | null;
  taxNumber: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPhone?: string | null;
  ownerPassword?: string;
  preferredSlug?: string | null;
  locale?: string;
  timezone?: string;
  currency?: string;
  status?: TenantStatus;
  trialDays?: number;
  autoAssignPlan?: boolean;
  planCode?: TenantPlanCode;
  billingCycle?: "monthly" | "yearly";
  actorUserId: string;
  actorEmail: string;
  statusReasonCode: string;
};

export type ProvisionDealerTenantResult = {
  tenantId: string;
  tenantSlug: string;
  ownerUserId: string;
  ownerEmail: string;
  generatedPassword: string | null;
  assignedPlan: {
    planCode: TenantPlanCode;
    billingCycle: "monthly" | "yearly";
    startsAt: string;
    endsAt: string;
  } | null;
};

function randomPassword(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%";
  let value = "";
  for (let index = 0; index < length; index += 1) {
    const next = Math.floor(Math.random() * alphabet.length);
    value += alphabet[next];
  }
  return value;
}

function isUniqueError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  return (error as { code?: string }).code === "P2002";
}

async function ensureUniqueTenantSlug(baseValue: string): Promise<string> {
  const base = slugifyForTenant(baseValue) || "yeni-bayi";
  let candidate = base;

  for (let index = 0; index < 1000; index += 1) {
    const exists = await prisma.tenant.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists) {
      return candidate;
    }
    candidate = `${base}-${index + 1}`;
  }

  return `${base}-${Date.now()}`;
}

export async function provisionDealerTenant(input: ProvisionDealerTenantInput): Promise<ProvisionDealerTenantResult> {
  const tenantStatus = input.status ?? TenantStatus.TRIALING;
  const trialDays = Math.min(Math.max(input.trialDays ?? 14, 1), 365);
  const ownerPassword = input.ownerPassword?.trim() || randomPassword(13);
  const ownerPasswordWasGenerated = !input.ownerPassword?.trim();
  const planCode = input.planCode ?? "starter";
  const billingCycle = input.billingCycle ?? "monthly";
  const normalizedSlug = await ensureUniqueTenantSlug(input.preferredSlug || input.tradeName || input.legalName);
  const now = new Date();
  const trialEndsAt = tenantStatus === TenantStatus.TRIALING ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null;

  const created = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        slug: normalizedSlug,
        legalName: input.legalName,
        tradeName: input.tradeName?.trim() || null,
        taxNumber: input.taxNumber,
        locale: input.locale ?? "tr-TR",
        timezone: input.timezone ?? "Europe/Istanbul",
        currency: (input.currency ?? "TRY").toUpperCase(),
        status: tenantStatus,
        trialEndsAt,
      },
    });

    const ownerRole = await tx.role.create({
      data: {
        tenantId: tenant.id,
        code: "tenant-owner",
        name: "Tenant Owner",
        scope: RoleScope.TENANT,
        isSystem: true,
      },
    });

    const permissions = await tx.permission.findMany({
      select: { id: true },
    });
    if (permissions.length > 0) {
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: ownerRole.id,
          permissionId: permission.id,
          contextKey: "global",
        })),
        skipDuplicates: true,
      });
    }

    const owner = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: input.ownerEmail.toLowerCase(),
        username: input.ownerEmail.split("@")[0].toLowerCase(),
        firstName: input.ownerFirstName,
        lastName: input.ownerLastName,
        phone: input.ownerPhone?.trim() || null,
        passwordHash: await hashPassword(ownerPassword),
        status: UserStatus.ACTIVE,
      },
    });

    await tx.userRole.create({
      data: {
        userId: owner.id,
        roleId: ownerRole.id,
        assignedBy: input.actorUserId,
      },
    });

    await tx.tenantModule.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: "pos",
        },
      },
      update: {
        name: "POS",
        isEnabled: true,
      },
      create: {
        tenantId: tenant.id,
        code: "pos",
        name: "POS",
        isEnabled: true,
      },
    });

    await tx.tenantStatusHistory.create({
      data: {
        tenantId: tenant.id,
        code: input.statusReasonCode,
        name: "Tenant created",
        status: "active",
        payload: {
          status: tenantStatus,
          createdBy: input.actorEmail,
          trialDays,
        },
        occurredAt: now,
      },
    });

    await tx.tenantSettings.create({
      data: {
        tenantId: tenant.id,
        code: "firma_ayarlari",
        name: "Firma Ayarlari",
        status: "active",
        payload: {
          companyName: input.legalName,
          tradeName: input.tradeName?.trim() || input.legalName,
          phone: input.ownerPhone?.trim() || null,
          branchName: "MERKEZ",
        },
        occurredAt: now,
      },
    });

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      ownerUserId: owner.id,
      ownerEmail: owner.email,
    };
  });

  let assignedPlan: ProvisionDealerTenantResult["assignedPlan"] = null;
  if (input.autoAssignPlan !== false) {
    const plan = await changeSubscriptionPlan({
      tenantId: created.tenantId,
      userId: input.actorUserId,
      planCode,
      billingCycle,
    });

    await prisma.tenant.update({
      where: { id: created.tenantId },
      data: {
        status: tenantStatus === TenantStatus.TRIALING ? TenantStatus.TRIALING : TenantStatus.ACTIVE,
        activeUntil: new Date(plan.endsAt),
      },
    });

    assignedPlan = {
      planCode,
      billingCycle,
      startsAt: plan.startsAt,
      endsAt: plan.endsAt,
    };
  }

  return {
    ...created,
    generatedPassword: ownerPasswordWasGenerated ? ownerPassword : null,
    assignedPlan,
  };
}

export { isUniqueError };
