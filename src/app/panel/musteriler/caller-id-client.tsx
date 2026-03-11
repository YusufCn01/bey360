"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTry } from "@/lib/format/currency";

type CallerLookupResponse = {
  matched: boolean;
  customer: null | {
    id: string;
    code: string;
    name: string;
    phone: string;
    currentBalance: number;
    riskLimit: number;
    maturityDays: number;
  };
  recentSales: Array<{
    id: string;
    saleCode: string;
    total: number;
    occurredAt: string;
  }>;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { message?: string };
};

async function requestApi<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !body?.success) {
    throw new Error(body?.error?.message ?? "İşlem başarısız.");
  }
  return body.data;
}

export function CallerIdClient() {
  const [phone, setPhone] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<CallerLookupResponse | null>(null);

  async function lookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await requestApi<CallerLookupResponse>(`/api/tenant/caller-id/lookup?phone=${encodeURIComponent(phone)}`);
      setResult(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Arayan numara sorgulanamadı.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Çağrı Takip (Caller-ID)</CardTitle>
        <p className="text-sm text-slate-600">Arayan numarayı yazın, sistem müşteriyi bulup bakiye ve son satışlarını getirsin.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={lookup} className="flex flex-wrap gap-2">
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="05xx xxx xx xx"
            className="h-10 min-w-[260px] flex-1 rounded-md border border-slate-300 px-3 text-sm"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Sorgulanıyor..." : "Numara Sorgula"}
          </Button>
        </form>

        {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        {result ? (
          result.matched && result.customer ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Müşteri</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {result.customer.code} - {result.customer.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Telefon</p>
                  <p className="text-sm font-semibold text-slate-900">{result.customer.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Mevcut Bakiye</p>
                  <p className="text-sm font-semibold text-rose-700">{formatTry(result.customer.currentBalance)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Risk Limiti / Vade</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatTry(result.customer.riskLimit)} / {result.customer.maturityDays} gün
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-white p-2">
                <p className="mb-2 text-sm font-semibold text-slate-800">Son Satışlar</p>
                {result.recentSales.length === 0 ? (
                  <p className="text-sm text-slate-500">Satış geçmişi yok.</p>
                ) : (
                  <ul className="space-y-1">
                    {result.recentSales.map((row) => (
                      <li key={row.id} className="flex items-center justify-between rounded border border-slate-100 px-2 py-1 text-sm">
                        <span className="font-medium text-slate-700">{row.saleCode}</span>
                        <span className="text-slate-500">{new Date(row.occurredAt).toLocaleString("tr-TR")}</span>
                        <span className="font-semibold text-slate-900">{formatTry(row.total)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Bu numaraya bağlı müşteri kaydı bulunamadı.
            </p>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
