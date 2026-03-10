import { headers } from "next/headers";
import { resolveTenantBySlug } from "@/lib/tenant/resolve-tenant";

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

export async function getTenantContext(): Promise<TenantContext> {
  const headerStore = await headers();
  const tenantSlug = headerStore.get("x-tenant-slug") ?? headerStore.get("x-tenant");

  if (!tenantSlug) {
    throw new Error("Tenant bilgisi bulunamadı");
  }

  const tenant = await resolveTenantBySlug(tenantSlug);
  if (!tenant) {
    throw new Error("Tenant aktif değil veya bulunamadı");
  }

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
