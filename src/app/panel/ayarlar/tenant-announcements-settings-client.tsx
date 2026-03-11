"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AnnouncementTone = "info" | "success" | "warning" | "danger";

type AnnouncementFormRow = {
  id: string;
  title: string;
  message: string;
  tone: AnnouncementTone;
  buttonLabel: string;
  buttonUrl: string;
  publishAt: string;
  expiresAt: string;
  isPinned: boolean;
  isActive: boolean;
};

type SettingsEnvelope = {
  success: boolean;
  data?: {
    payload?: Record<string, unknown>;
  };
  error?: { message?: string };
};

const toneOptions: Array<{ value: AnnouncementTone; label: string }> = [
  { value: "info", label: "Bilgi" },
  { value: "success", label: "Başarılı" },
  { value: "warning", label: "Uyarı" },
  { value: "danger", label: "Kritik" },
];

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asTone(value: unknown): AnnouncementTone {
  return value === "success" || value === "warning" || value === "danger" ? value : "info";
}

function toInputDateTime(value: string): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (part: number) => String(part).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function toIsoOrNull(value: string): string | null {
  if (!value.trim()) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function sortRows(rows: AnnouncementFormRow[]) {
  return [...rows].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    return b.publishAt.localeCompare(a.publishAt);
  });
}

