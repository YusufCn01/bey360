"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Envelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

type DealerOption = {
  id: string;
  legalName: string;
  tradeName: string | null;
  slug: string;
};

type AnnouncementTone = "info" | "success" | "warning" | "danger";
type TargetScope = "all" | "selected";

type AnnouncementRow = {
  id: string;
  title: string;
  message: string;
  tone: AnnouncementTone;
  isPinned: boolean;
  isActive: boolean;
  targetScope: TargetScope;
  tenantIds: string[];
  publishAt: string | null;
  expiresAt: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type NewAnnouncementForm = {
  title: string;
  message: string;
  tone: AnnouncementTone;
  isPinned: boolean;
  isActive: boolean;
  targetScope: TargetScope;
  tenantIds: string[];
  publishAt: string;
  expiresAt: string;
  buttonLabel: string;
  buttonUrl: string;
};

const initialForm: NewAnnouncementForm = {
  title: "",
  message: "",
  tone: "info",
  isPinned: false,
  isActive: true,
  targetScope: "all",
  tenantIds: [],
  publishAt: "",
  expiresAt: "",
  buttonLabel: "",
  buttonUrl: "",
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

const toneBadgeClassMap: Record<AnnouncementTone, string> = {
  info: "bg-cyan-50 text-cyan-900 border-cyan-200",
  success: "bg-emerald-50 text-emerald-900 border-emerald-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  danger: "bg-rose-50 text-rose-900 border-rose-200",
};

export function AnnouncementsClient() {
  const [dealers, setDealers] = React.useState<DealerOption[]>([]);
  const [rows, setRows] = React.useState<AnnouncementRow[]>([]);
  const [form, setForm] = React.useState<NewAnnouncementForm>(initialForm);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [busyAnnouncementId, setBusyAnnouncementId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [announcementRows, dealerRows] = await Promise.all([
        requestApi<AnnouncementRow[]>("/api/founder/announcements"),
        requestApi<Array<{ id: string; legalName: string; tradeName: string | null; slug: string }>>(
          "/api/founder/dealers",
        ),
      ]);

      setRows(announcementRows);
      setDealers(
        dealerRows.map((row) => ({
          id: row.id,
          legalName: row.legalName,
          tradeName: row.tradeName,
          slug: row.slug,
        })),
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Duyurular yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function patchForm<K extends keyof NewAnnouncementForm>(key: K, value: NewAnnouncementForm[K]) {
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

  async function createAnnouncement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await requestApi("/api/founder/announcements", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          message: form.message,
          tone: form.tone,
          isPinned: form.isPinned,
          isActive: form.isActive,
          targetScope: form.targetScope,
          tenantIds: form.tenantIds,
          publishAt: toIso(form.publishAt),
          expiresAt: toIso(form.expiresAt),
          buttonLabel: form.buttonLabel || null,
          buttonUrl: form.buttonUrl || null,
        }),
      });
      setMessage("Duyuru kaydedildi.");
      setForm(initialForm);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Duyuru kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function patchAnnouncement(
    announcementId: string,
    payload: {
      isActive?: boolean;
      isPinned?: boolean;
    },
  ) {
    setBusyAnnouncementId(announcementId);
    setError(null);
    setMessage(null);
    try {
      await requestApi("/api/founder/announcements", {
        method: "PATCH",
        body: JSON.stringify({
          announcementId,
          ...payload,
        }),
      });
      setMessage("Duyuru guncellendi.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Duyuru guncellenemedi.");
    } finally {
      setBusyAnnouncementId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Yeni Duyuru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createAnnouncement} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold">Baslik</label>
                <input value={form.title} onChange={(event) => patchForm("title", event.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Ton</label>
                <select
                  value={form.tone}
                  onChange={(event) => patchForm("tone", event.target.value as AnnouncementTone)}
                >
                  <option value="info">Bilgi</option>
                  <option value="success">Basari</option>
                  <option value="warning">Uyari</option>
                  <option value="danger">Kritik</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">Icerik</label>
              <textarea
                rows={3}
                value={form.message}
                onChange={(event) => patchForm("message", event.target.value)}
                required
              />
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">Hedef</label>
                <select
                  value={form.targetScope}
                  onChange={(event) => patchForm("targetScope", event.target.value as TargetScope)}
                >
                  <option value="all">Tum Bayiler</option>
                  <option value="selected">Secili Bayiler</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Yayin Baslangic</label>
                <input
                  type="datetime-local"
                  value={form.publishAt}
                  onChange={(event) => patchForm("publishAt", event.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Yayin Bitis</label>
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(event) => patchForm("expiresAt", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.isActive}
                    onChange={(event) => patchForm("isActive", event.target.checked)}
                  />
                  Aktif
                </label>
                <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.isPinned}
                    onChange={(event) => patchForm("isPinned", event.target.checked)}
                  />
                  Sabit
                </label>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold">Buton Yazi</label>
                <input value={form.buttonLabel} onChange={(event) => patchForm("buttonLabel", event.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Buton URL</label>
                <input value={form.buttonUrl} onChange={(event) => patchForm("buttonUrl", event.target.value)} />
              </div>
            </div>

            {form.targetScope === "selected" ? (
              <div className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
                <p className="mb-2 text-sm font-semibold">Duyuru Gonderilecek Bayiler</p>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {dealers.map((dealer) => (
                    <label
                      key={dealer.id}
                      className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] px-2 py-2 text-sm"
                    >
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
                {busy ? "Kaydediliyor..." : "Duyuruyu Yayina Al"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Duyuru Listesi</CardTitle>
          <Button variant="secondary" onClick={() => void load()} disabled={loading || busy}>
            Yenile
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {message ? (
            <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
          ) : null}
          {error ? (
            <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

          {rows.length === 0 ? (
            <p className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-8 text-center text-sm text-[color:var(--mx-text-muted)]">
              Kayitli duyuru bulunamadi.
            </p>
          ) : (
            rows.map((item) => {
              const busyRow = busyAnnouncementId === item.id;
              return (
                <div key={item.id} className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-1 text-xs font-bold ${toneBadgeClassMap[item.tone]}`}>
                        {item.tone.toUpperCase()}
                      </span>
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
                      Olusturma: {formatDateTime(item.createdAt)} | Guncelleme: {formatDateTime(item.updatedAt)}
                    </p>
                  </div>

                  <p className="text-base font-semibold">{item.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[color:var(--mx-text)]">{item.message}</p>

                  <div className="mt-2 grid gap-2 text-xs text-[color:var(--mx-text-muted)] md:grid-cols-3">
                    <p>Hedef: {item.targetScope === "all" ? "Tum bayiler" : `Secili bayi (${item.tenantIds.length})`}</p>
                    <p>Yayin baslangic: {formatDateTime(item.publishAt)}</p>
                    <p>Yayin bitis: {formatDateTime(item.expiresAt)}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant={item.isActive ? "secondary" : "default"}
                      onClick={() => void patchAnnouncement(item.id, { isActive: !item.isActive })}
                      disabled={busyRow}
                    >
                      {item.isActive ? "Pasife Al" : "Aktif Et"}
                    </Button>
                    <Button
                      size="sm"
                      variant={item.isPinned ? "secondary" : "default"}
                      onClick={() => void patchAnnouncement(item.id, { isPinned: !item.isPinned })}
                      disabled={busyRow}
                    >
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
