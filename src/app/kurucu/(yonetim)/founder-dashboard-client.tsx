"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Envelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

type DealerStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED";

type DealerRow = {
  id: string;
  slug: string;
  legalName: string;
  tradeName: string | null;
  status: DealerStatus;
  activeUntil: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  owner: { email: string } | null;
  currentPlan: { code: string | null; endsAt: string } | null;
};

type LicenseRow = {
  tenantId: string;
  tenantSlug: string;
  legalName: string;
  tradeName: string | null;
  tenantStatus: DealerStatus;
  trialEndsAt: string | null;
  activeUntil: string | null;
  license: { code: string | null; status: string; endsAt: string } | null;
};

type AnnouncementRow = {
  id: string;
  isActive: boolean;
  isPinned: boolean;
  publishAt: string | null;
  expiresAt: string | null;
};

type UpdateRow = {
  id: string;
  isActive: boolean;
  isForce: boolean;
  isPinned: boolean;
  publishAt: string | null;
  expiresAt: string | null;
};

type MaintenanceState = {
  enabled: boolean;
  message: string;
  updatedAt: string | null;
};

type LicenseRisk = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantStatus: DealerStatus;
  planCode: string | null;
  endsAt: string | null;
  daysLeft: number | null;
  risk: "none" | "warning" | "critical" | "expired" | "missing";
};

async function requestApi<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const body = (await response.json()) as Envelope<T>;
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error?.message ?? "Veri alinamadi.");
  }
  return body.data;
}

function asDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function formatDate(value?: string | null) {
  const date = asDate(value);
  if (!date) {
    return "-";
  }
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status: DealerStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Aktif";
    case "TRIALING":
      return "Deneme";
    case "PAST_DUE":
      return "Borcu Gecmis";
    case "SUSPENDED":
      return "Askida";
    case "CANCELLED":
      return "Iptal";
    default:
      return status;
  }
}

