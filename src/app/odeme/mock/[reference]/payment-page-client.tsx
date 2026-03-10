"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PublicPaymentLink = {
  reference: string;
  status: string;
  customerReference: string | null;
  amount: number;
  currency: string;
  description: string;
  expiresAt: string | null;
};

export function PaymentPageClient({ reference }: { reference: string }) {
  const [data, setData] = React.useState<PublicPaymentLink | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/payment/mock/${reference}`);
      const body = (await response.json()) as { success: boolean; data: PublicPaymentLink; error: { message: string } };
      if (!response.ok || !body.success || !body.data) {
        throw new Error(body.error.message ?? "Ödeme linki alınamadı.");
      }
      setData(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ödeme linki alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [reference]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(status: "succeeded" | "failed" | "cancelled") {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/payment/mock/${reference}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const body = (await response.json()) as { success: boolean; error: { message: string } };
      if (!response.ok || !body.success) {
        throw new Error(body.error.message ?? "Ödeme işlemi tamamlanamadı.");
      }
      setMessage(status === "succeeded" ? "Ödeme başarılı." : status === "cancelled" ? "Ödeme iptal edildi." : "Ödeme başarısız.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ödeme işlemi tamamlanamadı.");
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Ödeme sayfası hazırlanıyor...</p>;
  }

  if (!data) {
    return <p className="text-sm text-rose-700">{error ?? "Ödeme linki bulunamadı."}</p>;
  }

  return (
    <div className="mx-auto w-full max-w-xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>Ödeme Sayfası</CardTitle>
          <p className="text-sm text-slate-500">Referans: {data.reference}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm">
              <span className="font-semibold">Müşteri:</span> {data.customerReference ?? "-"}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Açıklama:</span> {data.description}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Tutar:</span> {data.amount.toFixed(2)} {data.currency}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Durum:</span> {data.status}
            </p>
            <p className="text-xs text-slate-500">Son Kullanım: {data.expiresAt ?? "Belirtilmedi"}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button onClick={() => setStatus("succeeded")}>Ödemeyi Tamamla</Button>
            <Button variant="secondary" onClick={() => setStatus("failed")}>
              Başarısız Yap
            </Button>
            <Button variant="ghost" onClick={() => setStatus("cancelled")}>
              İptal Et
            </Button>
          </div>

          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
