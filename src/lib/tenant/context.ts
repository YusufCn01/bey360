import { cookies, headers } from "next/headers";
import { ACCESS_COOKIE } from "@/lib/auth/session";
import { verifyAccessToken } from "@/lib/security/jwt";
import {
  extractTenantSlugFromHost,
  resolveSingleActiveTenant,
  resolveTenantById,
  resolveTenantBySlug,
} from "@/lib/tenant/resolve-tenant";

export type TenantContext = {
  tenantId: string;
  tenantSlug: string;
  legalName: string;
  tradeName: string | null;
  locale: string;
  timezone: string;
  currency: string;
  status: string;
  trialEndsAt: Date | null;
  activeUntil: Date | null;
};

function normalizeTenantSlug(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

function getDefaultTenantSlug(): string | null {
  return normalizeTenantSlug(process.env.DEFAULT_TENANT_SLUG);
}

function toTenantContext(
  tenant: NonNullable<Awaited<ReturnType<typeof resolveTenantBySlug>>>,
): TenantContext {
  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    legalName: tenant.legalName,
    tradeName: tenant.tradeName,
    locale: tenant.locale,
    timezone: tenant.timezone,
    currency: tenant.currency,
    status: tenant.status,
    trialEndsAt: tenant.trialEndsAt,
    activeUntil: tenant.activeUntil,
  };
}

export async function getTenantContext(): Promise<TenantContext> {
  const headerStore = await headers();

  const tenantSlugFromHeaders = normalizeTenantSlug(
    headerStore.get("x-tenant-slug") ?? headerStore.get("x-tenant"),
  );
  const forwardedHost = headerStore.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headerStore.get("host") || undefined;
  const tenantSlugFromHost = extractTenantSlugFromHost(host);

  const tenantSlug = tenantSlugFromHeaders ?? tenantSlugFromHost ?? getDefaultTenantSlug();

  if (tenantSlug) {
    const tenant = await resolveTenantBySlug(tenantSlug);
    if (tenant) {
      return toTenantContext(tenant);
    }
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;

  if (accessToken) {
    try {
      const payload = await verifyAccessToken(accessToken);
      const tenantById = await resolveTenantById(payload.tenantId);
      if (tenantById) {
        return toTenantContext(tenantById);
      }
    } catch {
      // Ignore token parse errors and fail with deterministic tenant error below.
    }
  }

  const singleTenant = await resolveSingleActiveTenant();
  if (singleTenant) {
    return toTenantContext(singleTenant);
  }

  throw new Error(
    "Tenant bilgisi bulunamadi. DEFAULT_TENANT_SLUG ayarlayin veya giris ekranindan demo/tenant kaydi olusturun.",
  );
}