function createId() {
  if (typeof window !== "undefined" && window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyRow(): AnnouncementFormRow {
  return {
    id: createId(),
    title: "",
    message: "",
    tone: "info",
    buttonLabel: "",
    buttonUrl: "",
    publishAt: "",
    expiresAt: "",
    isPinned: false,
    isActive: true,
  };
}

function toneBadgeClass(tone: AnnouncementTone) {
  if (tone === "success") {
    return "border-emerald-300 bg-emerald-50 text-emerald-700";
  }
  if (tone === "warning") {
    return "border-amber-300 bg-amber-50 text-amber-700";
  }
  if (tone === "danger") {
    return "border-rose-300 bg-rose-50 text-rose-700";
  }
  return "border-cyan-300 bg-cyan-50 text-cyan-700";
}

export function TenantAnnouncementsSettingsClient() {
  const [rows, setRows] = React.useState<AnnouncementFormRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const activeCount = rows.filter((item) => item.isActive).length;

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/tenant/settings?scope=duyurular", { cache: "no-store" });
      const body = (await response.json()) as SettingsEnvelope;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Duyuru ayarları alınamadı.");
      }

      const payload = asRecord(body.data?.payload);
      const items = Array.isArray(payload.items) ? payload.items : [];

      const nextRows = items
        .map((item) => asRecord(item))
        .map<AnnouncementFormRow>((item) => ({
          id: asText(item.id) || createId(),
          title: asText(item.title),
          message: asText(item.message),
          tone: asTone(item.tone),
          buttonLabel: asText(item.buttonLabel),
          buttonUrl: asText(item.buttonUrl),
          publishAt: toInputDateTime(asText(item.publishAt)),
          expiresAt: toInputDateTime(asText(item.expiresAt)),
          isPinned: asBoolean(item.isPinned, false),
          isActive: asBoolean(item.isActive, true),
        }))
        .filter((item) => item.message || item.title);

      setRows(sortRows(nextRows));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Duyurular yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function patchRow<K extends keyof AnnouncementFormRow>(id: string, key: K, value: AnnouncementFormRow[K]) {
    setRows((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  }

  function addRow() {
    setMessage(null);
    setError(null);
    setRows((prev) => [createEmptyRow(), ...prev]);
  }

  function duplicateRow(id: string) {
    setRows((prev) => {
      const row = prev.find((item) => item.id === id);
      if (!row) {
        return prev;
      }
      const copy = { ...row, id: createId(), title: row.title ? `${row.title} (Kopya)` : "Kopya Duyuru" };
      return [copy, ...prev];
    });
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((item) => item.id !== id));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payloadItems = rows
        .map((item) => ({
          id: item.id,
          title: item.title.trim(),
          message: item.message.trim(),
          tone: item.tone,
          buttonLabel: item.buttonLabel.trim() || null,
          buttonUrl: item.buttonUrl.trim() || null,
          publishAt: toIsoOrNull(item.publishAt),
          expiresAt: toIsoOrNull(item.expiresAt),
          isPinned: item.isPinned,
          isActive: item.isActive,
          createdAt: new Date().toISOString(),
        }))
        .filter((item) => item.title.length > 0 && item.message.length > 0);

      const response = await fetch("/api/tenant/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope: "duyurular",
          payload: {
            items: payloadItems,
          },
        }),
      });
      const body = (await response.json()) as SettingsEnvelope;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Duyurular kaydedilemedi.");
      }

      setRows((prev) => sortRows(prev));
      setMessage("Duyuru ayarları kaydedildi.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Duyurular kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Duyuru Yönetimi</CardTitle>
            <p className="text-sm text-[color:var(--mx-text-muted)]">
              Panel üst çubuktaki duyuru merkezinde gösterilecek içerikleri bu ekrandan yönetin.
            </p>
            <p className="mt-2 text-xs font-semibold text-[color:var(--mx-text-muted)]">
              Toplam: {rows.length} duyuru • Aktif: {activeCount}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading || saving}>
              Yenile
            </Button>
            <Button variant="secondary" size="sm" onClick={addRow} disabled={saving}>
              Yeni Duyuru
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={saving || loading}>
              {saving ? "Kaydediliyor..." : "Duyuruları Kaydet"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          {message ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
          ) : null}
          <p className="text-xs text-[color:var(--mx-text-muted)]">
            Not: Yayın tarihi boş olursa duyuru hemen görünür. Bitiş tarihi geçince otomatik gizlenir.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-6 text-sm text-[color:var(--mx-text-muted)]">Duyurular yükleniyor...</CardContent>
        </Card>
      ) : null}

      {!loading && rows.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-[color:var(--mx-text-muted)]">
            Kayıtlı duyuru yok. "Yeni Duyuru" butonuyla başlayabilirsiniz.
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        {rows.map((row) => (
          <Card key={row.id} className="overflow-hidden">
            <CardHeader className="border-b border-[color:var(--mx-border)]/70 bg-[color:var(--mx-surface-soft)] py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${toneBadgeClass(row.tone)}`}>
                    {toneOptions.find((item) => item.value === row.tone)?.label}
                  </span>
                  <span className="text-xs font-semibold text-[color:var(--mx-text-muted)]">ID: {row.id}</span>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => duplicateRow(row.id)} disabled={saving}>
                    Kopyala
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => removeRow(row.id)}
                    disabled={saving}
                    className="border-rose-300 text-rose-700 hover:bg-rose-50"
                  >
                    Sil
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 pt-4 lg:grid-cols-2">
              <div className="space-y-3">
                <label className="block space-y-1 text-sm">
                  <span className="font-semibold">Başlık</span>
                  <input
                    value={row.title}
                    onChange={(event) => patchRow(row.id, "title", event.target.value)}
                    placeholder="Örn: Yeni sürüm v3.2 yayında"
                    className="h-10 w-full rounded-lg border border-[color:var(--mx-border)] px-3 text-sm"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="font-semibold">Mesaj</span>
                  <textarea
                    value={row.message}
                    onChange={(event) => patchRow(row.id, "message", event.target.value)}
                    placeholder="Duyuru metni"
                    className="min-h-28 w-full rounded-lg border border-[color:var(--mx-border)] px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span className="font-semibold">Ton</span>
                  <select
                    value={row.tone}
                    onChange={(event) => patchRow(row.id, "tone", event.target.value as AnnouncementTone)}
                    className="h-10 w-full rounded-lg border border-[color:var(--mx-border)] px-3 text-sm"
                  >
                    {toneOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="font-semibold">Yayın Tarihi</span>
                  <input
                    type="datetime-local"
                    value={row.publishAt}
                    onChange={(event) => patchRow(row.id, "publishAt", event.target.value)}
                    className="h-10 w-full rounded-lg border border-[color:var(--mx-border)] px-3 text-sm"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="font-semibold">Bitiş Tarihi</span>
                  <input
                    type="datetime-local"
                    value={row.expiresAt}
                    onChange={(event) => patchRow(row.id, "expiresAt", event.target.value)}
                    className="h-10 w-full rounded-lg border border-[color:var(--mx-border)] px-3 text-sm"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="font-semibold">Buton Etiketi</span>
                  <input
                    value={row.buttonLabel}
                    onChange={(event) => patchRow(row.id, "buttonLabel", event.target.value)}
                    placeholder="Örn: Detaya Git"
                    className="h-10 w-full rounded-lg border border-[color:var(--mx-border)] px-3 text-sm"
                  />
                </label>
                <label className="block space-y-1 text-sm sm:col-span-2">
                  <span className="font-semibold">Buton URL</span>
                  <input
                    value={row.buttonUrl}
                    onChange={(event) => patchRow(row.id, "buttonUrl", event.target.value)}
                    placeholder="https://..."
                    className="h-10 w-full rounded-lg border border-[color:var(--mx-border)] px-3 text-sm"
                  />
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={row.isPinned}
                    onChange={(event) => patchRow(row.id, "isPinned", event.target.checked)}
                    className="h-4 w-4"
                  />
                  Sabit Duyuru
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={row.isActive}
                    onChange={(event) => patchRow(row.id, "isActive", event.target.checked)}
                    className="h-4 w-4"
                  />
                  Aktif
                </label>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
