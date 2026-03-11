import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { PanelShell } from "@/components/layout/panel-shell";
import { ACCESS_COOKIE } from "@/lib/auth/session";
import { getOrSetServerCache } from "@/lib/cache/server-cache";
import { isDatabaseConnectionError } from "@/lib/db/error-utils";
import { prisma } from "@/lib/db/prisma";
import { getPlatformMaintenanceState } from "@/lib/platform/maintenance";
import { verifyAccessToken } from "@/lib/security/jwt";
import { getTenantContext } from "@/lib/tenant/context";
import { getCurrentSubscription } from "@/modules/subscription/application/subscription-service";

type DemoState = {
  label: string;
  dateLabel?: string;
  tone: "ok" | "warn" | "danger" | "neutral";
};

function formatDateOnly(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function extractEndDateFromPayload(payload: unknown): Date | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const raw = record.endsAt ?? record.endAt ?? record.trialEndsAt;
  if (typeof raw !== "string") {
    return null;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

type CompanyUiSettings = {
  companyName: string;
  tradeName: string;
  branchName: string;
  logoUrl: string;
};

type TenantUpdateNotice = {
  version: string;
  title: string;
  isForce: boolean;
  publishedAt?: string;
};

type TenantAnnouncement = {
  id: string;
  title: string;
  message: string;
  tone: "info" | "success" | "warning" | "danger";
  buttonLabel?: string | null;
  buttonUrl?: string | null;
  publishAt?: string | null;
  isPinned?: boolean;
};

const TENANT_ANNOUNCEMENTS_SCOPE = "duyurular";
const PLATFORM_ANNOUNCEMENTS_SCOPE = "platform_announcements";
const PANEL_TENANT_DATA_TTL_MS = Math.max(5_000, Number(process.env.PANEL_LAYOUT_CACHE_TTL_SECONDS ?? "20") * 1_000);

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readTone(value: unknown): TenantAnnouncement["tone"] {
  return value === "success" || value === "warning" || value === "danger" ? value : "info";
}

async function getCompanyUiSettings(tenantId: string): Promise<CompanyUiSettings> {
  const row = await prisma.tenantSettings.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      code: "firma_ayarlari",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!row || !row.payload || typeof row.payload !== "object" || Array.isArray(row.payload)) {
    return {
      companyName: "",
      tradeName: "",
      branchName: "",
      logoUrl: "",
    };
  }

  const payload = row.payload as Record<string, unknown>;
  return {
    companyName: readText(payload.companyName),
    tradeName: readText(payload.tradeName),
    branchName: readText(payload.branchName),
    logoUrl: readText(payload.logoUrl),
  };
}

function formatDateTimeShort(date: Date) {
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function getTenantUpdateNotice(tenantId: string): Promise<TenantUpdateNotice | null> {
  const row = await prisma.tenantSettings.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      code: "sistem_guncelleme",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!row || !row.payload || typeof row.payload !== "object" || Array.isArray(row.payload)) {
    return null;
  }

  const payload = row.payload as Record<string, unknown>;
  const items = Array.isArray(payload.items) ? payload.items : [];
  const now = new Date();

  const active = items
    .map((item) => (typeof item === "object" && item !== null && !Array.isArray(item) ? (item as Record<string, unknown>) : null))
    .filter((item): item is Record<string, unknown> => item !== null)
    .filter((item) => {
      if (!readBoolean(item.isActive, true)) {
        return false;
      }

      const publishAtRaw = readText(item.publishAt);
      if (publishAtRaw) {
        const publishAt = new Date(publishAtRaw);
        if (!Number.isNaN(publishAt.getTime()) && publishAt > now) {
          return false;
        }
      }

      const expiresAtRaw = readText(item.expiresAt);
      if (expiresAtRaw) {
        const expiresAt = new Date(expiresAtRaw);
        if (!Number.isNaN(expiresAt.getTime()) && expiresAt < now) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const aPinned = readBoolean(a.isPinned, false);
      const bPinned = readBoolean(b.isPinned, false);
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }
      return readText(b.createdAt).localeCompare(readText(a.createdAt));
    });

  const first = active[0];
  if (!first) {
    return null;
  }

  const version = readText(first.version);
  const title = readText(first.title);
  if (!version || !title) {
    return null;
  }

  const publishAt = readText(first.publishAt);
  const publishedAt = publishAt ? formatDateTimeShort(new Date(publishAt)) : undefined;

  return {
    version,
    title,
    isForce: readBoolean(first.isForce, false),
    publishedAt,
  };
}

async function getTenantAnnouncements(tenantId: string): Promise<TenantAnnouncement[]> {
  function mapAndFilterAnnouncementItems(
    items: unknown[],
    tenantScope: "tenant" | "platform",
  ): TenantAnnouncement[] {
    const now = new Date();

    return items
      .map((item) => (typeof item === "object" && item !== null && !Array.isArray(item) ? (item as Record<string, unknown>) : null))
      .filter((item): item is Record<string, unknown> => item !== null)
      .filter((item) => {
        if (!readBoolean(item.isActive, true)) {
          return false;
        }

        const publishAtRaw = readText(item.publishAt);
        if (publishAtRaw) {
          const publishAt = new Date(publishAtRaw);
          if (!Number.isNaN(publishAt.getTime()) && publishAt > now) {
            return false;
          }
        }

        const expiresAtRaw = readText(item.expiresAt);
        if (expiresAtRaw) {
          const expiresAt = new Date(expiresAtRaw);
          if (!Number.isNaN(expiresAt.getTime()) && expiresAt < now) {
            return false;
          }
        }

        if (tenantScope === "platform") {
          const targetScope = readText(item.targetScope);
          if (targetScope === "selected") {
            const tenantIds = Array.isArray(item.tenantIds) ? item.tenantIds : [];
            return tenantIds.some((value) => readText(value) === tenantId);
          }
        }

        return true;
      })
      .map((item) => ({
        id: readText(item.id) || crypto.randomUUID(),
        title: readText(item.title) || "Duyuru",
        message: readText(item.message),
        tone: readTone(item.tone),
        buttonLabel: readText(item.buttonLabel) || null,
        buttonUrl: readText(item.buttonUrl) || null,
        publishAt: readText(item.publishAt) || null,
        isPinned: readBoolean(item.isPinned, false),
      }))
      .filter((item) => item.message.length > 0)
      .sort((a, b) => {
        if ((a.isPinned ?? false) !== (b.isPinned ?? false)) {
          return a.isPinned ? -1 : 1;
        }
        return (b.publishAt ?? "").localeCompare(a.publishAt ?? "");
      });
  }

  const tenantRow = await prisma.tenantSettings.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      code: TENANT_ANNOUNCEMENTS_SCOPE,
    },
    orderBy: { createdAt: "desc" },
  });

  if (tenantRow && tenantRow.payload && typeof tenantRow.payload === "object" && !Array.isArray(tenantRow.payload)) {
    const tenantPayload = tenantRow.payload as Record<string, unknown>;
    const tenantItems = Array.isArray(tenantPayload.items) ? tenantPayload.items : [];
    return mapAndFilterAnnouncementItems(tenantItems, "tenant");
  }

  const platformRow = await prisma.appSettings.findFirst({
    where: {
      deletedAt: null,
      code: PLATFORM_ANNOUNCEMENTS_SCOPE,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!platformRow || !platformRow.payload || typeof platformRow.payload !== "object" || Array.isArray(platformRow.payload)) {
    return [];
  }

  const platformPayload = platformRow.payload as Record<string, unknown>;
  const platformItems = Array.isArray(platformPayload.items) ? platformPayload.items : [];
  return mapAndFilterAnnouncementItems(platformItems, "platform");
}

type PanelTenantData = {
  subscription: Awaited<ReturnType<typeof getCurrentSubscription>>;
  companyUiSettings: CompanyUiSettings;
  updateNotice: TenantUpdateNotice | null;
  announcements: TenantAnnouncement[];
};

async function getPanelTenantData(tenantId: string): Promise<PanelTenantData> {
  return getOrSetServerCache({
    key: `panel:tenant-data:${tenantId}`,
    ttlMs: PANEL_TENANT_DATA_TTL_MS,
    loader: async () => {
      const [subscription, companyUiSettings, updateNotice, announcements] = await Promise.all([
        getCurrentSubscription(tenantId),
        getCompanyUiSettings(tenantId),
        getTenantUpdateNotice(tenantId),
        getTenantAnnouncements(tenantId),
      ]);

      return {
        subscription,
        companyUiSettings,
        updateNotice,
        announcements,
      };
    },
  });
}

function resolveDemoState(params: {
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
  now: Date;
}): DemoState {
  const isTrial = Boolean(params.trialEndsAt);
  const endDate = params.trialEndsAt ?? params.subscriptionEndsAt;

  if (!endDate) {
    return {
      label: "Demo süresi tanımlı değil",
      tone: "neutral",
    };
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.ceil((endDate.getTime() - params.now.getTime()) / msPerDay);
  const dateLabel = `Bitiş: ${formatDateOnly(endDate)}`;

  if (diffDays < 0) {
    return {
      label: `${isTrial ? "Demo" : "Paket"} süresi ${Math.abs(diffDays)} gün önce doldu`,
      dateLabel,
      tone: "danger",
    };
  }

  if (diffDays === 0) {
    return {
      label: `${isTrial ? "Demo" : "Paket"} bugün sona eriyor`,
      dateLabel,
      tone: "danger",
    };
  }

  if (diffDays <= 3) {
    return {
      label: `${isTrial ? "Demo" : "Paket"} bitimine ${diffDays} gün`,
      dateLabel,
      tone: "warn",
    };
  }

  return {
    label: `${isTrial ? "Demo" : "Paket"} bitimine ${diffDays} gün`,
    dateLabel,
    tone: "ok",
  };
}

async function resolveTopbarUserName() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE)?.value;
    if (!token) {
      return "ADMIN";
    }

    const payload = await verifyAccessToken(token);
    const base = payload.email.split("@")[0]?.trim();
    if (!base) {
      return "ADMIN";
    }

    return base.toUpperCase();
  } catch {
    return "ADMIN";
  }
}

