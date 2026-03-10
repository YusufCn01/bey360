import { TenantStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const activeTenantWhere = {
  deletedAt: null,
  status: {
    in: [TenantStatus.TRIALING, TenantStatus.ACTIVE, TenantStatus.PAST_DUE],
  },
};

const tenantContextSelect = {
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
};

export async function resolveTenantBySlug(tenantSlug: string) {
  return prisma.tenant.findFirst({
    where: {
      slug: tenantSlug,
      ...activeTenantWhere,
    },
    select: tenantContextSelect,
  });
}

export async function resolveTenantById(tenantId: string) {
  return prisma.tenant.findFirst({
    where: {
      id: tenantId,
      ...activeTenantWhere,
    },
    select: tenantContextSelect,
  });
}

export async function resolveSingleActiveTenant() {
  const rows = await prisma.tenant.findMany({
    where: activeTenantWhere,
    select: tenantContextSelect,
    orderBy: { createdAt: "asc" },
    take: 2,
  });

  if (rows.length === 1) {
    return rows[0];
  }

  return null;
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
