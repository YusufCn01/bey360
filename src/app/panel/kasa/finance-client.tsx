"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FinanceClient() {
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

  async function runCollection() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await post("/api/tenant/finance/collections", {
        customerCode: "MUS-DEMO-001",
        customerName: "Demo Müşteri",
        amount: 250,
        method: "nakit",
      });
      setMessage("Müşteri tahsilat kaydı oluşturuldu.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tahsilat kaydı başarısız.");
    } finally {
      setLoading(false);
    }
  }

  async function runSupplierPayment() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await post("/api/tenant/finance/payments", {
        supplierCode: "TED-DEMO-001",
        supplierName: "Demo Tedarikçi",
        amount: 180,
        method: "nakit",
      });
      setMessage("Tedarikçi ödeme kaydı oluşturuldu.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tedarikçi ödeme kaydı başarısız.");
    } finally {
      setLoading(false);
    }
  }

  async function runCashTransfer() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await post("/api/tenant/finance/cash-transfers", {
        fromCashCode: "KASA:MERKEZ",
        fromCashName: "Merkez Kasa",
        toCashCode: "KASA:SUBE1",
        toCashName: "Şube 1 Kasa",
        amount: 75,
      });
      setMessage("Kasalar arası transfer kaydı oluşturuldu.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kasa transfer kaydı başarısız.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Tahsilat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Müşteriden tahsilat al, cari alacağı kapat ve kasaya giriş yaz.</p>
          <Button onClick={runCollection} disabled={loading}>
            Tahsilat Kaydı Oluştur
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ödeme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Tedarikçiye ödeme yap, cari borcu azalt ve kasadan çıkış yaz.</p>
          <Button variant="secondary" onClick={runSupplierPayment} disabled={loading}>
            Ödeme Kaydı Oluştur
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kasa Transferi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Kasalar arası transferde çift taraflı giriş/çıkış hareketi oluştur.</p>
          <Button variant="ghost" onClick={runCashTransfer} disabled={loading}>
            Transfer Kaydı Oluştur
          </Button>
        </CardContent>
      </Card>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
