"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function InvoiceClient() {
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function post(url: string, body: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { success: boolean; data: unknown; error: { message: string } };
    if (!response.ok || !payload.success) {
      throw new Error(payload.error.message ?? "İşlem başarısız.");
    }
    return payload.data;
  }

  async function createSalesInvoice() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await post("/api/tenant/invoices", {
        customerCode: "MUS-DEMO-001",
        customerName: "Demo Müşteri",
        invoiceType: "satis",
        scenario: "EARSIV",
        lines: [
          {
            productId: "urun-demo-1",
            productName: "Demo Ürün",
            quantity: 2,
            unitPrice: 100,
            taxRate: 20,
          },
        ],
      });
      setMessage("Satış faturası oluşturuldu.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Satış faturası oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function createPurchaseInvoice() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await post("/api/tenant/purchases/invoices", {
        supplierCode: "TED-DEMO-001",
        supplierName: "Demo Tedarikçi",
        paidAmount: 50,
        lines: [
          {
            productId: "urun-demo-1",
            productName: "Demo Ürün",
            quantity: 5,
            unitPrice: 60,
            taxRate: 20,
          },
        ],
      });
      setMessage("Alış faturası oluşturuldu.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Alış faturası oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Satış Faturası</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Satış faturası, e-Arşiv belge taslağı ve fatura satırları tek işlemde oluşturulur.
          </p>
          <Button onClick={createSalesInvoice} disabled={loading}>
            Satış Faturası Oluştur
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alış Faturası</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Alış faturası, stok giriş hareketi, tedarikçi cari borç ve ödeme kaydı ile birlikte üretilir.
          </p>
          <Button variant="secondary" onClick={createPurchaseInvoice} disabled={loading}>
            Alış Faturası Oluştur
          </Button>
        </CardContent>
      </Card>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
