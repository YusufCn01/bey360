"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTry } from "@/lib/format/currency";

type DashboardMonthlyPoint = {
  day: number;
  sales: number;
  cashIn: number;
  cashOut: number;
};

type DashboardTopProduct = {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
};

type DashboardTopBrand = {
  brand: string;
  quantity: number;
  revenue: number;
};

type DashboardCashierPerformance = {
  cashierUserId: string;
  cashierName: string;
  saleCount: number;
  revenue: number;
};

type DashboardBranchPerformance = {
  branchId: string;
  branchName: string;
  saleCount: number;
  revenue: number;
};

type DashboardSummary = {
  dailySales: number;
  dailyPurchases: number;
  dailyCashIn: number;
  dailyCashOut: number;
  weeklySales: number;
  monthlyRevenue: number;
  lowStockCount: number;
  totalCollections: number;
  totalPayments: number;
  cashBalance: number;
  customerDebtTotal: number;
  customersNearRiskLimit: number;
  customersOverRiskLimit: number;
  overdueReceivablesTotal: number;
  overdueReceivablesCount: number;
  dueSoonReceivablesCount: number;
  openPosSessionCount: number;
  suspendedCartCount: number;
  monthlyCashFlow: DashboardMonthlyPoint[];
  topProducts: DashboardTopProduct[];
  topBrands?: DashboardTopBrand[];
  topCashiers?: DashboardCashierPerformance[];
  branchPerformance?: DashboardBranchPerformance[];
  updatedAt: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { message?: string };
};

function formatDateTime(value: string): string {
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

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 3 }).format(value);
}

