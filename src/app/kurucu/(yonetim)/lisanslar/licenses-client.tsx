"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Envelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

type PlanCode = "starter" | "standard" | "professional" | "enterprise" | "custom";
type BillingCycle = "monthly" | "yearly";
type TenantStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED";
type RiskFilter = "all" | "missing" | "expired" | "critical" | "warning" | "safe";

type LicenseRow = {
  tenantId: string;
  tenantSlug: string;
  legalName: string;
  tradeName: string | null;
  tenantStatus: TenantStatus;
  trialEndsAt: string | null;
  activeUntil: string | null;
  license: {
    subscriptionId: string;
    code: string | null;
    status: string;
    billingCycle: string;
    startsAt: string;
    endsAt: string;
    changedBy: string;
    updatedAt: string;
  } | null;
};

type DraftMap = Record<
  string,
  {
    planCode: PlanCode;
    billingCycle: BillingCycle;
  }
>;

type LicenseRisk = "missing" | "expired" | "critical" | "warning" | "safe";

async function requestApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json()) as Envelope<T>;
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error?.message ?? "Islem basarisiz.");
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
  }).format(date);
}

function calcDaysLeft(value?: string | null) {
  const target = asDate(value);
  if (!target) {
    return null;
  }
  return Math.ceil((target.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function computeRisk(row: LicenseRow): { risk: LicenseRisk; daysLeft: number | null; endDate: string | null } {
  const endDate = row.license?.endsAt || row.activeUntil || row.trialEndsAt || null;
  const daysLeft = calcDaysLeft(endDate);

  if (!row.license) {
    return { risk: "missing", daysLeft, endDate };
  }
  if (daysLeft !== null && daysLeft < 0) {
    return { risk: "expired", daysLeft, endDate };
  }
  if (daysLeft !== null && daysLeft <= 7) {
    return { risk: "critical", daysLeft, endDate };
  }
  if (daysLeft !== null && daysLeft <= 30) {
    return { risk: "warning", daysLeft, endDate };
  }
  return { risk: "safe", daysLeft, endDate };
}

function riskLabel(risk: LicenseRisk): string {
  switch (risk) {
    case "missing":
      return "Lisans Yok";
    case "expired":
      return "Suresi Dolmus";
    case "critical":
      return "7 Gun Icinde Bitiyor";
    case "warning":
      return "30 Gun Icinde Bitiyor";
    default:
      return "Normal";
  }
}

function riskClass(risk: LicenseRisk): string {
  switch (risk) {
    case "missing":
      return "border-slate-300 bg-slate-100 text-slate-800";
    case "expired":
      return "border-rose-300 bg-rose-50 text-rose-900";
    case "critical":
      return "border-orange-300 bg-orange-50 text-orange-900";
    case "warning":
      return "border-amber-300 bg-amber-50 text-amber-900";
    default:
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
  }
}

function statusLabel(status: TenantStatus): string {
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

export function LicensesClient() {
  const [rows, setRows] = React.useState<LicenseRow[]>([]);
  const [drafts, setDrafts] = React.useState<DraftMap>({});
  const [query, setQuery] = React.useState("");
  const [appliedQuery, setAppliedQuery] = React.useState("");
  const [tenantStatusFilter, setTenantStatusFilter] = React.useState<"all" | TenantStatus>("all");
  const [riskFilter, setRiskFilter] = React.useState<RiskFilter>("all");
  const [busyTenantId, setBusyTenantId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const load = React.useCallback(async (search: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestApi<LicenseRow[]>(
        `/api/founder/licenses${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`,
      );
      setRows(data);
      setDrafts(
        Object.fromEntries(
          data.map((item) => [
            item.tenantId,
            {
              planCode: (item.license?.code as PlanCode | null) ?? "starter",
              billingCycle: item.license?.billingCycle === "yearly" ? "yearly" : "monthly",
            },
          ]),
        ) as DraftMap,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Lisans listesi yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load(appliedQuery);
  }, [appliedQuery, load]);

  async function applyPlan(tenantId: string) {
    const draft = drafts[tenantId];
    if (!draft) {
      return;
    }

    setBusyTenantId(tenantId);
    setError(null);
    setMessage(null);
    try {
      await requestApi("/api/founder/licenses", {
        method: "POST",
        body: JSON.stringify({
          tenantId,
          planCode: draft.planCode,
          billingCycle: draft.billingCycle,
        }),
      });
      setMessage("Lisans plani guncellendi.");
      await load(appliedQuery);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Lisans guncellenemedi.");
    } finally {
      setBusyTenantId(null);
    }
  }

  const filteredRows = React.useMemo(() => {
    return rows.filter((row) => {
      if (tenantStatusFilter !== "all" && row.tenantStatus !== tenantStatusFilter) {
        return false;
      }
      const risk = computeRisk(row).risk;
      if (riskFilter !== "all" && risk !== riskFilter) {
        return false;
      }
      return true;
    });
  }, [rows, tenantStatusFilter, riskFilter]);

  const summary = React.useMemo(() => {
    const totals = {
      total: rows.length,
      missing: 0,
      expired: 0,
      critical: 0,
      warning: 0,
      safe: 0,
    };
    for (const row of rows) {
      const risk = computeRisk(row).risk;
      totals[risk] += 1;
    }
    return totals;
  }, [rows]);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Lisans Yonetimi</CardTitle>
          <Button variant="secondary" onClick={() => void load(appliedQuery)} disabled={loading}>
            Yenile
          </Button>
        </div>

        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedQuery(query);
          }}
        >
          <div>
            <label className="mb-1 block text-xs font-semibold text-[color:var(--mx-text-muted)]">Bayi Ara</label>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Slug veya unvan"
              className="h-10 w-56"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[color:var(--mx-text-muted)]">Bayi Durumu</label>
            <select value={tenantStatusFilter} onChange={(event) => setTenantStatusFilter(event.target.value as "all" | TenantStatus)}>
              <option value="all">Tum Durumlar</option>
              <option value="ACTIVE">Aktif</option>
              <option value="TRIALING">Deneme</option>
              <option value="PAST_DUE">Borcu Gecmis</option>
              <option value="SUSPENDED">Askida</option>
              <option value="CANCELLED">Iptal</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[color:var(--mx-text-muted)]">Risk</label>
            <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}>
              <option value="all">Tum Riskler</option>
              <option value="missing">Lisans Yok</option>
              <option value="expired">Suresi Dolmus</option>
              <option value="critical">7 Gun Icinde Biten</option>
              <option value="warning">30 Gun Icinde Biten</option>
              <option value="safe">Normal</option>
            </select>
          </div>
          <Button type="submit">Ara</Button>
        </form>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-2">
            <p className="text-xs font-semibold text-[color:var(--mx-text-muted)]">Toplam</p>
            <p className="text-lg font-black">{summary.total}</p>
          </div>
          <div className="rounded-md border border-slate-300 bg-slate-100 p-2 text-slate-800">
            <p className="text-xs font-semibold">Lisans Yok</p>
            <p className="text-lg font-black">{summary.missing}</p>
          </div>
          <div className="rounded-md border border-rose-300 bg-rose-50 p-2 text-rose-900">
            <p className="text-xs font-semibold">Suresi Dolmus</p>
            <p className="text-lg font-black">{summary.expired}</p>
          </div>
          <div className="rounded-md border border-orange-300 bg-orange-50 p-2 text-orange-900">
            <p className="text-xs font-semibold">7 Gun Icinde</p>
            <p className="text-lg font-black">{summary.critical}</p>
          </div>
          <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900">
            <p className="text-xs font-semibold">30 Gun Icinde</p>
            <p className="text-lg font-black">{summary.warning}</p>
          </div>
          <div className="rounded-md border border-emerald-300 bg-emerald-50 p-2 text-emerald-900">
            <p className="text-xs font-semibold">Normal</p>
            <p className="text-lg font-black">{summary.safe}</p>
          </div>
        </div>

        {message ? (
          <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}
        {error ? (
          <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[color:var(--mx-surface-soft)]">
              <tr>
                <th className="px-2 py-2 text-left">Bayi</th>
                <th className="px-2 py-2 text-left">Bayi Durumu</th>
                <th className="px-2 py-2 text-left">Plan</th>
                <th className="px-2 py-2 text-left">Bitis Tarihi</th>
                <th className="px-2 py-2 text-left">Risk</th>
                <th className="px-2 py-2 text-left">Yeni Plan</th>
                <th className="px-2 py-2 text-left">Donem</th>
                <th className="px-2 py-2 text-left">Islem</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const draft = drafts[row.tenantId] ?? { planCode: "starter" as PlanCode, billingCycle: "monthly" as BillingCycle };
                const busy = busyTenantId === row.tenantId;
                const riskMeta = computeRisk(row);

                return (
                  <tr key={row.tenantId} className="border-t border-[color:var(--mx-border)]">
                    <td className="px-2 py-2">
                      <p className="font-semibold">{row.tradeName || row.legalName}</p>
                      <p className="text-xs text-[color:var(--mx-text-muted)]">{row.tenantSlug}</p>
                    </td>
                    <td className="px-2 py-2">{statusLabel(row.tenantStatus)}</td>
                    <td className="px-2 py-2">
                      <p>{row.license?.code?.toUpperCase() ?? "-"}</p>
                      <p className="text-xs text-[color:var(--mx-text-muted)]">{row.license?.status ?? "atanmamis"}</p>
                    </td>
                    <td className="px-2 py-2">
                      <p>{formatDate(riskMeta.endDate)}</p>
                      <p className="text-xs text-[color:var(--mx-text-muted)]">
                        {riskMeta.daysLeft === null ? "-" : `${riskMeta.daysLeft} gun`}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full border px-2 py-1 text-xs font-bold ${riskClass(riskMeta.risk)}`}>
                        {riskLabel(riskMeta.risk)}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={draft.planCode}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [row.tenantId]: {
                              ...draft,
                              planCode: event.target.value as PlanCode,
                            },
                          }))
                        }
                      >
                        <option value="starter">STARTER</option>
                        <option value="standard">STANDARD</option>
                        <option value="professional">PROFESSIONAL</option>
                        <option value="enterprise">ENTERPRISE</option>
                        <option value="custom">CUSTOM</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={draft.billingCycle}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [row.tenantId]: {
                              ...draft,
                              billingCycle: event.target.value as BillingCycle,
                            },
                          }))
                        }
                      >
                        <option value="monthly">Aylik</option>
                        <option value="yearly">Yillik</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <Button size="sm" onClick={() => void applyPlan(row.tenantId)} disabled={busy}>
                        {busy ? "Uygulaniyor..." : "Lisansi Uygula"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-2 py-6 text-center text-[color:var(--mx-text-muted)]">
                    Filtreye uygun lisans kaydi bulunamadi.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
