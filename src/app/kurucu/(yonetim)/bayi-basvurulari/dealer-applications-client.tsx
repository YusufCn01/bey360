"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

type DealerApplicationStatus = "pending" | "reviewing" | "approved" | "rejected";
type DealerTenantStatus = "TRIALING" | "ACTIVE";

type DealerApplicationRow = {
  id: string;
  applicationNumber: string;
  status: DealerApplicationStatus;
  statusLabel: string;
  statusClass: "pending" | "reviewing" | "approved" | "rejected";
  companyName: string;
  tradeName: string | null;
  taxNumber: string;
  contactName: string;
  contactTitle: string | null;
  phone: string;
  email: string;
  city: string;
  district: string | null;
  address: string | null;
  note: string | null;
  requestedPlan: "starter" | "standard" | "professional" | "enterprise" | "custom";
  branchCount: number;
  monthlySalesTarget: number | null;
  submittedAt: string;
  source: string;
  tenantId: string | null;
  tenantSlug: string | null;
  ownerEmail: string | null;
  timeline: Array<{
    status: DealerApplicationStatus;
    at: string;
    by: string;
    note?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
};

type DealerApplicationListResponse = {
  rows: DealerApplicationRow[];
  summary: {
    total: number;
    pending: number;
    reviewing: number;
    approved: number;
    rejected: number;
    waitingProvision: number;
  };
};

type DealerApplicationActionResponse = {
  item: DealerApplicationRow;
  provision: {
    tenantId: string;
    tenantSlug: string;
    ownerEmail: string;
    generatedPassword: string | null;
    planCode: string | null;
  } | null;
};

type ActionForm = {
  comment: string;
  createDealer: boolean;
  preferredSlug: string;
  ownerPassword: string;
  tenantStatus: DealerTenantStatus;
  trialDays: string;
  planCode: "starter" | "standard" | "professional" | "enterprise" | "custom";
  billingCycle: "monthly" | "yearly";
};

const defaultSummary: DealerApplicationListResponse["summary"] = {
  total: 0,
  pending: 0,
  reviewing: 0,
  approved: 0,
  rejected: 0,
  waitingProvision: 0,
};

const initialActionForm: ActionForm = {
  comment: "",
  createDealer: true,
  preferredSlug: "",
  ownerPassword: "",
  tenantStatus: "TRIALING",
  trialDays: "14",
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
  const body = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error?.message ?? "İşlem başarısız.");
  }
  return body.data;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
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

function statusBadgeClass(status: DealerApplicationRow["statusClass"]): string {
  switch (status) {
    case "pending":
      return "border-amber-300 bg-amber-50 text-amber-900";
    case "reviewing":
      return "border-cyan-300 bg-cyan-50 text-cyan-900";
    case "approved":
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    case "rejected":
      return "border-rose-300 bg-rose-50 text-rose-900";
    default:
      return "border-slate-300 bg-slate-100 text-slate-900";
  }
}

function textOrDash(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "-";
}

