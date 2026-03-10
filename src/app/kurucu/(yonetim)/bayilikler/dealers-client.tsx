"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Envelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

type DealerStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED";
type DealerFilterStatus = "all" | DealerStatus;

type DealerRow = {
  id: string;
  slug: string;
  legalName: string;
  tradeName: string | null;
  taxNumber: string;
  status: DealerStatus;
  trialEndsAt: string | null;
  activeUntil: string | null;
  owner: {
    id: string;
    email: string;
    fullName: string;
    status: string;
  } | null;
  currentPlan: {
    id: string;
    code: string | null;
    status: string;
    billingCycle: string;
    startsAt: string;
    endsAt: string;
  } | null;
};

type CreateDealerForm = {
  slug: string;
  legalName: string;
  tradeName: string;
  taxNumber: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPassword: string;
  status: DealerStatus;
  autoAssignPlan: boolean;
  planCode: "starter" | "standard" | "professional" | "enterprise" | "custom";
  billingCycle: "monthly" | "yearly";
};

type DealerDraftMap = Record<
  string,
  {
    status: DealerStatus;
    trialEndsAt: string;
    activeUntil: string;
    note: string;
  }
>;

const initialCreateForm: CreateDealerForm = {
  slug: "",
  legalName: "",
  tradeName: "",
  taxNumber: "",
  ownerEmail: "",
  ownerFirstName: "",
  ownerLastName: "",
  ownerPassword: "",
  status: "ACTIVE",
  autoAssignPlan: true,
  planCode: "starter",
  billingCycle: "monthly",
};

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