function MetricCard(props: { title: string; value: string; note: string; tone?: "default" | "success" | "warning" | "danger" }) {
  const toneClass =
    props.tone === "success"
      ? "border-emerald-300/70"
      : props.tone === "warning"
        ? "border-amber-300/70"
        : props.tone === "danger"
          ? "border-rose-300/70"
          : "border-[color:var(--mx-border)]";

  return (
    <div className={`rounded-xl border bg-[color:var(--mx-surface)] p-3 shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--mx-text-muted)]">{props.title}</p>
      <p className="mt-1 text-xl font-black text-[color:var(--mx-text)]">{props.value}</p>
      <p className="mt-1 text-xs text-[color:var(--mx-text-muted)]">{props.note}</p>
    </div>
  );
}

function ProgressRow(props: { label: string; valueText: string; ratio: number; barClassName: string }) {
  const width = `${Math.max(4, Math.round(Math.min(100, Math.max(0, props.ratio)) * 100) / 100)}%`;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-semibold text-[color:var(--mx-text)]">{props.label}</span>
        <span className="whitespace-nowrap font-bold text-[color:var(--mx-text)]">{props.valueText}</span>
      </div>
      <div className="h-2 rounded-full bg-[color:var(--mx-surface-soft)]">
        <div className={`h-2 rounded-full ${props.barClassName}`} style={{ width }} />
      </div>
    </div>
  );
}

export function ReportsClient() {
  const [summary, setSummary] = React.useState<DashboardSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (fresh = false) => {
    if (fresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await fetch(`/api/tenant/reports/dashboard${fresh ? "?fresh=1" : ""}`, { cache: "no-store" });
      const body = (await response.json()) as ApiEnvelope<DashboardSummary>;
      if (!response.ok || !body.success || !body.data) {
        throw new Error(body.error?.message ?? "Rapor verisi alınamadı.");
      }
      setSummary(body.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Rapor verisi alınamadı.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      void load();
    }, 45_000);
    return () => window.clearInterval(timer);
  }, [load]);

  if (loading && !summary) {
    return <p className="text-sm text-[color:var(--mx-text-muted)]">Patron raporları yükleniyor...</p>;
  }

  if (!summary) {
    return (
      <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-3 text-sm text-rose-700">
        {error ?? "Rapor verisi alınamadı."}
      </div>
    );
  }

  const topProducts = summary.topProducts ?? [];
  const topBrands = summary.topBrands ?? [];
  const topCashiers = summary.topCashiers ?? [];
  const branchPerformance = summary.branchPerformance ?? [];
  const monthlySeries = summary.monthlyCashFlow ?? [];
  const maxFlowValue = Math.max(1, ...monthlySeries.flatMap((row) => [row.sales, row.cashIn, row.cashOut]));

  const maxProductQty = Math.max(1, ...topProducts.map((item) => item.quantity));
  const maxBrandQty = Math.max(1, ...topBrands.map((item) => item.quantity));

  return (
    <div className="space-y-4">
      <Card className="border-[color:var(--mx-border-strong)] bg-gradient-to-r from-[color:var(--mx-topbar-from)] via-[color:var(--mx-topbar-mid)] to-[color:var(--mx-topbar-to)] text-white">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/85">Canlı Patron Raporu</p>
            <h2 className="text-xl font-black">Satış / Finans / Risk Konsolu</h2>
            <p className="text-xs text-cyan-100/80">Son güncelleme: {formatDateTime(summary.updatedAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void load(true)} disabled={refreshing}>
              {refreshing ? "Yenileniyor..." : "Canlı Yenile"}
            </Button>
            <a href="/api/tenant/reports/exports/excel">
              <Button variant="secondary">Excel İndir</Button>
            </a>
            <a href="/api/tenant/reports/exports/pdf">
              <Button variant="ghost" className="border border-white/35 text-white hover:bg-white/10">
                PDF İndir
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {error ? <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Bugün Satış" value={formatTry(summary.dailySales)} note={`Haftalık: ${formatTry(summary.weeklySales)}`} tone="success" />
        <MetricCard title="Aylık Ciro" value={formatTry(summary.monthlyRevenue)} note={`Kasa Bakiye: ${formatTry(summary.cashBalance)}`} />
        <MetricCard title="Tahsilat / Ödeme" value={`${formatTry(summary.totalCollections)} / ${formatTry(summary.totalPayments)}`} note={`Bugün Kasa: +${formatTry(summary.dailyCashIn)} / -${formatTry(summary.dailyCashOut)}`} />
        <MetricCard
          title="Risk Durumu"
          value={`${summary.customersOverRiskLimit} Kritik`}
          note={`Yakın limit: ${summary.customersNearRiskLimit} | Vadesi geçen: ${summary.overdueReceivablesCount}`}
          tone={summary.customersOverRiskLimit > 0 ? "danger" : summary.customersNearRiskLimit > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">En Çok Satan Ürünler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-sm text-[color:var(--mx-text-muted)]">Henüz ürün satış verisi oluşmadı.</p>
            ) : (
              topProducts.map((item) => (
                <ProgressRow
                  key={item.productId}
                  label={item.productName}
                  valueText={`${formatQuantity(item.quantity)} adet`}
                  ratio={item.quantity / maxProductQty}
                  barClassName="bg-gradient-to-r from-emerald-500 to-cyan-500"
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">En Çok Satan Markalar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topBrands.length === 0 ? (
              <p className="text-sm text-[color:var(--mx-text-muted)]">Marka kırılımı için veri yok.</p>
            ) : (
              topBrands.map((item) => (
                <ProgressRow
                  key={item.brand}
                  label={item.brand}
                  valueText={`${formatQuantity(item.quantity)} adet`}
                  ratio={item.quantity / maxBrandQty}
                  barClassName="bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kasiyer Bazlı Ciro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topCashiers.length === 0 ? (
              <p className="text-sm text-[color:var(--mx-text-muted)]">Kasiyer performans verisi bulunamadı.</p>
            ) : (
              topCashiers.map((item) => (
                <div key={item.cashierUserId} className="flex items-center justify-between rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold text-[color:var(--mx-text)]">{item.cashierName}</p>
                    <p className="text-xs text-[color:var(--mx-text-muted)]">{item.saleCount} satış</p>
                  </div>
                  <p className="font-black text-[color:var(--mx-text)]">{formatTry(item.revenue)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Şube Bazlı Ciro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {branchPerformance.length === 0 ? (
              <p className="text-sm text-[color:var(--mx-text-muted)]">Şube performans verisi bulunamadı.</p>
            ) : (
              branchPerformance.map((item) => (
                <div key={item.branchId} className="flex items-center justify-between rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold text-[color:var(--mx-text)]">{item.branchName}</p>
                    <p className="text-xs text-[color:var(--mx-text-muted)]">{item.saleCount} satış</p>
                  </div>
                  <p className="font-black text-[color:var(--mx-text)]">{formatTry(item.revenue)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aylık Nakit / Satış Akışı</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlySeries.length === 0 ? (
            <p className="text-sm text-[color:var(--mx-text-muted)]">Aylık trend verisi bulunamadı.</p>
          ) : (
            <div className="space-y-2">
              {monthlySeries.slice(-12).map((row) => (
                <div key={row.day} className="grid grid-cols-[44px_1fr_92px] items-center gap-2 text-xs">
                  <span className="font-semibold text-[color:var(--mx-text-muted)]">{row.day}.gün</span>
                  <div className="flex h-2 overflow-hidden rounded-full bg-[color:var(--mx-surface-soft)]">
                    <div className="h-2 bg-emerald-500/80" style={{ width: `${(row.sales / maxFlowValue) * 100}%` }} />
                    <div className="h-2 bg-cyan-500/80" style={{ width: `${(row.cashIn / maxFlowValue) * 100}%` }} />
                    <div className="h-2 bg-rose-500/80" style={{ width: `${(row.cashOut / maxFlowValue) * 100}%` }} />
                  </div>
                  <span className="text-right font-semibold text-[color:var(--mx-text-muted)]">{formatTry(row.sales)}</span>
                </div>
              ))}
              <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-[color:var(--mx-text-muted)]">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Satış</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-500" /> Nakit Giriş</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Nakit Çıkış</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

