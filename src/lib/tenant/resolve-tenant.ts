import { prisma } from "@/lib/db/prisma";

export async function resolveTenantBySlug(tenantSlug: string) {
  return prisma.tenant.findFirst({
    where: {
      slug: tenantSlug,
      deletedAt: null,
      status: {
        in: ["TRIALING", "ACTIVE", "PAST_DUE"],
      },
    },
    select: {
      id: true,
      slug: true,
      legalName: true,
      tradeName: true,
      locale: true,
      timezone: true,
      currency: true,
      status: true,
      trialEndsAt: true,
      activeUntil: true,
    },
  });
}

export async function resolveTenantById(tenantId: string) {
  return prisma.tenant.findFirst({
    where: {
      id: tenantId,
      deletedAt: null,
      status: {
        in: ["TRIALING", "ACTIVE", "PAST_DUE"],
      },
    },
    select: {
      id: true,
      slug: true,
      legalName: true,
      tradeName: true,
      locale: true,
      timezone: true,
      currency: true,
      status: true,
      trialEndsAt: true,
      activeUntil: true,
    },
  });
}

export function extractTenantSlugFromHost(host?: string): string | null {
  if (!host) {
    return null;
  }

  const normalized = host.split(":")[0].toLowerCase();
  const parts = normalized.split(".");
  if (parts.length < 3) {
    return null;
  }

  const candidate = parts[0] || null;
  if (!candidate || candidate === "www") {
    return null;
  }

  return candidate;
}