export default async function PanelLayout({ children }: { children: ReactNode }) {
  try {
    const [tenant, userName] = await Promise.all([getTenantContext(), resolveTopbarUserName()]);
    const [tenantData, maintenanceState] = await Promise.all([
      getPanelTenantData(tenant.tenantId),
      getPlatformMaintenanceState(),
    ]);
    const { subscription, companyUiSettings, updateNotice, announcements } = tenantData;
    const subscriptionEndsAt = extractEndDateFromPayload(subscription?.payload);
    const demoState = resolveDemoState({
      trialEndsAt: tenant.trialEndsAt,
      subscriptionEndsAt,
      now: new Date(),
    });

    const companyName =
      companyUiSettings.tradeName || companyUiSettings.companyName || tenant.tradeName || tenant.legalName;
    const branchName = companyUiSettings.branchName || "MERKEZ";
    const logoUrl = companyUiSettings.logoUrl || undefined;

    return (
      <PanelShell
        companyName={companyName}
        tenantSlug={tenant.tenantSlug}
        userName={userName}
        branchName={branchName}
        logoUrl={logoUrl}
        demoState={demoState}
        maintenanceState={maintenanceState}
        updateNotice={updateNotice}
        announcements={announcements}
      >
        {maintenanceState.enabled ? (
          <section className="rounded-xl border border-rose-300 bg-rose-50 p-6 text-rose-900 shadow-sm">
            <h2 className="text-xl font-black">Platform Bakim Modu Aktif</h2>
            <p className="mt-2 text-sm font-semibold">{maintenanceState.message}</p>
            <p className="mt-2 text-xs text-rose-700">
              Yazma islemleri gecici olarak durduruldu. Bu ekran bakim bitene kadar pasif kalir.
            </p>
          </section>
        ) : (
          children
        )}
      </PanelShell>
    );
  } catch (error) {
    const message = isDatabaseConnectionError(error)
      ? "Veritabani baglantisi kurulamadi. DATABASE_URL ayarini ve Neon erisim bilgilerini kontrol edin."
      : error instanceof Error
        ? error.message
        : "Panel yuklenirken beklenmeyen bir hata olustu.";

    return (
      <div className="mx-panel-shell flex min-h-screen items-center justify-center p-6">
        <section className="w-full max-w-2xl rounded-2xl border border-rose-300 bg-rose-50 p-6 text-rose-900 shadow-sm">
          <h1 className="text-xl font-black">Panel baslatilamadi</h1>
          <p className="mt-3 text-sm font-semibold">{message}</p>
          <p className="mt-2 text-xs text-rose-700">
            Sorun devam ederse ortam degiskenlerinde `DEFAULT_TENANT_SLUG` ve `DATABASE_URL` degerlerini dogrulayin veya
            giris ekranindan demo tenant olusturun.
          </p>
        </section>
      </div>
    );
  }
}