export function DealerApplicationsClient() {
  const [rows, setRows] = React.useState<DealerApplicationRow[]>([]);
  const [summary, setSummary] = React.useState<DealerApplicationListResponse["summary"]>(defaultSummary);
  const [statusFilter, setStatusFilter] = React.useState<"all" | DealerApplicationStatus>("all");
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [actionForm, setActionForm] = React.useState<ActionForm>(initialActionForm);
  const [loading, setLoading] = React.useState(true);
  const [busyAction, setBusyAction] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const selected = React.useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (query.trim()) {
        params.set("q", query.trim());
      }
      params.set("limit", "350");
      const data = await requestApi<DealerApplicationListResponse>(`/api/founder/dealer-applications?${params.toString()}`);
      setRows(data.rows);
      setSummary(data.summary);
      setSelectedId((prev) => {
        if (prev && data.rows.some((row) => row.id === prev)) {
          return prev;
        }
        return data.rows[0]?.id ?? null;
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Başvuru listesi alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!selected) {
      setActionForm(initialActionForm);
      return;
    }
    setActionForm({
      comment: "",
      createDealer: !selected.tenantId,
      preferredSlug: selected.tenantSlug || "",
      ownerPassword: "",
      tenantStatus: "TRIALING",
      trialDays: "14",
      planCode: selected.requestedPlan,
      billingCycle: "monthly",
    });
  }, [selected]);

  function patchAction<K extends keyof ActionForm>(key: K, value: ActionForm[K]) {
    setActionForm((prev) => ({ ...prev, [key]: value }));
  }

  async function runAction(action: "review" | "reject" | "approve") {
    if (!selected) {
      return;
    }
    setBusyAction(true);
    setError(null);
    setMessage(null);
    try {
      const response = await requestApi<DealerApplicationActionResponse>("/api/founder/dealer-applications", {
        method: "PATCH",
        body: JSON.stringify({
          applicationId: selected.id,
          action,
          comment: actionForm.comment.trim() || undefined,
          createDealer: action === "approve" ? actionForm.createDealer : false,
          preferredSlug: actionForm.preferredSlug.trim() || undefined,
          ownerPassword: actionForm.ownerPassword.trim() || undefined,
          tenantStatus: actionForm.tenantStatus,
          trialDays: Number(actionForm.trialDays || 14),
          planCode: actionForm.planCode,
          billingCycle: actionForm.billingCycle,
        }),
      });

      const provision = response.provision;
      if (provision) {
        setMessage(
          `Başvuru onaylandı ve bayi açıldı: ${provision.tenantSlug}.` +
            (provision.generatedPassword ? ` Geçici şifre: ${provision.generatedPassword}` : ""),
        );
      } else if (action === "approve") {
        setMessage("Başvuru onaylandı.");
      } else if (action === "reject") {
        setMessage("Başvuru reddedildi.");
      } else {
        setMessage("Başvuru incelemeye alındı.");
      }

      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Başvuru işlemi yapılamadı.");
    } finally {
      setBusyAction(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Bayi Başvuru Yönetimi</CardTitle>
            <p className="text-sm text-[color:var(--mx-text-muted)]">
              Yeni başvuruları inceleyin, onaylayın ve tek tıkla bayi açılışını tamamlayın.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void load()} disabled={loading || busyAction}>
            Yenile
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-2">
              <p className="text-xs font-semibold text-[color:var(--mx-text-muted)]">Toplam</p>
              <p className="text-lg font-black">{summary.total}</p>
            </div>
            <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900">
              <p className="text-xs font-semibold">Yeni</p>
              <p className="text-lg font-black">{summary.pending}</p>
            </div>
            <div className="rounded-md border border-cyan-300 bg-cyan-50 p-2 text-cyan-900">
              <p className="text-xs font-semibold">İncelemede</p>
              <p className="text-lg font-black">{summary.reviewing}</p>
            </div>
            <div className="rounded-md border border-emerald-300 bg-emerald-50 p-2 text-emerald-900">
              <p className="text-xs font-semibold">Onaylandı</p>
              <p className="text-lg font-black">{summary.approved}</p>
            </div>
            <div className="rounded-md border border-rose-300 bg-rose-50 p-2 text-rose-900">
              <p className="text-xs font-semibold">Reddedildi</p>
              <p className="text-lg font-black">{summary.rejected}</p>
            </div>
            <div className="rounded-md border border-violet-300 bg-violet-50 p-2 text-violet-900">
              <p className="text-xs font-semibold">Bayi Açılışı Bekleyen</p>
              <p className="text-lg font-black">{summary.waitingProvision}</p>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-[220px_1fr_auto]">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | DealerApplicationStatus)}>
              <option value="all">Tüm Durumlar</option>
              <option value="pending">Yeni</option>
              <option value="reviewing">İncelemede</option>
              <option value="approved">Onaylandı</option>
              <option value="rejected">Reddedildi</option>
            </select>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Başvuru no, firma, yetkili veya iletişim ara" />
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>
              Filtre Uygula
            </Button>
          </div>

          {message ? (
            <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
          ) : null}
          {error ? <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[1fr_430px]">
        <Card>
          <CardHeader>
            <CardTitle>Başvuru Listesi</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[color:var(--mx-surface-soft)]">
                <tr>
                  <th className="px-2 py-2 text-left">Başvuru</th>
                  <th className="px-2 py-2 text-left">Firma</th>
                  <th className="px-2 py-2 text-left">Yetkili</th>
                  <th className="px-2 py-2 text-left">İletişim</th>
                  <th className="px-2 py-2 text-left">Durum</th>
                  <th className="px-2 py-2 text-left">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const selectedRow = selectedId === row.id;
                  return (
                    <tr
                      key={row.id}
                      className={`cursor-pointer border-t border-[color:var(--mx-border)] ${selectedRow ? "bg-cyan-50/60" : ""}`}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td className="px-2 py-2">
                        <p className="font-semibold">{row.applicationNumber}</p>
                        <p className="text-xs text-[color:var(--mx-text-muted)]">{row.taxNumber}</p>
                      </td>
                      <td className="px-2 py-2">
                        <p className="font-semibold">{row.tradeName || row.companyName}</p>
                        <p className="text-xs text-[color:var(--mx-text-muted)]">
                          {row.city}
                          {row.district ? ` / ${row.district}` : ""}
                        </p>
                      </td>
                      <td className="px-2 py-2">
                        <p>{row.contactName}</p>
                        <p className="text-xs text-[color:var(--mx-text-muted)]">{textOrDash(row.contactTitle)}</p>
                      </td>
                      <td className="px-2 py-2">
                        <p>{row.phone}</p>
                        <p className="text-xs text-[color:var(--mx-text-muted)]">{row.email}</p>
                      </td>
                      <td className="px-2 py-2">
                        <span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusBadgeClass(row.statusClass)}`}>{row.statusLabel}</span>
                      </td>
                      <td className="px-2 py-2">{formatDateTime(row.submittedAt)}</td>
                    </tr>
                  );
                })}
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-6 text-center text-[color:var(--mx-text-muted)]">
                      Başvuru bulunamadı.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Başvuru Detayı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selected ? (
              <p className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-4 text-sm text-[color:var(--mx-text-muted)]">
                Detay görmek için listeden bir başvuru seçin.
              </p>
            ) : (
              <>
                <div className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3 text-sm">
                  <p>
                    <span className="font-semibold">Başvuru No:</span> {selected.applicationNumber}
                  </p>
                  <p>
                    <span className="font-semibold">Firma:</span> {selected.companyName}
                  </p>
                  <p>
                    <span className="font-semibold">Yetkili:</span> {selected.contactName}
                  </p>
                  <p>
                    <span className="font-semibold">Telefon:</span> {selected.phone}
                  </p>
                  <p>
                    <span className="font-semibold">E-posta:</span> {selected.email}
                  </p>
                  <p>
                    <span className="font-semibold">Adres:</span>{" "}
                    {[selected.city, selected.district, selected.address].filter(Boolean).join(" / ") || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Not:</span> {textOrDash(selected.note)}
                  </p>
                  <p>
                    <span className="font-semibold">Talep Planı:</span> {selected.requestedPlan.toUpperCase()}
                  </p>
                  <p>
                    <span className="font-semibold">Mevcut Bayi:</span> {selected.tenantSlug ? selected.tenantSlug : "Yok"}
                  </p>
                </div>

                <div className="space-y-2 rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--mx-text-muted)]">İşlem Formu</p>

                  <textarea
                    rows={2}
                    value={actionForm.comment}
                    onChange={(event) => patchAction("comment", event.target.value)}
                    placeholder="İşlem notu (opsiyonel)"
                  />

                  <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] px-3 py-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={actionForm.createDealer}
                      onChange={(event) => patchAction("createDealer", event.target.checked)}
                      disabled={!!selected.tenantId}
                    />
                    Onayda otomatik bayi aç
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={actionForm.preferredSlug}
                      onChange={(event) => patchAction("preferredSlug", event.target.value)}
                      placeholder="Tercih edilen slug"
                    />
                    <input
                      type="password"
                      value={actionForm.ownerPassword}
                      onChange={(event) => patchAction("ownerPassword", event.target.value)}
                      placeholder="Geçici şifre (boşsa otomatik)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select value={actionForm.planCode} onChange={(event) => patchAction("planCode", event.target.value as ActionForm["planCode"])}>
                      <option value="starter">STARTER</option>
                      <option value="standard">STANDARD</option>
                      <option value="professional">PROFESSIONAL</option>
                      <option value="enterprise">ENTERPRISE</option>
                      <option value="custom">CUSTOM</option>
                    </select>
                    <select
                      value={actionForm.billingCycle}
                      onChange={(event) => patchAction("billingCycle", event.target.value as ActionForm["billingCycle"])}
                    >
                      <option value="monthly">Aylık</option>
                      <option value="yearly">Yıllık</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={actionForm.tenantStatus}
                      onChange={(event) => patchAction("tenantStatus", event.target.value as DealerTenantStatus)}
                    >
                      <option value="TRIALING">TRIALING</option>
                      <option value="ACTIVE">ACTIVE</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={actionForm.trialDays}
                      onChange={(event) => patchAction("trialDays", event.target.value)}
                      placeholder="Trial gün"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="secondary" onClick={() => void runAction("review")} disabled={busyAction}>
                      İncelemeye Al
                    </Button>
                    <Button variant="danger" onClick={() => void runAction("reject")} disabled={busyAction}>
                      Reddet
                    </Button>
                    <Button onClick={() => void runAction("approve")} disabled={busyAction}>
                      {busyAction ? "İşleniyor..." : "Onayla"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--mx-text-muted)]">Başvuru Geçmişi</p>
                  <div className="space-y-1 text-sm">
                    {selected.timeline.map((item, index) => (
                      <p key={`${item.at}-${index}`}>
                        <span className="font-semibold">{formatDateTime(item.at)}</span> - {item.status.toUpperCase()} - {item.by}
                        {item.note ? ` (${item.note})` : ""}
                      </p>
                    ))}
                    {selected.timeline.length === 0 ? <p className="text-[color:var(--mx-text-muted)]">Kayıt bulunamadı.</p> : null}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
