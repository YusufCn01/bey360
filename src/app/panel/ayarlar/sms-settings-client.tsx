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
    headers,
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !body?.success) {
    throw new Error(body?.error?.message ?? "İşlem başarısız.");
  }
  return body.data;
}

export function SmsSettingsClient() {
  const [saleNotificationEnabled, setSaleNotificationEnabled] = React.useState(false);
  const [senderName, setSenderName] = React.useState("Bey360");
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestApi<SettingsResult>("/api/tenant/settings?scope=sms_settings");
      const payload = result.payload ?? {};
      setSaleNotificationEnabled(payload.saleNotificationEnabled === true);
      setSenderName(typeof payload.senderName === "string" && payload.senderName.trim() ? payload.senderName : "Bey360");
      setUpdatedAt(result.updatedAt);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "SMS ayarları yüklenemedi.");
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
      const result = await requestApi<SettingsResult>("/api/tenant/settings", {
        method: "POST",
        body: JSON.stringify({
          scope: "sms_settings",
          payload: {
            saleNotificationEnabled,
            senderName: senderName.trim() || "Bey360",
          },
        }),
      });
      setUpdatedAt(result.updatedAt);
      setMessage("SMS ayarları kaydedildi.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "SMS ayarları kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS Bilgilendirme Ayarları</CardTitle>
        <p className="text-sm text-slate-600">
          Satış tamamlandığında müşteriye SMS log kaydı üretir. Dış SMS sağlayıcı entegrasyonu için bu kapsam genişletilebilir.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p className="text-sm text-slate-500">Ayarlar yükleniyor...</p> : null}
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={saleNotificationEnabled}
            onChange={(event) => setSaleNotificationEnabled(event.target.checked)}
          />
          Satış sonrası müşteri SMS bilgilendirmesini aç
        </label>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Gönderici Adı</label>
          <input
            value={senderName}
            onChange={(event) => setSenderName(event.target.value)}
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            maxLength={20}
          />
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
