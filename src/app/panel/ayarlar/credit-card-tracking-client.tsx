"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SettingsResult = {
  id: string | null;
  scope: string;
  payload: Record<string, unknown>;
  updatedAt: string | null;
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

export function CreditCardTrackingClient() {
  const [statementDay, setStatementDay] = React.useState("10");
  const [paymentDelayDays, setPaymentDelayDays] = React.useState("10");
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestApi<SettingsResult>("/api/tenant/settings?scope=credit_card_tracking");
      setStatementDay(String(data.payload.statementDay ?? 10));
      setPaymentDelayDays(String(data.payload.paymentDelayDays ?? 10));
      setUpdatedAt(data.updatedAt);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Kart takip ayarları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await requestApi<SettingsResult>("/api/tenant/settings", {
        method: "POST",
        body: JSON.stringify({
          scope: "credit_card_tracking",
          payload: {
            statementDay: Number(statementDay),
            paymentDelayDays: Number(paymentDelayDays),
          },
        }),
      });
      setUpdatedAt(data.updatedAt);
      setMessage("Kart takip ayarları kaydedildi.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Kart takip ayarları kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kredi Kartı Ekstre Takibi</CardTitle>
        <p className="text-sm text-slate-600">
          Kart ile yapılan tedarikçi ödemelerinde hesap kesim ve ödeme tarihi otomatik üretilir.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p className="text-sm text-slate-500">Ayarlar yükleniyor...</p> : null}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Hesap Kesim Günü (1-28)</label>
            <input
              value={statementDay}
              onChange={(event) => setStatementDay(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Ödeme Gecikme Günü</label>
            <input
              value={paymentDelayDays}
              onChange={(event) => setPaymentDelayDays(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => void save()} disabled={busy}>
            Kaydet
          </Button>
          <Button variant="secondary" onClick={() => void load()} disabled={busy}>
            Yenile
          </Button>
        </div>

        {updatedAt ? <p className="text-xs text-slate-500">Son güncelleme: {new Date(updatedAt).toLocaleString("tr-TR")}</p> : null}
        {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
