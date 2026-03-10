"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Envelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

type UpdateTargetScope = "all" | "selected";

type UpdateRow = {
  id: string;
  version: string;
  title: string;
  summary: string;
  details: string | null;
  isActive: boolean;
  isForce: boolean;
  isPinned: boolean;
  targetScope: UpdateTargetScope;
  tenantIds: string[];
  publishAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
};

type DealerOption = {
  id: string;
  legalName: string;
  tradeName: string | null;
  slug: string;
};

type NewUpdateForm = {
  version: string;
  title: string;
  summary: string;
  details: string;
  isActive: boolean;
  isForce: boolean;
  isPinned: boolean;
  targetScope: UpdateTargetScope;
  tenantIds: string[];
  publishAt: string;
  expiresAt: string;
};

const initialForm: NewUpdateForm = {
  version: "",
  title: "",
  summary: "",
  details: "",
  isActive: true,
  isForce: false,
  isPinned: false,
  targetScope: "all",
  tenantIds: [],
  publishAt: "",
  expiresAt: "",
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

function formatDateTime(value?: string | null) {
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

function toIso(value: string) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

export function UpdatesClient() {
  const [updates, setUpdates] = React.useState<UpdateRow[]>([]);
  const [dealers, setDealers] = React.useState<DealerOption[]>([]);
  const [form, setForm] = React.useState<NewUpdateForm>(initialForm);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [busyUpdateId, setBusyUpdateId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [updateRows, dealerRows] = await Promise.all([
        requestApi<UpdateRow[]>("/api/founder/updates"),
        requestApi<Array<{ id: string; legalName: string; tradeName: string | null; slug: string }>>(
          "/api/founder/dealers",
        ),
      ]);
      setUpdates(updateRows);
      setDealers(
        dealerRows.map((item) => ({
          id: item.id,
          legalName: item.legalName,
          tradeName: item.tradeName,
          slug: item.slug,
        })),
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Guncellemeler yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function patchForm<K extends keyof NewUpdateForm>(key: K, value: NewUpdateForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleTenant(tenantId: string, checked: boolean) {
    setForm((prev) => {
      if (checked) {
        return { ...prev, tenantIds: Array.from(new Set([...prev.tenantIds, tenantId])) };
      }
      return { ...prev, tenantIds: prev.tenantIds.filter((id) => id !== tenantId) };
    });
  }

  async function createUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await requestApi("/api/founder/updates", {
        method: "POST",
        body: JSON.stringify({
          version: form.version,
          title: form.title,
          summary: form.summary,
          details: form.details || null,
          isActive: form.isActive,
          isForce: form.isForce,
          isPinned: form.isPinned,
          targetScope: form.targetScope,
          tenantIds: form.tenantIds,
          publishAt: toIso(form.publishAt),
          expiresAt: toIso(form.expiresAt),
        }),
      });
      setMessage("Guncelleme yayina alindi.");
      setForm(initialForm);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Guncelleme kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function patchUpdate(updateId: string, payload: { isActive?: boolean; isForce?: boolean; isPinned?: boolean }) {
    setBusyUpdateId(updateId);
    setMessage(null);
    setError(null);
    try {
      await requestApi("/api/founder/updates", {
        method: "PATCH",
        body: JSON.stringify({
          updateId,
          ...payload,
        }),
      });
      setMessage("Guncelleme kaydi guncellendi.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Guncelleme duzenlenemedi.");
    } finally {
      setBusyUpdateId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Yeni Platform Guncellemesi</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createUpdate} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">Versiyon</label>
                <input value={form.version} onChange={(event) => patchForm("version", event.target.value)} placeholder="1.0.12" required />
              </div>
              <div className="md:col-span-3">
                <label className="mb-1 block text-sm font-semibold">Baslik</label>
                <input value={form.title} onChange={(event) => patchForm("title", event.target.value)} required />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">Kisa Ozet</label>
              <input value={form.summary} onChange={(event) => patchForm("summary", event.target.value)} required />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">Detay Notlari</label>
              <textarea rows={4} value={form.details} onChange={(event) => patchForm("details", event.target.value)} />
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">Hedef</label>
                <select value={form.targetScope} onChange={(event) => patchForm("targetScope", event.target.value as UpdateTargetScope)}>
                  <option value="all">Tum Bayiler</option>
                  <option value="selected">Secili Bayiler</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Yayin Baslangic</label>
                <input type="datetime-local" value={form.publishAt} onChange={(event) => patchForm("publishAt", event.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Yayin Bitis</label>
                <input type="datetime-local" value={form.expiresAt} onChange={(event) => patchForm("expiresAt", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
                  <input type="checkbox" className="h-4 w-4" checked={form.isActive} onChange={(event) => patchForm("isActive", event.target.checked)} />
                  Aktif
                </label>
                <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
                  <input type="checkbox" className="h-4 w-4" checked={form.isForce} onChange={(event) => patchForm("isForce", event.target.checked)} />
                  Zorunlu
                </label>
              </div>
            </div>

            <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
              <input type="checkbox" className="h-4 w-4" checked={form.isPinned} onChange={(event) => patchForm("isPinned", event.target.checked)} />
              Ustte sabit goster
            </label>

            {form.targetScope === "selected" ? (
              <div className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
                <p className="mb-2 text-sm font-semibold">Guncellemeyi Alacak Bayiler</p>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {dealers.map((dealer) => (
                    <label key={dealer.id} className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] px-2 py-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={form.tenantIds.includes(dealer.id)}
                        onChange={(event) => toggleTenant(dealer.id, event.target.checked)}
                      />
                      <span>
                        {(dealer.tradeName || dealer.legalName).slice(0, 45)}
                        <span className="block text-xs text-[color:var(--mx-text-muted)]">{dealer.slug}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={busy}>
                {busy ? "Kaydediliyor..." : "Guncellemeyi Yayinla"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Guncelleme Gecmisi</CardTitle>
          <Button variant="secondary" onClick={() => void load()} disabled={loading || busy}>
            Yenile
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {message ? <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          {updates.length === 0 ? (
            <p className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-8 text-center text-sm text-[color:var(--mx-text-muted)]">
              Guncelleme kaydi bulunamadi.
            </p>
          ) : (
            updates.map((item) => {
              const busyRow = busyUpdateId === item.id;
              return (
                <div key={item.id} className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-900">
                        v{item.version}
                      </span>
                      {item.isForce ? (
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-900">
                          ZORUNLU
                        </span>
                      ) : null}
                      {item.isPinned ? (
                        <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-bold text-violet-900">
                          SABIT
                        </span>
                      ) : null}
                      {!item.isActive ? (
                        <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                          PASIF
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs font-semibold text-[color:var(--mx-text-muted)]">
                      {formatDateTime(item.createdAt)} - {formatDateTime(item.updatedAt)}
                    </p>
                  </div>

                  <p className="text-base font-semibold">{item.title}</p>
                  <p className="text-sm text-[color:var(--mx-text)]">{item.summary}</p>
                  {item.details ? (
                    <p className="mt-2 whitespace-pre-wrap rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] px-2 py-2 text-xs text-[color:var(--mx-text-muted)]">
                      {item.details}
                    </p>
                  ) : null}

                  <div className="mt-2 grid gap-2 text-xs text-[color:var(--mx-text-muted)] md:grid-cols-3">
                    <p>Hedef: {item.targetScope === "all" ? "Tum bayiler" : `Secili bayi (${item.tenantIds.length})`}</p>
                    <p>Yayin baslangic: {formatDateTime(item.publishAt)}</p>
                    <p>Yayin bitis: {formatDateTime(item.expiresAt)}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button size="sm" variant={item.isActive ? "secondary" : "default"} onClick={() => void patchUpdate(item.id, { isActive: !item.isActive })} disabled={busyRow}>
                      {item.isActive ? "Pasife Al" : "Aktif Et"}
                    </Button>
                    <Button size="sm" variant={item.isForce ? "secondary" : "default"} onClick={() => void patchUpdate(item.id, { isForce: !item.isForce })} disabled={busyRow}>
                      {item.isForce ? "Zorunluyu Kaldir" : "Zorunlu Yap"}
                    </Button>
                    <Button size="sm" variant={item.isPinned ? "secondary" : "default"} onClick={() => void patchUpdate(item.id, { isPinned: !item.isPinned })} disabled={busyRow}>
                      {item.isPinned ? "Sabiti Kaldir" : "Sabit Yap"}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
