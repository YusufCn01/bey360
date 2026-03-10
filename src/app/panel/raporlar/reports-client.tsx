"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTry } from "@/lib/format/currency";

type DashboardSummary = {
  dailySales: number;
  weeklySales: number;
  monthlyRevenue: number;
  lowStockCount: number;
  totalCollections: number;
  totalPayments: number;
  cashBalance: number;
  updatedAt: string;
};

export function ReportsClient() {
  const [summary, setSummary] = React.useState<DashboardSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/tenant/reports/dashboard");
        const body = (await response.json()) as {
          success: boolean;
          data: DashboardSummary;
          error: { message: string };
        };
        if (!response.ok || !body.success || !body.data) {
          throw new Error(body.error.message ?? "Rapor verisi alınamadı.");
        }

        setSummary(body.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Rapor verisi alınamadı.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Rapor verisi hazırlanıyor...</p>;
  }

  if (error || !summary) {
    return <p className="text-sm text-rose-700">{error ?? "Rapor bulunamadı."}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Günlük Satış</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatTry(summary.dailySales)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Haftalık Satış</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatTry(summary.weeklySales)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Aylık Ciro</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatTry(summary.monthlyRevenue)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Kasa Bakiyesi</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatTry(summary.cashBalance)}</CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p className="font-semibold">Düşük Stok</p>
          <p className="text-slate-600">{summary.lowStockCount} ürün</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p className="font-semibold">Toplam Tahsilat</p>
          <p className="text-slate-600">{formatTry(summary.totalCollections)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p className="font-semibold">Toplam Ödeme</p>
          <p className="text-slate-600">{formatTry(summary.totalPayments)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href="/api/tenant/reports/exports/excel">
          <Button variant="secondary">Excel Rapor İndir</Button>
        </a>
        <a href="/api/tenant/reports/exports/pdf">
          <Button variant="ghost">PDF Rapor İndir</Button>
        </a>
      </div>
      <p className="text-xs text-slate-500">Son güncelleme: {summary.updatedAt}</p>
    </div>
  );
}