function toDateInput(value?: string | null): string {
  const date = asDate(value);
  if (!date) {
    return "";
  }
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateInputToIso(value: string): string | null {
  if (!value.trim()) {
    return null;
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
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

function riskMeta(row: DealerRow): { label: string; className: string } {
  const end = row.currentPlan?.endsAt || row.activeUntil || row.trialEndsAt;
  const target = asDate(end);

  if (!row.currentPlan) {
    return { label: "Plan YOK", className: "border-slate-300 bg-slate-100 text-slate-800" };
  }
  if (!target) {
    return { label: "Bitis Yok", className: "border-slate-300 bg-slate-100 text-slate-800" };
  }
  const days = Math.ceil((target.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) {
    return { label: `Dolmus (${Math.abs(days)}g)`, className: "border-rose-300 bg-rose-50 text-rose-900" };
  }
  if (days <= 7) {
    return { label: `${days} gun`, className: "border-orange-300 bg-orange-50 text-orange-900" };
  }
  if (days <= 30) {
    return { label: `${days} gun`, className: "border-amber-300 bg-amber-50 text-amber-900" };
  }
  return { label: `${days} gun`, className: "border-emerald-300 bg-emerald-50 text-emerald-900" };
}

export function DealersClient() {
  const [rows, setRows] = React.useState<DealerRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [busyRowId, setBusyRowId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [appliedQuery, setAppliedQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<DealerFilterStatus>("all");
  const [form, setForm] = React.useState<CreateDealerForm>(initialCreateForm);
  const [drafts, setDrafts] = React.useState<DealerDraftMap>({});
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (search: string, status: DealerFilterStatus) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("q", search.trim());
      }
      if (status !== "all") {
        params.set("status", status);
      }
      const suffix = params.toString();
      const data = await requestApi<DealerRow[]>(`/api/founder/dealers${suffix ? `?${suffix}` : ""}`);
      setRows(data);
      setDrafts(
        Object.fromEntries(
          data.map((item) => [
            item.id,
            {
              status: item.status,
              trialEndsAt: toDateInput(item.trialEndsAt),
              activeUntil: toDateInput(item.activeUntil),
              note: "",
            },
          ]),
        ) as DealerDraftMap,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Bayi listesi yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load(appliedQuery, statusFilter);
  }, [appliedQuery, statusFilter, load]);

  function patchForm<K extends keyof CreateDealerForm>(key: K, value: CreateDealerForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function patchDraft<K extends keyof DealerDraftMap[string]>(id: string, key: K, value: DealerDraftMap[string][K]) {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { status: "ACTIVE", trialEndsAt: "", activeUntil: "", note: "" }),
        [key]: value,
      },
    }));
  }

  async function createDealer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await requestApi("/api/founder/dealers", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage("Yeni bayi olusturuldu.");
      setForm(initialCreateForm);
      await load(appliedQuery, statusFilter);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Bayi olusturulamadi.");
    } finally {
      setBusy(false);
    }
  }

  async function updateDealerStatus(tenantId: string) {
    const draft = drafts[tenantId];
    if (!draft) {
      return;
    }

    setBusyRowId(tenantId);
    setError(null);
    setMessage(null);
    try {
      await requestApi("/api/founder/dealers", {
        method: "PATCH",
        body: JSON.stringify({
          tenantId,
          status: draft.status,
          trialEndsAt: dateInputToIso(draft.trialEndsAt),
          activeUntil: dateInputToIso(draft.activeUntil),
          note: draft.note.trim() || undefined,
        }),
      });
      setMessage("Bayi kaydi guncellendi.");
      await load(appliedQuery, statusFilter);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Bayi guncellenemedi.");
    } finally {
      setBusyRowId(null);
    }
  }

  const summary = React.useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((item) => item.status === "ACTIVE").length,
      trial: rows.filter((item) => item.status === "TRIALING").length,
      pastDue: rows.filter((item) => item.status === "PAST_DUE").length,
      suspended: rows.filter((item) => item.status === "SUSPENDED").length,
      cancelled: rows.filter((item) => item.status === "CANCELLED").length,
    };
  }, [rows]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Yeni Bayi Ac</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createDealer} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">Slug</label>
                <input value={form.slug} onChange={(event) => patchForm("slug", event.target.value)} placeholder="ornek-bayi" required />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold">Yasal Unvan</label>
                <input value={form.legalName} onChange={(event) => patchForm("legalName", event.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Ticari Unvan</label>
                <input value={form.tradeName} onChange={(event) => patchForm("tradeName", event.target.value)} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">Vergi No</label>
                <input value={form.taxNumber} onChange={(event) => patchForm("taxNumber", event.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Sahip E-posta</label>
                <input type="email" value={form.ownerEmail} onChange={(event) => patchForm("ownerEmail", event.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Sahip Ad</label>
                <input value={form.ownerFirstName} onChange={(event) => patchForm("ownerFirstName", event.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Sahip Soyad</label>
                <input value={form.ownerLastName} onChange={(event) => patchForm("ownerLastName", event.target.value)} required />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              <div>
                <label className="mb-1 block text-sm font-semibold">Gecici Sifre</label>
                <input
                  type="password"
                  minLength={8}
                  value={form.ownerPassword}
                  onChange={(event) => patchForm("ownerPassword", event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Bayi Durumu</label>
                <select value={form.status} onChange={(event) => patchForm("status", event.target.value as DealerStatus)}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="TRIALING">TRIALING</option>
                  <option value="PAST_DUE">PAST_DUE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Plan</label>
                <select
                  value={form.planCode}
                  onChange={(event) =>
                    patchForm(
                      "planCode",
                      event.target.value as "starter" | "standard" | "professional" | "enterprise" | "custom",
                    )
                  }
                >
                  <option value="starter">STARTER</option>
                  <option value="standard">STANDARD</option>
                  <option value="professional">PROFESSIONAL</option>
                  <option value="enterprise">ENTERPRISE</option>
                  <option value="custom">CUSTOM</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Donem</label>
                <select
                  value={form.billingCycle}
                  onChange={(event) => patchForm("billingCycle", event.target.value as "monthly" | "yearly")}
                >
                  <option value="monthly">Aylik</option>
                  <option value="yearly">Yillik</option>
                </select>
              </div>
              <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={form.autoAssignPlan}
                  onChange={(event) => patchForm("autoAssignPlan", event.target.checked)}
                />
                Ilk lisans otomatik atansin
              </label>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={busy}>
                {busy ? "Kaydediliyor..." : "Bayi Olustur"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Bayi Listesi</CardTitle>
            <Button variant="secondary" onClick={() => void load(appliedQuery, statusFilter)} disabled={loading || busy}>
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
              <label className="mb-1 block text-xs font-semibold text-[color:var(--mx-text-muted)]">Arama</label>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Slug, unvan veya vergi no"
                className="h-10 w-64"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--mx-text-muted)]">Durum</label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as DealerFilterStatus)}>
                <option value="all">Tum Durumlar</option>
                <option value="ACTIVE">Aktif</option>
                <option value="TRIALING">Deneme</option>
                <option value="PAST_DUE">Borcu Gecmis</option>
                <option value="SUSPENDED">Askida</option>
                <option value="CANCELLED">Iptal</option>
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
            <div className="rounded-md border border-emerald-300 bg-emerald-50 p-2 text-emerald-900">
              <p className="text-xs font-semibold">Aktif</p>
              <p className="text-lg font-black">{summary.active}</p>
            </div>
            <div className="rounded-md border border-cyan-300 bg-cyan-50 p-2 text-cyan-900">
              <p className="text-xs font-semibold">Deneme</p>
              <p className="text-lg font-black">{summary.trial}</p>
            </div>
            <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900">
              <p className="text-xs font-semibold">Borcu Gecmis</p>
              <p className="text-lg font-black">{summary.pastDue}</p>
            </div>
            <div className="rounded-md border border-orange-300 bg-orange-50 p-2 text-orange-900">
              <p className="text-xs font-semibold">Askida</p>
              <p className="text-lg font-black">{summary.suspended}</p>
            </div>
            <div className="rounded-md border border-slate-300 bg-slate-100 p-2 text-slate-800">
              <p className="text-xs font-semibold">Iptal</p>
              <p className="text-lg font-black">{summary.cancelled}</p>
            </div>
          </div>

          {message ? (
            <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
          ) : null}
          {error ? (
            <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

          <div className="overflow-auto">
            <table className="min-w-[1160px] text-sm">
              <thead className="bg-[color:var(--mx-surface-soft)]">
                <tr>
                  <th className="px-2 py-2 text-left">Bayi</th>
                  <th className="px-2 py-2 text-left">Sahip</th>
                  <th className="px-2 py-2 text-left">Plan</th>
                  <th className="px-2 py-2 text-left">Lisans Bitis</th>
                  <th className="px-2 py-2 text-left">Risk</th>
                  <th className="px-2 py-2 text-left">Durum</th>
                  <th className="px-2 py-2 text-left">Trial Son</th>
                  <th className="px-2 py-2 text-left">Aktif Son</th>
                  <th className="px-2 py-2 text-left">Not</th>
                  <th className="px-2 py-2 text-left">Islem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const draft = drafts[row.id] ?? {
                    status: row.status,
                    trialEndsAt: toDateInput(row.trialEndsAt),
                    activeUntil: toDateInput(row.activeUntil),
                    note: "",
                  };
                  const risk = riskMeta(row);
                  const rowBusy = busyRowId === row.id;

                  return (
                    <tr key={row.id} className="border-t border-[color:var(--mx-border)]">
                      <td className="px-2 py-2">
                        <p className="font-semibold">{row.tradeName || row.legalName}</p>
                        <p className="text-xs text-[color:var(--mx-text-muted)]">
                          {row.slug} - {row.taxNumber}
                        </p>
                      </td>
                      <td className="px-2 py-2">{row.owner?.email ?? "-"}</td>
                      <td className="px-2 py-2">
                        <p>{row.currentPlan?.code?.toUpperCase() ?? "-"}</p>
                        <p className="text-xs text-[color:var(--mx-text-muted)]">{row.currentPlan?.billingCycle || "-"}</p>
                      </td>
                      <td className="px-2 py-2">{formatDate(row.currentPlan?.endsAt || row.activeUntil || row.trialEndsAt)}</td>
                      <td className="px-2 py-2">
                        <span className={`rounded-full border px-2 py-1 text-xs font-bold ${risk.className}`}>{risk.label}</span>
                      </td>
                      <td className="px-2 py-2">
                        <select value={draft.status} onChange={(event) => patchDraft(row.id, "status", event.target.value as DealerStatus)}>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="TRIALING">TRIALING</option>
                          <option value="PAST_DUE">PAST_DUE</option>
                          <option value="SUSPENDED">SUSPENDED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                        <p className="mt-1 text-xs text-[color:var(--mx-text-muted)]">{statusLabel(draft.status)}</p>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="date"
                          value={draft.trialEndsAt}
                          onChange={(event) => patchDraft(row.id, "trialEndsAt", event.target.value)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="date"
                          value={draft.activeUntil}
                          onChange={(event) => patchDraft(row.id, "activeUntil", event.target.value)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={draft.note}
                          onChange={(event) => patchDraft(row.id, "note", event.target.value)}
                          placeholder="Opsiyonel aciklama"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Button size="sm" onClick={() => void updateDealerStatus(row.id)} disabled={busy || rowBusy}>
                          {rowBusy ? "Kaydediliyor..." : "Kaydet"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-2 py-6 text-center text-[color:var(--mx-text-muted)]">
                      Bayi kaydi bulunamadi.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
