import { TenantStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type TenantSnapshot = {
  id: string;
  slug: string;
  legalName: string;
  tradeName: string | null;
  locale: string;
  timezone: string;
  currency: string;
  status: TenantStatus;
  trialEndsAt: Date | null;
  activeUntil: Date | null;
};

type CacheEntry = {
  value: TenantSnapshot | null;
  expiresAt: number;
};

type TenantCacheState = {
  bySlug: Map<string, CacheEntry>;
  byId: Map<string, CacheEntry>;
  singleActive: CacheEntry | null;
};

type GlobalWithTenantCache = typeof globalThis & {
  __tenantResolverCache?: TenantCacheState;
};

const TENANT_CACHE_TTL_MS = Math.max(5_000, Number(process.env.TENANT_CACHE_TTL_SECONDS ?? "60") * 1_000);

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
} as const;

function getTenantCache(): TenantCacheState {
  const globalScope = globalThis as GlobalWithTenantCache;
  if (!globalScope.__tenantResolverCache) {
    globalScope.__tenantResolverCache = {
      bySlug: new Map<string, CacheEntry>(),
      byId: new Map<string, CacheEntry>(),
      singleActive: null,
    };
  }

  return globalScope.__tenantResolverCache;
}

function readCache(map: Map<string, CacheEntry>, key: string): TenantSnapshot | null | undefined {
  const entry = map.get(key);
  if (!entry) {
    return undefined;
  }

  if (entry.expiresAt <= Date.now()) {
    map.delete(key);
    return undefined;
  }

  return entry.value;
}

function writeCache(cache: TenantCacheState, tenant: TenantSnapshot | null, slug?: string, id?: string) {
  const entry: CacheEntry = {
    value: tenant,
    expiresAt: Date.now() + TENANT_CACHE_TTL_MS,
  };

  if (slug) {
    cache.bySlug.set(slug, entry);
  }

  if (id) {
    cache.byId.set(id, entry);
  }
}

export async function resolveTenantBySlug(tenantSlug: string): Promise<TenantSnapshot | null> {
  const normalizedSlug = tenantSlug.trim().toLowerCase();
  const cache = getTenantCache();
  const cached = readCache(cache.bySlug, normalizedSlug);
  if (cached !== undefined) {
    return cached;
  }

  const tenant = (await prisma.tenant.findFirst({
    where: {
      slug: normalizedSlug,
      ...activeTenantWhere,
    },
    select: tenantContextSelect,
  })) as TenantSnapshot | null;

  writeCache(cache, tenant, normalizedSlug, tenant?.id);
  return tenant;
}

export async function resolveTenantById(tenantId: string): Promise<TenantSnapshot | null> {
  const normalizedId = tenantId.trim();
  const cache = getTenantCache();
  const cached = readCache(cache.byId, normalizedId);
  if (cached !== undefined) {
    return cached;
  }

  const tenant = (await prisma.tenant.findFirst({
    where: {
      id: normalizedId,
      ...activeTenantWhere,
    },
    select: tenantContextSelect,
  })) as TenantSnapshot | null;

  writeCache(cache, tenant, tenant?.slug, normalizedId);
  return tenant;
}

export async function resolveSingleActiveTenant(): Promise<TenantSnapshot | null> {
  const cache = getTenantCache();
  const now = Date.now();
  const cached = cache.singleActive;

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const rows = (await prisma.tenant.findMany({
    where: activeTenantWhere,
    select: tenantContextSelect,
    orderBy: { createdAt: "asc" },
    take: 2,
  })) as TenantSnapshot[];

  const single = rows.length === 1 ? rows[0] : null;

  cache.singleActive = {
    value: single,
    expiresAt: now + TENANT_CACHE_TTL_MS,
  };

  if (single) {
    writeCache(cache, single, single.slug, single.id);
  }

  return single;
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
