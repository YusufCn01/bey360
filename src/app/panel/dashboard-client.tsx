"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type DashboardLastSoldItem = {
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  netAmount: number;
  occurredAt: string;
};

type DashboardLowStockProduct = {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  minStockLevel: number;
};

type DashboardRecentFinancialMove = {
  kind: string;
  code: string;
  amount: number;
  direction: "in" | "out" | "none";
  occurredAt: string;
  description: string;
};

type DashboardRiskCustomer = {
  customerCode: string;
  customerName: string;
  currentBalance: number;
  riskLimit: number;
  availableRisk: number;
  usageRate: number;
  status: "ok" | "warning" | "over_limit";
};

type DashboardClosingChecklistItem = {
  key: string;
  title: string;
  status: "ok" | "warning" | "critical";
  detail: string;
};

type DashboardData = {
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
  lastSoldItems: DashboardLastSoldItem[];
  lowStockProducts: DashboardLowStockProduct[];
  recentFinancialMoves: DashboardRecentFinancialMove[];
  riskyCustomers: DashboardRiskCustomer[];
  closingChecklist: DashboardClosingChecklistItem[];
  updatedAt: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { message?: string };
};

function formatDate(value: string): string {
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

function TrendChart({ series }: { series: DashboardMonthlyPoint[] }) {
  const width = 860;
  const height = 250;
  const padding = 24;
  const salesPath = buildLinePath(
    series.map((point) => point.sales),
    width,
    height,
    padding,
  );
  const cashInPath = buildLinePath(
    series.map((point) => point.cashIn),
    width,
    height,
    padding,
  );
  const cashOutPath = buildLinePath(
    series.map((point) => point.cashOut),
    width,
    height,
    padding,
  );

  return (
    <Card className="border-[#2f336c] bg-[#171a42] text-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Aylık Satış ve Kasa Akışı</CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full rounded-xl bg-[#101230]">
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={width} height={height} fill="url(#grid)" />
          <path d={salesPath} fill="none" stroke="#22d3ee" strokeWidth="2.8" strokeLinecap="round" />
          <path d={cashInPath} fill="none" stroke="#34d399" strokeWidth="2.8" strokeLinecap="round" />
          <path d={cashOutPath} fill="none" stroke="#fb7185" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-cyan-100">Satış</span>
          <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-emerald-100">Kasa Giriş</span>
          <span className="rounded-full bg-rose-400/20 px-3 py-1 text-rose-100">Kasa Çıkış</span>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <Card className="border-[#2f336c] bg-gradient-to-br from-[#272b66] to-[#171a42] text-white">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-semibold tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-extrabold leading-tight">{value}</p>
        <p className="mt-2 text-xs text-slate-300">{note}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">{text}</p>;
}

export function DashboardClient() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tenant/reports/dashboard", { cache: "no-store" });
      const body = (await response.json()) as ApiEnvelope<DashboardData>;
      if (!response.ok || !body.success || !body.data) {
        throw new Error(body.error?.message ?? "Gösterge paneli verisi alınamadı.");
      }
      setData(body.data);
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
      <Card>
        <CardHeader>
          <CardTitle>Gösterge Paneli</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">Veriler yükleniyor...</CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-rose-200 bg-rose-50">
        <CardHeader>
          <CardTitle className="text-rose-700">Gösterge paneli yüklenemedi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-rose-700">{error ?? "Bilinmeyen bir hata oluştu."}</p>
          <Button onClick={() => void load()} variant="secondary" size="sm">
            Yeniden Dene
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Bugün Satış" value={formatTry(data.dailySales)} note={`Haftalık satış: ${formatTry(data.weeklySales)}`} />
        <KpiCard title="Bugün Alış" value={formatTry(data.dailyPurchases)} note={`Aylık ciro: ${formatTry(data.monthlyRevenue)}`} />
        <KpiCard title="Bugün Kasa Giriş" value={formatTry(data.dailyCashIn)} note={`Toplam tahsilat: ${formatTry(data.totalCollections)}`} />
        <KpiCard title="Bugün Kasa Çıkış" value={formatTry(data.dailyCashOut)} note={`Toplam ödeme: ${formatTry(data.totalPayments)}`} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <KpiCard title="Müşteri Açık Bakiye" value={formatTry(data.customerDebtTotal)} note="Cari kartlarda toplam borç bakiyesi." />
        <KpiCard title="Risk Limiti Aşan" value={`${data.customersOverRiskLimit}`} note="Limitin üstünde olan cari müşteri sayısı." />
        <KpiCard title="Limite Yaklaşan" value={`${data.customersNearRiskLimit}`} note="Kullanım oranı %80 ve üzeri cari sayısı." />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <KpiCard title="Vadesi Geçen Alacak" value={formatTry(data.overdueReceivablesTotal)} note={`Vade aşımı olan müşteri sayısı: ${data.overdueReceivablesCount}`} />
        <KpiCard title="Yaklaşan Vade (3 Gün)" value={`${data.dueSoonReceivablesCount}`} note="3 gün içinde vadesi dolacak cari kayıt adedi." />
        <KpiCard title="Açık POS Oturumu" value={`${data.openPosSessionCount}`} note={`Askı sepet: ${data.suspendedCartCount}`} />
      </div>

      <TrendChart series={data.monthlyCashFlow} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Son Satılan Ürünler</CardTitle>
          </CardHeader>
          <CardContent>
            {data.lastSoldItems.length === 0 ? (
              <EmptyState text="Henüz satış satırı bulunmuyor." />
            ) : (
              <div className="overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-3 py-2">Ürün</th>
                      <th className="px-3 py-2">Adet</th>
                      <th className="px-3 py-2">Net</th>
                      <th className="px-3 py-2">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lastSoldItems.slice(0, 6).map((item) => (
                      <tr key={`${item.saleId}-${item.productId}`} className="border-t border-slate-100">
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2">{item.quantity}</td>
                        <td className="px-3 py-2">{formatTry(item.netAmount)}</td>
                        <td className="px-3 py-2">{formatDate(item.occurredAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">En Çok Satan Ürünler</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProducts.length === 0 ? (
              <EmptyState text="Henüz ürün satış istatistiği oluşmadı." />
            ) : (
              <div className="overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-3 py-2">Ürün</th>
                      <th className="px-3 py-2">Adet</th>
                      <th className="px-3 py-2">Ciro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((item) => (
                      <tr key={item.productId} className="border-t border-slate-100">
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2">{item.quantity}</td>
                        <td className="px-3 py-2">{formatTry(item.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ticari Kapanış Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            {data.closingChecklist.length === 0 ? (
              <EmptyState text="Checklist kaydı bulunmuyor." />
            ) : (
              <ul className="space-y-2 text-sm">
                {data.closingChecklist.map((item) => (
                  <li
                    key={item.key}
                    className={`rounded-lg border px-3 py-2 ${
                      item.status === "critical"
                        ? "border-rose-200 bg-rose-50 text-rose-900"
                        : item.status === "warning"
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "border-emerald-200 bg-emerald-50 text-emerald-900"
                    }`}
                  >
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs">{item.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Riskteki Müşteriler</CardTitle>
          </CardHeader>
          <CardContent>
            {data.riskyCustomers.length === 0 ? (
              <EmptyState text="Risk limiti yaklaşan veya aşan müşteri bulunmuyor." />
            ) : (
              <div className="overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-3 py-2">Müşteri</th>
                      <th className="px-3 py-2">Bakiye</th>
                      <th className="px-3 py-2">Limit</th>
                      <th className="px-3 py-2">Kullanım</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.riskyCustomers.map((row) => (
                      <tr key={row.customerCode} className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          <div className="font-semibold">{row.customerName}</div>
                          <div className="text-xs text-slate-500">{row.customerCode}</div>
                        </td>
                        <td className="px-3 py-2 font-semibold">{formatTry(row.currentBalance)}</td>
                        <td className="px-3 py-2">{formatTry(row.riskLimit)}</td>
                        <td className={`px-3 py-2 font-semibold ${row.status === "over_limit" ? "text-rose-700" : "text-amber-700"}`}>
                          %{Math.round(row.usageRate * 100)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Düşük Stok Uyarıları</CardTitle>
          </CardHeader>
          <CardContent>
            {data.lowStockProducts.length === 0 ? (
              <EmptyState text="Kritik stok altında ürün bulunmuyor." />
            ) : (
              <ul className="space-y-2 text-sm">
                {data.lowStockProducts.map((item) => (
                  <li key={item.productId} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                    <span className="font-semibold">{item.productName}</span> ({item.productCode}) - Mevcut: {item.quantity} / Kritik:{" "}
                    {item.minStockLevel}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Son Finans Hareketleri</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentFinancialMoves.length === 0 ? (
              <EmptyState text="Finans hareketi bulunmuyor." />
            ) : (
              <ul className="space-y-2 text-sm">
                {data.recentFinancialMoves.slice(0, 8).map((move) => (
                  <li key={`${move.code}-${move.occurredAt}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-800">{move.kind}</span>
                      <span
                        className={`font-semibold ${
                          move.direction === "in" ? "text-emerald-700" : move.direction === "out" ? "text-rose-700" : "text-slate-700"
                        }`}
                      >
                        {move.direction === "out" ? "-" : ""}
                        {formatTry(move.amount)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Kod: {move.code} | {formatDate(move.occurredAt)}
                    </p>
                    {move.description ? <p className="text-xs text-slate-600">{move.description}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-right text-xs text-slate-500">Son güncelleme: {formatDate(data.updatedAt)}</p>
    </div>
  );
}