function calcDaysLeft(targetIso: string | null, now: Date): number | null {
  const target = asDate(targetIso);
  if (!target) {
    return null;
  }
  return Math.ceil((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

function toRisk(row: LicenseRow, now: Date): LicenseRisk {
  const endsAt = row.license?.endsAt || row.activeUntil || row.trialEndsAt || null;
  const daysLeft = calcDaysLeft(endsAt, now);
  const isMissing = !row.license;

  let risk: LicenseRisk["risk"] = "none";
  if (isMissing) {
    risk = "missing";
  } else if (daysLeft !== null && daysLeft < 0) {
    risk = "expired";
  } else if (daysLeft !== null && daysLeft <= 7) {
    risk = "critical";
  } else if (daysLeft !== null && daysLeft <= 30) {
    risk = "warning";
  }

  return {
    tenantId: row.tenantId,
    tenantName: row.tradeName || row.legalName,
    tenantSlug: row.tenantSlug,
    tenantStatus: row.tenantStatus,
    planCode: row.license?.code ?? null,
    endsAt,
    daysLeft,
    risk,
  };
}

function riskBadgeClass(risk: LicenseRisk["risk"]): string {
  switch (risk) {
    case "expired":
      return "border-rose-300 bg-rose-50 text-rose-900";
    case "critical":
      return "border-orange-300 bg-orange-50 text-orange-900";
    case "warning":
      return "border-amber-300 bg-amber-50 text-amber-900";
    case "missing":
      return "border-slate-300 bg-slate-100 text-slate-800";
    default:
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
  }
}

function riskLabel(risk: LicenseRisk["risk"]): string {
  switch (risk) {
    case "expired":
      return "Suresi Dolmus";
    case "critical":
      return "Kritik";
    case "warning":
      return "Yaklasan Bitis";
    case "missing":
      return "Lisans Yok";
    default:
      return "Normal";
  }
}

function scheduleState(publishAt: string | null, expiresAt: string | null, now: Date): "scheduled" | "expired" | "live" {
  const publishDate = asDate(publishAt);
  const expiresDate = asDate(expiresAt);
  if (publishDate && publishDate.getTime() > now.getTime()) {
    return "scheduled";
  }
  if (expiresDate && expiresDate.getTime() < now.getTime()) {
    return "expired";
  }
  return "live";
}

const quickLinks = [
  { href: "/kurucu/bayi-basvurulari", label: "Bayi Basvurulari" },
  { href: "/kurucu/bayilikler", label: "Bayilik Yonetimi" },
  { href: "/kurucu/lisanslar", label: "Lisans Operasyonu" },
  { href: "/kurucu/duyurular", label: "Duyuru Merkezi" },
  { href: "/kurucu/guncellemeler", label: "Guncelleme Dagitimi" },
  { href: "/kurucu/bakim-modu", label: "Bakim Modu" },
];

export function FounderDashboardClient() {
  const [dealers, setDealers] = React.useState<DealerRow[]>([]);
  const [licenses, setLicenses] = React.useState<LicenseRow[]>([]);
  const [announcements, setAnnouncements] = React.useState<AnnouncementRow[]>([]);
  const [updates, setUpdates] = React.useState<UpdateRow[]>([]);
  const [maintenance, setMaintenance] = React.useState<MaintenanceState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dealerRows, licenseRows, announcementRows, updateRows, maintenanceState] = await Promise.all([
        requestApi<DealerRow[]>("/api/founder/dealers"),
        requestApi<LicenseRow[]>("/api/founder/licenses"),
        requestApi<AnnouncementRow[]>("/api/founder/announcements"),
        requestApi<UpdateRow[]>("/api/founder/updates"),
        requestApi<MaintenanceState>("/api/founder/maintenance"),
      ]);
      setDealers(dealerRows);
      setLicenses(licenseRows);
      setAnnouncements(announcementRows);
      setUpdates(updateRows);
      setMaintenance(maintenanceState);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Veriler alinamadi.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const now = new Date();

  const licenseRisks = licenses.map((row) => toRisk(row, now));
  const riskRows = licenseRisks
    .filter((row) => row.risk !== "none")
    .sort((a, b) => {
      const av = a.daysLeft ?? Number.POSITIVE_INFINITY;
      const bv = b.daysLeft ?? Number.POSITIVE_INFINITY;
      return av - bv;
    });

  const dealerTotals = {
    active: dealers.filter((item) => item.status === "ACTIVE").length,
    trial: dealers.filter((item) => item.status === "TRIALING").length,
    pastDue: dealers.filter((item) => item.status === "PAST_DUE").length,
    suspended: dealers.filter((item) => item.status === "SUSPENDED").length,
    cancelled: dealers.filter((item) => item.status === "CANCELLED").length,
  };

  const licenseTotals = {
    active: licenses.filter((item) => item.license?.status === "active").length,
    missing: licenseRisks.filter((item) => item.risk === "missing").length,
    expired: licenseRisks.filter((item) => item.risk === "expired").length,
    due7: licenseRisks.filter((item) => item.risk === "critical").length,
    due30: licenseRisks.filter((item) => item.risk === "warning").length,
  };

  let announcementActive = 0;
  let announcementScheduled = 0;
  let announcementExpired = 0;
  let announcementPinned = 0;
  for (const item of announcements) {
    if (item.isPinned) {
      announcementPinned += 1;
    }
    if (item.isActive) {
      announcementActive += 1;
    }
    const state = scheduleState(item.publishAt, item.expiresAt, now);
    if (state === "scheduled") {
      announcementScheduled += 1;
    } else if (state === "expired") {
      announcementExpired += 1;
    }
  }
  const announcementTotals = {
    active: announcementActive,
    scheduled: announcementScheduled,
    expired: announcementExpired,
    pinned: announcementPinned,
  };

  let updateActive = 0;
  let updateForced = 0;
  let updateScheduled = 0;
  let updateExpired = 0;
  for (const item of updates) {
    if (item.isActive) {
      updateActive += 1;
    }
    if (item.isActive && item.isForce) {
      updateForced += 1;
    }
    const state = scheduleState(item.publishAt, item.expiresAt, now);
    if (state === "scheduled") {
      updateScheduled += 1;
    } else if (state === "expired") {
      updateExpired += 1;
    }
  }
  const updateTotals = {
    active: updateActive,
    forced: updateForced,
    scheduled: updateScheduled,
    expired: updateExpired,
  };

  const newestDealers = dealers.slice(0, 8);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Kurucu Yonetim Ozeti</CardTitle>
            <p className="text-sm text-[color:var(--mx-text-muted)]">Bayi, lisans ve yayin akislarindaki kritik noktalar tek ekranda.</p>
          </div>
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            Yenile
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-cyan-900">
              <p className="text-xs font-semibold uppercase tracking-wide">Toplam Bayi</p>
              <p className="mt-1 text-2xl font-black">{dealers.length}</p>
              <p className="text-xs font-semibold">Aktif: {dealerTotals.active}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="text-xs font-semibold uppercase tracking-wide">Tahsilat Riski</p>
              <p className="mt-1 text-2xl font-black">{dealerTotals.pastDue}</p>
              <p className="text-xs font-semibold">Askida: {dealerTotals.suspended}</p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-900">
              <p className="text-xs font-semibold uppercase tracking-wide">Lisans Riski</p>
              <p className="mt-1 text-2xl font-black">{licenseTotals.expired + licenseTotals.due7}</p>
              <p className="text-xs font-semibold">Dolmus: {licenseTotals.expired}</p>
            </div>
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-violet-900">
              <p className="text-xs font-semibold uppercase tracking-wide">Duyuru Akisi</p>
              <p className="mt-1 text-2xl font-black">{announcementTotals.active}</p>
              <p className="text-xs font-semibold">Planli: {announcementTotals.scheduled}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
              <p className="text-xs font-semibold uppercase tracking-wide">Guncelleme Akisi</p>
              <p className="mt-1 text-2xl font-black">{updateTotals.active}</p>
              <p className="text-xs font-semibold">Zorunlu: {updateTotals.forced}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--mx-text-muted)]">Deneme Bayi</p>
              <p className="mt-1 text-xl font-black">{dealerTotals.trial}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--mx-text-muted)]">Iptal Bayi</p>
              <p className="mt-1 text-xl font-black">{dealerTotals.cancelled}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--mx-text-muted)]">Aktif Lisans</p>
              <p className="mt-1 text-xl font-black">{licenseTotals.active}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--mx-text-muted)]">Lisans Yok</p>
              <p className="mt-1 text-xl font-black">{licenseTotals.missing}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--mx-text-muted)]">30 Gun Icinde Biten</p>
              <p className="mt-1 text-xl font-black">{licenseTotals.due30 + licenseTotals.due7}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--mx-text-muted)]">Sabit Duyurular</p>
              <p className="mt-1 text-xl font-black">{announcementTotals.pinned}</p>
            </div>
          </div>

          <div className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--mx-text-muted)]">Hizli Yonetim</p>
            <div className="flex flex-wrap gap-2">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] px-3 py-2 text-sm font-semibold hover:bg-[color:var(--mx-surface-soft)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {maintenance?.enabled ? (
            <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-rose-900">
              <p className="text-xs font-semibold uppercase tracking-wide">Bakim Modu Aktif</p>
              <p className="mt-1 text-sm font-semibold">{maintenance.message}</p>
              <p className="text-xs">Guncelleme: {formatDate(maintenance.updatedAt)}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lisans Riski Olan Bayiler</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[color:var(--mx-surface-soft)]">
              <tr>
                <th className="px-2 py-2 text-left">Bayi</th>
                <th className="px-2 py-2 text-left">Durum</th>
                <th className="px-2 py-2 text-left">Plan</th>
                <th className="px-2 py-2 text-left">Bitis</th>
                <th className="px-2 py-2 text-left">Risk</th>
              </tr>
            </thead>
            <tbody>
              {riskRows.slice(0, 10).map((row) => (
                <tr key={row.tenantId} className="border-t border-[color:var(--mx-border)]">
                  <td className="px-2 py-2">
                    <p className="font-semibold">{row.tenantName}</p>
                    <p className="text-xs text-[color:var(--mx-text-muted)]">{row.tenantSlug}</p>
                  </td>
                  <td className="px-2 py-2">{statusLabel(row.tenantStatus)}</td>
                  <td className="px-2 py-2">{row.planCode?.toUpperCase() ?? "-"}</td>
                  <td className="px-2 py-2">{formatDate(row.endsAt)}</td>
                  <td className="px-2 py-2">
                    <span className={`rounded-full border px-2 py-1 text-xs font-bold ${riskBadgeClass(row.risk)}`}>
                      {riskLabel(row.risk)}
                      {row.daysLeft !== null ? ` (${row.daysLeft} gun)` : ""}
                    </span>
                  </td>
                </tr>
              ))}
              {riskRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-[color:var(--mx-text-muted)]">
                    Kritik lisans kaydi bulunmuyor.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Son Bayilikler</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[color:var(--mx-surface-soft)]">
              <tr>
                <th className="px-2 py-2 text-left">Bayi</th>
                <th className="px-2 py-2 text-left">Durum</th>
                <th className="px-2 py-2 text-left">Sahip</th>
                <th className="px-2 py-2 text-left">Plan</th>
                <th className="px-2 py-2 text-left">Lisans Bitis</th>
                <th className="px-2 py-2 text-left">Kayit Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {newestDealers.map((dealer) => (
                <tr key={dealer.id} className="border-t border-[color:var(--mx-border)]">
                  <td className="px-2 py-2">
                    <p className="font-semibold">{dealer.tradeName || dealer.legalName}</p>
                    <p className="text-xs text-[color:var(--mx-text-muted)]">{dealer.slug}</p>
                  </td>
                  <td className="px-2 py-2">{statusLabel(dealer.status)}</td>
                  <td className="px-2 py-2">{dealer.owner?.email ?? "-"}</td>
                  <td className="px-2 py-2">{dealer.currentPlan?.code?.toUpperCase() ?? "-"}</td>
                  <td className="px-2 py-2">{formatDate(dealer.currentPlan?.endsAt || dealer.activeUntil || dealer.trialEndsAt)}</td>
                  <td className="px-2 py-2">{formatDate(dealer.createdAt)}</td>
                </tr>
              ))}
              {newestDealers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-[color:var(--mx-text-muted)]">
                    Kayitli bayi bulunamadi.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
