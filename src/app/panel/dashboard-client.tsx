"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { formatTry } from "@/lib/format/currency";
import { formatDateTr } from "@/lib/format/date";

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

type DashboardLowStockProduct = {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  minStockLevel: number;
};

type DashboardData = {
  dailySales: number;
  dailyPurchases: number;
  dailyCashIn: number;
  dailyCashOut: number;
  weeklySales: number;
  monthlyRevenue: number;
  totalCollections: number;
  totalPayments: number;
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
  lowStockProducts: DashboardLowStockProduct[];
  updatedAt: string;
};

type TenantPlatformStatus = {
  maintenance?: {
    enabled: boolean;
    message: string;
  } | null;
  update?: {
    version: string;
    title: string;
    summary?: string;
    isForce: boolean;
    publishAt?: string;
  } | null;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { message?: string };
};

function formatDate(value?: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return formatDateTr(date);
}

function buildLinePath(values: number[], width: number, height: number, padding: number): string {
  if (values.length === 0) {
    return "";
  }

  const max = Math.max(...values, 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const stepX = values.length > 1 ? innerWidth / (values.length - 1) : innerWidth;

  return values
    .map((value, index) => {
      const x = padding + index * stepX;
      const y = height - padding - (value / max) * innerHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function miniCard(title: string, value: string, note: string, dotClass: string) {
  return (
    <div className="rounded-xl border border-[#1f3553] bg-[#0b1d35] p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-slate-300">{title}</p>
        <span className={`mt-1 inline-flex h-2 w-2 rounded-full ${dotClass}`} />
      </div>
      <p className="mt-2 text-3xl font-black leading-none text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{note}</p>
    </div>
  );
}

function summaryCard(title: string, value: string, note: string) {
  return (
    <div className="rounded-xl border border-[#1f3553] bg-[#0b1d35] px-3 py-3">
      <p className="text-xs font-semibold text-slate-300">{title}</p>
      <p className="mt-2 text-[26px] font-black leading-none text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{note}</p>
    </div>
  );
}

function TrendChart({ series }: { series: DashboardMonthlyPoint[] }) {
  const [period, setPeriod] = React.useState<7 | 30>(7);

  const view = React.useMemo(() => {
    if (series.length === 0) {
      return [] as DashboardMonthlyPoint[];
    }
    return series.slice(-period);
  }, [series, period]);

  const width = 1000;
  const height = 320;
  const padding = 30;

  const salesPath = buildLinePath(
    view.map((point) => point.sales),
    width,
    height,
    padding,
  );

  const cashOutPath = buildLinePath(
    view.map((point) => point.cashOut),
    width,
    height,
    padding,
  );

  return (
    <section className="rounded-2xl border border-[#1f3553] bg-[#0b1d35] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xl font-black text-white">Satış ve Tahsilat Trendi</h3>
          <p className="text-sm text-slate-400">Son aktivite görünümü</p>
        </div>

        <label className="inline-flex items-center gap-2 rounded-lg border border-[#2b466a] bg-[#102641] px-3 py-2 text-sm font-semibold text-slate-200">
          <span>Dönem</span>
          <select
            value={period}
            onChange={(event) => setPeriod(Number(event.target.value) as 7 | 30)}
            className="bg-transparent text-sm text-slate-100 outline-none"
          >
            <option value={7}>Son 7 Gün</option>
            <option value={30}>Son 30 Gün</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#223b5b] bg-[#071528]">
        {view.length === 0 ? (
          <div className="grid h-[320px] place-items-center text-sm text-slate-400">Grafik için veri bulunamadı.</div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="h-[320px] min-w-[760px] w-full">
            <defs>
              <pattern id="kpi-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect x="0" y="0" width={width} height={height} fill="url(#kpi-grid)" />
            <path d={salesPath} fill="none" stroke="#22b8ff" strokeWidth="5" strokeLinecap="round" />
            <path d={cashOutPath} fill="none" stroke="#f43f74" strokeWidth="5" strokeDasharray="14 10" strokeLinecap="round" />
          </svg>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-sky-400/40 bg-sky-400/15 px-2.5 py-1 font-bold text-sky-200">Satış</span>
        <span className="rounded-full border border-pink-400/40 bg-pink-400/15 px-2.5 py-1 font-bold text-pink-200">Kasa Çıkış</span>
      </div>
    </section>
  );
}

export function DashboardClient() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [platform, setPlatform] = React.useState<TenantPlatformStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashboardResponse, platformResponse] = await Promise.all([
        fetch("/api/tenant/reports/dashboard", { cache: "no-store" }),
        fetch("/api/tenant/platform-status", { cache: "no-store" }),
      ]);

      const dashboardBody = (await dashboardResponse.json()) as ApiEnvelope<DashboardData>;

      if (!dashboardResponse.ok || !dashboardBody.success || !dashboardBody.data) {
        throw new Error(dashboardBody.error?.message ?? "Gösterge paneli verisi alınamadı.");
      }

      setData(dashboardBody.data);

      if (platformResponse.ok) {
        const platformBody = (await platformResponse.json()) as ApiEnvelope<TenantPlatformStatus>;
        if (platformBody.success && platformBody.data) {
          setPlatform(platformBody.data);
        }
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Gösterge paneli verisi alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-[#1f3553] bg-[#0a1a31] p-6 text-slate-200">
        <p className="text-sm font-semibold">Dashboard yükleniyor...</p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-2xl border border-rose-400/45 bg-rose-950/30 p-6 text-rose-100">
        <h2 className="text-lg font-black">Dashboard yüklenemedi</h2>
        <p className="mt-2 text-sm">{error ?? "Bilinmeyen bir hata oluştu."}</p>
        <Button onClick={() => void load()} variant="secondary" size="sm" className="mt-4">
          Yeniden Dene
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#1f3553] bg-[#071a31] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md bg-[#0197e8] px-2 py-1 text-xs font-black text-white">LİSANS & GÜNCELLEME</span>
          {platform?.update ? (
            <>
              <span className="font-black text-slate-100">v{platform.update.version}</span>
              <span className="text-slate-200">{platform.update.title}</span>
              <button type="button" className="ml-auto text-cyan-300 hover:text-cyan-200">
                İncele →
              </button>
            </>
          ) : (
            <span className="font-semibold text-emerald-300">Sistem güncel ve çevrimiçi.</span>
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {miniCard("Bugün Satış", formatTry(data.dailySales), `Haftalık: ${formatTry(data.weeklySales)}`, "bg-cyan-400")}
        {miniCard("Bugün Alış", formatTry(data.dailyPurchases), `Aylık: ${formatTry(data.monthlyRevenue)}`, "bg-violet-400")}
        {miniCard("Bugün Kasa Giriş", formatTry(data.dailyCashIn), `Toplam tahsilat: ${formatTry(data.totalCollections)}`, "bg-emerald-400")}
        {miniCard("Bugün Kasa Çıkış", formatTry(data.dailyCashOut), `Toplam ödeme: ${formatTry(data.totalPayments)}`, "bg-rose-400")}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {summaryCard("Müşteri Açık Bakiye", formatTry(data.customerDebtTotal), "Cari kartlardaki toplam borç")}
        {summaryCard("Risk Limiti Aşan", String(data.customersOverRiskLimit), "Limit üzerinde müşteri")}
        {summaryCard("Limite Yaklaşan", String(data.customersNearRiskLimit), "Kritik kullanım oranı")}
        {summaryCard("Vadesi Geçen Alacak", formatTry(data.overdueReceivablesTotal), `Müşteri: ${data.overdueReceivablesCount}`)}
        {summaryCard("Açık POS Oturumu", String(data.openPosSessionCount), `Askıda sepet: ${data.suspendedCartCount}`)}
      </section>

      <TrendChart series={data.monthlyCashFlow} />

      <section className="grid gap-3 xl:grid-cols-2">
        <div className="rounded-xl border border-[#1f3553] bg-[#0b1d35] p-4">
          <h3 className="text-base font-black text-white">En Çok Satan Ürünler</h3>
          {data.topProducts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Satış istatistiği oluşmadı.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {data.topProducts.slice(0, 6).map((item) => (
                <div key={item.productId} className="flex items-center justify-between rounded-md border border-[#224060] bg-[#0a203a] px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-100">{item.productName}</p>
                    <p className="text-xs text-slate-400">Adet: {item.quantity}</p>
                  </div>
                  <p className="font-black text-cyan-300">{formatTry(item.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#1f3553] bg-[#0b1d35] p-4">
          <h3 className="text-base font-black text-white">Düşük Stok Uyarıları</h3>
          {data.lowStockProducts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Kritik seviyede ürün bulunmuyor.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {data.lowStockProducts.slice(0, 6).map((item) => (
                <div key={item.productId} className="rounded-md border border-amber-500/35 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
                  <p className="font-semibold">{item.productName}</p>
                  <p className="text-xs text-amber-200/90">
                    Kod: {item.productCode} • Mevcut: {item.quantity} • Min: {item.minStockLevel}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <p className="text-right text-xs text-slate-500">Son güncelleme: {formatDate(data.updatedAt)}</p>
    </div>
  );
}
