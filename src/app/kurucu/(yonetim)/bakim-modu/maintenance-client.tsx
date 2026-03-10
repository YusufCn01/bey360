"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Envelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

type MaintenanceState = {
  enabled: boolean;
  message: string;
  updatedAt: string | null;
  updatedBy: string | null;
  startedAt: string | null;
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

export function MaintenanceClient() {
  const [state, setState] = React.useState<MaintenanceState | null>(null);
  const [enabledDraft, setEnabledDraft] = React.useState(false);
  const [messageDraft, setMessageDraft] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestApi<MaintenanceState>("/api/founder/maintenance");
      setState(data);
      setEnabledDraft(data.enabled);
      setMessageDraft(data.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Bakim modu bilgisi alinamadi.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const data = await requestApi<MaintenanceState>("/api/founder/maintenance", {
        method: "POST",
        body: JSON.stringify({
          enabled: enabledDraft,
          message: messageDraft,
        }),
      });
      setState(data);
      setEnabledDraft(data.enabled);
      setMessageDraft(data.message);
      setMessage(data.enabled ? "Bakim modu aktif edildi." : "Bakim modu kapatildi.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Bakim modu kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Platform Bakim Modu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-[color:var(--mx-text-muted)]">Bakim modu bilgisi yukleniyor...</p> : null}
          {message ? (
            <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
          ) : null}
          {error ? (
            <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

          <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-2 text-sm font-semibold">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={enabledDraft}
              onChange={(event) => setEnabledDraft(event.target.checked)}
            />
            Bakim modunu aktif et
          </label>

          <div>
            <label className="mb-1 block text-sm font-semibold">Kullaniciya Gosterilecek Mesaj</label>
            <textarea rows={3} value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void save()} disabled={saving || loading}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
            <Button variant="secondary" onClick={() => void load()} disabled={saving}>
              Yenile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Son Durum</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Durum:{" "}
            <span className={state?.enabled ? "font-bold text-rose-700" : "font-bold text-emerald-700"}>
              {state?.enabled ? "AKTIF" : "PASIF"}
            </span>
          </p>
          <p>Baslangic: {formatDateTime(state?.startedAt)}</p>
          <p>Son Guncelleme: {formatDateTime(state?.updatedAt)}</p>
          <p>Guncelleyen: {state?.updatedBy || "-"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
