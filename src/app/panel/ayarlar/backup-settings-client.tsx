"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BackupSummary = {
  generatedAt: string;
  counts: {
    products: number;
    customers: number;
    stockBalances: number;
    sales: number;
    collections: number;
    supplierPayments: number;
  };
};

type BackupState = {
  autoEnabled: boolean;
  retentionDays: number;
  lastRunAt: string | null;
  lastCounts: BackupSummary["counts"] | null;
  history: BackupSummary[];
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { message?: string };
};

async function requestApi<T>(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.method && init.method !== "GET") {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers,
  });
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !body?.success) {
    throw new Error(body?.error?.message ?? "İşlem başarısız.");
  }
  return body.data;
}

export function BackupSettingsClient() {
  const [state, setState] = React.useState<BackupState | null>(null);
  const [autoEnabled, setAutoEnabled] = React.useState(true);
  const [retentionDays, setRetentionDays] = React.useState("30");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestApi<BackupState>("/api/tenant/system/backups");
      setState(data);
      setAutoEnabled(data.autoEnabled);
      setRetentionDays(String(data.retentionDays));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Yedekleme ayarları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function runBackupNow() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await requestApi<{ summary: BackupSummary }>("/api/tenant/system/backups", {
        method: "POST",
        body: JSON.stringify({ action: "run" }),
      });
      setMessage("Manuel yedek özeti üretildi.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Yedek işlemi başarısız.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await requestApi<BackupState>("/api/tenant/system/backups", {
        method: "POST",
        body: JSON.stringify({
          action: "update_settings",
          autoEnabled,
          retentionDays: Number(retentionDays),
        }),
      });
      setMessage("Yedekleme ayarları kaydedildi.");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Yedekleme ayarları kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Günlük Yedekleme</CardTitle>
        <p className="text-sm text-slate-600">
          Uygulama içi günlük yedek özetleri burada tutulur. Tam veri dışa aktarma için sunucuda <code>npm run backup:daily</code> cron görevi çalıştırın.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p className="text-sm text-slate-500">Yedekleme durumu yükleniyor...</p> : null}

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={autoEnabled}
              onChange={(event) => setAutoEnabled(event.target.checked)}
            />
            Otomatik günlük yedekleme aktif
          </label>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Saklama süresi (gün)</label>
            <input
              value={retentionDays}
              onChange={(event) => setRetentionDays(event.target.value)}
              inputMode="numeric"
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void saveSettings()} disabled={busy}>
            Ayarları Kaydet
          </Button>
          <Button variant="secondary" onClick={() => void runBackupNow()} disabled={busy}>
            Şimdi Yedek Al
          </Button>
          <Button variant="secondary" onClick={() => void load()} disabled={busy}>
            Yenile
          </Button>
        </div>

        {state?.lastRunAt ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-800">Son Çalışma: {new Date(state.lastRunAt).toLocaleString("tr-TR")}</p>
            {state.lastCounts ? (
              <p className="mt-1 text-slate-600">
                Ürün: {state.lastCounts.products} | Müşteri: {state.lastCounts.customers} | Stok: {state.lastCounts.stockBalances} | Satış: {state.lastCounts.sales}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-lg border border-slate-200">
          <div className="border-b bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">Yedek Geçmişi</div>
          <div className="max-h-72 overflow-auto p-3">
            {!state || state.history.length === 0 ? (
              <p className="text-sm text-slate-500">Henüz yedek kaydı yok.</p>
            ) : (
              <ul className="space-y-2">
                {state.history.map((row) => (
                  <li key={row.generatedAt} className="rounded-md border border-slate-200 p-2 text-sm">
                    <p className="font-medium text-slate-800">{new Date(row.generatedAt).toLocaleString("tr-TR")}</p>
                    <p className="text-slate-600">
                      Ürün: {row.counts.products} | Müşteri: {row.counts.customers} | Stok: {row.counts.stockBalances} | Satış: {row.counts.sales}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
