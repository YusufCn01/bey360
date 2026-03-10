"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CompanySettings = {
  companyName: string;
  tradeName: string;
  taxOffice: string;
  taxNumber: string;
  mersisNo: string;
  phone: string;
  email: string;
  website: string;
  city: string;
  district: string;
  address: string;
  branchName: string;
  logoUrl: string;
};

type SettingsEnvelope = {
  success: boolean;
  data?: {
    payload?: Record<string, unknown>;
  };
  error?: { message?: string };
};

const initialState: CompanySettings = {
  companyName: "",
  tradeName: "",
  taxOffice: "",
  taxNumber: "",
  mersisNo: "",
  phone: "",
  email: "",
  website: "",
  city: "",
  district: "",
  address: "",
  branchName: "MERKEZ",
  logoUrl: "",
};

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function CompanySettingsClient() {
  const [form, setForm] = React.useState<CompanySettings>(initialState);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  function patch<K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tenant/settings?scope=firma_ayarlari", { cache: "no-store" });
      const body = (await response.json()) as SettingsEnvelope;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Firma ayarları yüklenemedi.");
      }

      const payload = body.data?.payload ?? {};
      setForm({
        companyName: asText(payload.companyName),
        tradeName: asText(payload.tradeName),
        taxOffice: asText(payload.taxOffice),
        taxNumber: asText(payload.taxNumber),
        mersisNo: asText(payload.mersisNo),
        phone: asText(payload.phone),
        email: asText(payload.email),
        website: asText(payload.website),
        city: asText(payload.city),
        district: asText(payload.district),
        address: asText(payload.address),
        branchName: asText(payload.branchName, "MERKEZ"),
        logoUrl: asText(payload.logoUrl),
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Firma ayarları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/tenant/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "firma_ayarlari",
          payload: form,
        }),
      });
      const body = (await response.json()) as SettingsEnvelope;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Firma ayarları kaydedilemedi.");
      }

      setMessage("Firma ayarları kaydedildi.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Firma ayarları kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Firma Ayarları</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-[color:var(--mx-text-muted)]">Ayarlar yükleniyor...</p> : null}
        {!loading ? (
          <form onSubmit={saveSettings} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold">Firma Adı</label>
                <input value={form.companyName} onChange={(event) => patch("companyName", event.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Ticari Ünvan</label>
                <input value={form.tradeName} onChange={(event) => patch("tradeName", event.target.value)} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-semibold">Vergi Dairesi</label>
                <input value={form.taxOffice} onChange={(event) => patch("taxOffice", event.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Vergi No</label>
                <input value={form.taxNumber} onChange={(event) => patch("taxNumber", event.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">MERSİS No</label>
                <input value={form.mersisNo} onChange={(event) => patch("mersisNo", event.target.value)} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-semibold">Telefon</label>
                <input value={form.phone} onChange={(event) => patch("phone", event.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">E-posta</label>
                <input type="email" value={form.email} onChange={(event) => patch("email", event.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Web Sitesi</label>
                <input value={form.website} onChange={(event) => patch("website", event.target.value)} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-semibold">Şube</label>
                <input value={form.branchName} onChange={(event) => patch("branchName", event.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Şehir</label>
                <input value={form.city} onChange={(event) => patch("city", event.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">İlçe</label>
                <input value={form.district} onChange={(event) => patch("district", event.target.value)} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">Adres</label>
              <textarea value={form.address} onChange={(event) => patch("address", event.target.value)} rows={3} />
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <div>
                <label className="mb-1 block text-sm font-semibold">Logo URL</label>
                <input value={form.logoUrl} onChange={(event) => patch("logoUrl", event.target.value)} />
              </div>
              <div className="grid place-items-center rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-2">
                {form.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logoUrl} alt="Firma logosu" className="max-h-20 object-contain" />
                ) : (
                  <span className="text-xs text-[color:var(--mx-text-muted)]">Logo önizleme</span>
                )}
              </div>
            </div>

            {message ? (
              <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
            ) : null}
            {error ? (
              <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => void load()} disabled={saving}>
                Yenile
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
