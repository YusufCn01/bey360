"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/tables/data-table";
import { formatTry } from "@/lib/format/currency";
import { formatDateTr } from "@/lib/format/date";
import { OrganizationUnitsClient } from "@/app/panel/organization-units-client";

type FeatureWorkspaceClientProps = {
  moduleSegment: string;
  featureSegment: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { message?: string };
};

type RowData = Record<string, unknown> & { id: string };

type ColumnSpec = {
  key: string;
  label: string;
  kind?: "text" | "date" | "amount" | "status";
  currencyKey?: string;
};

type DashboardSummary = {
  dailySales: number;
  monthlyRevenue: number;
  totalCollections: number;
  totalPayments: number;
  cashBalance: number;
  updatedAt: string;
};

type SettingsResult = {
  id: string | null;
  scope: string;
  payload: Record<string, unknown>;
  updatedAt: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asText(value: unknown, fallback = "-"): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asDateText(value: unknown): string {
  if (typeof value !== "string") {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return formatDateTr(parsed);
}

async function requestApi<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.method && init.method !== "GET" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers,
  });
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !body || !body.success) {
    throw new Error(body?.error?.message ?? "İşlem sırasında hata oluştu.");
  }
  return body.data;
}

function normalizeRows(data: unknown): RowData[] {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map((item, index) => {
    if (!isRecord(item)) {
      return { id: `satir-${index + 1}` };
    }
    const payload = isRecord(item.payload) ? item.payload : {};
    return {
      ...item,
      ...payload,
      id: asText(item.id ?? item.code ?? `satir-${index + 1}`),
      occurredAt: item.occurredAt ?? item.updatedAt ?? item.createdAt ?? null,
      code: item.code ?? payload.code ?? "",
      name: item.name ?? payload.name ?? "",
      status: item.status ?? payload.status ?? "",
    };
  });
}

function buildColumns(specs: ColumnSpec[]): ColumnDef<RowData>[] {
  return specs.map((spec) => ({
    id: spec.key,
    accessorFn: (row) => row[spec.key],
    header: spec.label,
    cell: ({ row }) => {
      const value = row.original[spec.key];
      if (spec.kind === "date") {
        return asDateText(value);
      }
      if (spec.kind === "amount") {
        const amount = asNumber(value);
        const currency = asText(row.original[spec.currencyKey ?? "currency"], "TRY");
        return new Intl.NumberFormat("tr-TR", {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);
      }
      if (spec.kind === "status") {
        return <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{asText(value, "tanımsız")}</span>;
      }
      return asText(value);
    },
  }));
}

function Notice({ error, message }: { error?: string | null; message?: string | null }) {
  return (
    <>
      {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </>
  );
}

type FeatureTableProps = {
  title: string;
  description: string;
  endpoint: string;
  columns: ColumnSpec[];
  searchPlaceholder: string;
  refreshKey?: number;
  transformRows?: (rows: RowData[]) => RowData[];
};

function FeatureTable({
  title,
  description,
  endpoint,
  columns,
  searchPlaceholder,
  refreshKey = 0,
  transformRows,
}: FeatureTableProps) {
  const [rows, setRows] = React.useState<RowData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await requestApi<unknown>(endpoint);
      const normalized = normalizeRows(raw);
      setRows(transformRows ? transformRows(normalized) : normalized);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Liste alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [endpoint, transformRows]);

  React.useEffect(() => {
    void load();
  }, [load, tick, refreshKey]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setTick((value) => value + 1)}>
          Yenile
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-slate-500">Veriler yükleniyor...</p> : null}
        <Notice error={error} />
        {!loading && !error ? <DataTable columns={buildColumns(columns)} data={rows} globalFilterPlaceholder={searchPlaceholder} /> : null}
      </CardContent>
    </Card>
  );
}

function SnapshotFeature({ title, description }: { title: string; description: string }) {
  const [data, setData] = React.useState<DashboardSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const summary = await requestApi<DashboardSummary>("/api/tenant/reports/dashboard");
        setData(summary);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Özet verisi alınamadı.");
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-slate-500">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <p className="text-sm text-slate-500">Özet hazırlanıyor...</p> : null}
        <Notice error={error} />
        {!loading && !error && data ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-semibold">Günlük Satış</p>
                <p>{formatTry(data.dailySales)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-semibold">Aylık Ciro</p>
                <p>{formatTry(data.monthlyRevenue)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-semibold">Tahsilat</p>
                <p>{formatTry(data.totalCollections)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-semibold">Ödeme</p>
                <p>{formatTry(data.totalPayments)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-semibold">Kasa Bakiye</p>
                <p>{formatTry(data.cashBalance)}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">Son güncelleme: {asDateText(data.updatedAt)}</p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SettingsFeature({ scope, title, description }: { scope: string; title: string; description: string }) {
  const [payloadText, setPayloadText] = React.useState("{}");
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestApi<SettingsResult>(`/api/tenant/settings?scope=${encodeURIComponent(scope)}`);
      setPayloadText(JSON.stringify(result.payload ?? {}, null, 2));
      setUpdatedAt(result.updatedAt);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Ayarlar alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload = JSON.parse(payloadText) as Record<string, unknown>;
      const result = await requestApi<SettingsResult>("/api/tenant/settings", {
        method: "POST",
        body: JSON.stringify({ scope, payload }),
      });
      setUpdatedAt(result.updatedAt);
      setMessage("Ayarlar kaydedildi.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Ayarlar kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-slate-500">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <p className="text-sm text-slate-500">Ayarlar yükleniyor...</p> : null}
        <textarea
          value={payloadText}
          onChange={(event) => setPayloadText(event.target.value)}
          className="h-72 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
          spellCheck={false}
        />
        <div className="flex gap-2">
          <Button onClick={() => void save()} disabled={busy}>
            Kaydet
          </Button>
          <Button variant="secondary" onClick={() => void load()} disabled={busy}>
            Yeniden Yükle
          </Button>
        </div>
        {updatedAt ? <p className="text-xs text-slate-500">Son güncelleme: {asDateText(updatedAt)}</p> : null}
        <Notice error={error} message={message} />
      </CardContent>
    </Card>
  );
}

function BulkPriceFeature() {
  const [operation, setOperation] = React.useState<"increase_percent" | "decrease_percent" | "set_price">("increase_percent");
  const [value, setValue] = React.useState("5");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  async function updatePrices(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await requestApi<{ updatedCount: number }>("/api/tenant/products/prices", {
        method: "POST",
        body: JSON.stringify({
          operation,
          value: asNumber(value),
        }),
      });
      setMessage(`${result.updatedCount} ürün için toplu fiyat güncellemesi yapıldı.`);
      setRefreshKey((v) => v + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Toplu güncelleme başarısız.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Toplu Fiyat Güncelle</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={updatePrices} className="grid gap-3 md:grid-cols-3">
            <select
              value={operation}
              onChange={(event) => setOperation(event.target.value as "increase_percent" | "decrease_percent" | "set_price")}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="increase_percent">Yüzde Artır</option>
              <option value="decrease_percent">Yüzde Azalt</option>
              <option value="set_price">Sabit Fiyat</option>
            </select>
            <input value={value} onChange={(event) => setValue(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" inputMode="decimal" />
            <Button type="submit" disabled={busy}>
              Uygula
            </Button>
          </form>
          <div className="mt-3">
            <Notice error={error} message={message} />
          </div>
        </CardContent>
      </Card>
      <FeatureTable
        title="Ürün Fiyat Listesi"
        description="Güncel ürün fiyatlarını bu listeden takip edin."
        endpoint="/api/tenant/products?limit=250"
        columns={[
          { key: "code", label: "Kod" },
          { key: "name", label: "Ürün" },
          { key: "salePrice", label: "Satış Fiyatı", kind: "amount" },
          { key: "status", label: "Durum", kind: "status" },
        ]}
        searchPlaceholder="Ürün ara..."
        refreshKey={refreshKey}
      />
    </div>
  );
}

function PaymentLinksFeature() {
  const [customerReference, setCustomerReference] = React.useState("");
  const [amount, setAmount] = React.useState("0");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  async function createLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await requestApi<{ providerReference: string }>("/api/tenant/payment-links", {
        method: "POST",
        body: JSON.stringify({
          providerCode: "mock-payment",
          amount: asNumber(amount),
          currency: "TRY",
          customerReference,
          customerName: customerReference,
          description: "Ödeme linki tahsilatı",
        }),
      });
      setMessage(`Ödeme linki üretildi: ${result.providerReference}`);
      setCustomerReference("");
      setAmount("0");
      setRefreshKey((v) => v + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Ödeme linki oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ödeme Linki Üret</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createLink} className="grid gap-3 md:grid-cols-3">
            <input
              value={customerReference}
              onChange={(event) => setCustomerReference(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Müşteri referansı"
              required
            />
            <input value={amount} onChange={(event) => setAmount(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" inputMode="decimal" placeholder="Tutar" />
            <Button type="submit" disabled={busy}>
              Link Oluştur
            </Button>
          </form>
          <div className="mt-3">
            <Notice error={error} message={message} />
          </div>
        </CardContent>
      </Card>
      <FeatureTable
        title="Ödeme Linkleri"
        description="Üretilen ödeme linklerinin durum takibi."
        endpoint="/api/tenant/payment-links?limit=250"
        columns={[
          { key: "code", label: "Referans" },
          { key: "name", label: "Müşteri Referansı" },
          { key: "amount", label: "Tutar", kind: "amount" },
          { key: "status", label: "Durum", kind: "status" },
          { key: "occurredAt", label: "Tarih", kind: "date" },
        ]}
        searchPlaceholder="Referans veya müşteri ara..."
        refreshKey={refreshKey}
      />
    </div>
  );
}

function RolesFeature() {
  const [rows, setRows] = React.useState<RowData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const result = await requestApi<{ roles: unknown[]; permissions: unknown[] }>("/api/tenant/roles?includePermissions=true");
        setRows(
          normalizeRows(result.roles).map((row) => ({
            ...row,
            permissionCount: Array.isArray(row.permissions) ? row.permissions.length : 0,
          })),
        );
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Rol verisi alınamadı.");
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rol ve Yetki Görünümü</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-slate-500">Yükleniyor...</p> : null}
        <Notice error={error} />
        {!loading && !error ? (
          <DataTable
            columns={buildColumns([
              { key: "code", label: "Rol Kodu" },
              { key: "name", label: "Rol Adı" },
              { key: "permissionCount", label: "Yetki Sayısı" },
              { key: "isSystem", label: "Sistem Rolü" },
            ])}
            data={rows}
            globalFilterPlaceholder="Rol ara..."
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function SubscriptionFeature() {
  const [rows, setRows] = React.useState<RowData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const summary = await requestApi<{
          subscription: { code: string | null; status: string; payload: { billingCycle: string; startsAt: string; endsAt: string } } | null;
          usage: Array<{ key: string; value: number }>;
          entitlements: Array<{ key: string; value: string }>;
        }>("/api/tenant/subscription/current");

        const baseRows: RowData[] = summary.usage.map((item) => ({
          id: `usage-${item.key}`,
          type: "Kullanım",
          key: item.key,
          value: item.value,
          status: summary.subscription?.status ?? "-",
        }));
        const entitlementRows: RowData[] = summary.entitlements.map((item) => ({
          id: `entitlement-${item.key}`,
          type: "Yetki",
          key: item.key,
          value: item.value,
          status: summary.subscription?.status ?? "-",
        }));
        setRows([...baseRows, ...entitlementRows]);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Abonelik verisi alınamadı.");
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Abonelik ve Kullanım Özeti</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-slate-500">Yükleniyor...</p> : null}
        <Notice error={error} />
        {!loading && !error ? (
          <DataTable columns={buildColumns([{ key: "type", label: "Tip" }, { key: "key", label: "Anahtar" }, { key: "value", label: "Değer" }, { key: "status", label: "Durum" }])} data={rows} globalFilterPlaceholder="Arama..." />
        ) : null}
      </CardContent>
    </Card>
  );
}

function resolveFeature(moduleSegment: string, featureSegment: string): React.ReactNode {
  const key = `${moduleSegment}/${featureSegment}`;

  if (key === "urunler/fiyat-listeleri" || key === "urunler/toplu-guncelleme") {
    return <BulkPriceFeature />;
  }
  if (key === "odeme/odeme-linkleri") {
    return <PaymentLinksFeature />;
  }
  if (key === "kullanicilar/roller" || key === "kullanicilar/yetkiler") {
    return <RolesFeature />;
  }
  if (key.startsWith("abonelik/")) {
    return <SubscriptionFeature />;
  }

  if (key === "stok/sube-tanimlari" || key === "stok/depo-tanimlari" || key === "ayarlar/sube-depo-yonetimi") {
    return <OrganizationUnitsClient />;
  }

  if (key === "kasa/tahsilat-ve-odeme") {
    return (
      <FeatureTable
        title="Tahsilat ve Ödeme Hareketleri"
        description="Müşteri tahsilat ve tedarikçi ödeme hareketlerini birlikte izleyin."
        endpoint="/api/tenant/finance/collections?limit=250"
        columns={[
          { key: "code", label: "Fiş No" },
          { key: "customerCode", label: "Müşteri" },
          { key: "amount", label: "Tutar", kind: "amount" },
          { key: "method", label: "Yöntem" },
          { key: "occurredAt", label: "Tarih", kind: "date" },
        ]}
        searchPlaceholder="Müşteri veya fiş ara..."
      />
    );
  }

  if (key === "pos/oturum-ve-kasa" || key === "kasa/gun-sonu-kapanis" || key.startsWith("raporlar/")) {
    return <SnapshotFeature title="Operasyon Özeti" description="Anlık KPI göstergeleri ile karar destek ekranı." />;
  }

  if (key.startsWith("ayarlar/")) {
    const scopeMap: Record<string, string> = {
      "ayarlar/pos-ayarlar": "pos_settings",
      "ayarlar/e-fatura-ayarlar": "e_invoice_settings",
      "ayarlar/entegrasyon-ayarlar": "integration_settings",
      "ayarlar/yazici-ayarlar": "printer_settings",
    };
    const scope = scopeMap[key] ?? "general_settings";
    return <SettingsFeature scope={scope} title="Ayar Yönetimi" description="JSON tabanlı ayar kaydı." />;
  }

  const tableMap: Record<string, FeatureTableProps> = {
    "pos/askidaki-sepetler": {
      title: "Askıdaki Sepetler",
      description: "Bekleyen satış sepetleri.",
      endpoint: "/api/tenant/pos/suspended?limit=200",
      columns: [
        { key: "code", label: "Sepet No" },
        { key: "registerId", label: "Kasa" },
        { key: "customerName", label: "Müşteri" },
        { key: "status", label: "Durum", kind: "status" },
        { key: "occurredAt", label: "Tarih", kind: "date" },
      ],
      searchPlaceholder: "Sepet veya müşteri ara...",
    },
    "pos/iade-islemleri": {
      title: "POS İadeleri",
      description: "İade işlemleri listesi.",
      endpoint: "/api/tenant/pos/returns?limit=250",
      columns: [
        { key: "code", label: "İade No" },
        { key: "customerName", label: "Müşteri" },
        { key: "refundTotal", label: "Tutar", kind: "amount" },
        { key: "status", label: "Durum", kind: "status" },
        { key: "occurredAt", label: "Tarih", kind: "date" },
      ],
      searchPlaceholder: "İade veya müşteri ara...",
    },
    "stok/depo-bazli-bakiye": {
      title: "Depo Bazlı Bakiye",
      description: "Depo kırılımında stok miktarı.",
      endpoint: "/api/tenant/inventory/stock-balances?limit=300",
      columns: [
        { key: "productId", label: "Ürün ID" },
        { key: "warehouseId", label: "Depo" },
        { key: "quantity", label: "Miktar" },
        { key: "occurredAt", label: "Tarih", kind: "date" },
      ],
      searchPlaceholder: "Ürün veya depo ara...",
    },
    "stok/stok-sayim": {
      title: "Stok Sayım",
      description: "Stok sayım kayıtları.",
      endpoint: "/api/tenant/inventory/stock-balances?limit=300",
      columns: [
        { key: "productId", label: "Ürün ID" },
        { key: "warehouseId", label: "Depo" },
        { key: "quantity", label: "Miktar" },
      ],
      searchPlaceholder: "Arama...",
    },
    "stok/stok-transfer": {
      title: "Stok Transfer",
      description: "Transfer hareketleri.",
      endpoint: "/api/tenant/inventory/stock-movements?limit=300",
      columns: [
        { key: "code", label: "Hareket Kodu" },
        { key: "productId", label: "Ürün ID" },
        { key: "warehouseId", label: "Depo" },
        { key: "deltaQuantity", label: "Miktar" },
      ],
      searchPlaceholder: "Transfer ara...",
      transformRows: (rows) => rows.filter((row) => asText(row.code, "").toUpperCase().includes("TRANSFER")),
    },
    "musteriler/cari-ekstre": {
      title: "Müşteri Cari Ekstre",
      description: "Müşteri bakiyeleri.",
      endpoint: "/api/tenant/customers?view=balance&limit=250",
      columns: [
        { key: "code", label: "Müşteri Kodu" },
        { key: "name", label: "Müşteri" },
        { key: "balance", label: "Bakiye", kind: "amount" },
      ],
      searchPlaceholder: "Müşteri ara...",
    },
    "musteriler/tahsilat-gecmisi": {
      title: "Müşteri Tahsilat Geçmişi",
      description: "Tahsilat kayıtları.",
      endpoint: "/api/tenant/finance/collections?limit=250",
      columns: [
        { key: "code", label: "Fiş No" },
        { key: "customerCode", label: "Müşteri" },
        { key: "amount", label: "Tutar", kind: "amount" },
        { key: "occurredAt", label: "Tarih", kind: "date" },
      ],
      searchPlaceholder: "Tahsilat ara...",
    },
    "musteriler/risk-ve-vade": {
      title: "Risk ve Vade",
      description: "Müşteri risk limitleri.",
      endpoint: "/api/tenant/customers?view=risk&limit=250",
      columns: [
        { key: "code", label: "Müşteri Kodu" },
        { key: "name", label: "Müşteri" },
        { key: "riskLimit", label: "Risk Limiti", kind: "amount" },
        { key: "maturityDays", label: "Vade Günü" },
      ],
      searchPlaceholder: "Müşteri ara...",
    },
    "tedarikciler/borc-takibi": {
      title: "Tedarikçi Borç Takibi",
      description: "Tedarikçi bakiyeleri.",
      endpoint: "/api/tenant/suppliers?view=balance&limit=250",
      columns: [
        { key: "code", label: "Tedarikçi Kodu" },
        { key: "name", label: "Tedarikçi" },
        { key: "balance", label: "Bakiye", kind: "amount" },
      ],
      searchPlaceholder: "Tedarikçi ara...",
    },
    "tedarikciler/odeme-gecmisi": {
      title: "Tedarikçi Ödeme Geçmişi",
      description: "Ödeme hareketleri.",
      endpoint: "/api/tenant/finance/payments?limit=250",
      columns: [
        { key: "code", label: "Fiş No" },
        { key: "supplierCode", label: "Tedarikçi" },
        { key: "amount", label: "Tutar", kind: "amount" },
        { key: "occurredAt", label: "Tarih", kind: "date" },
      ],
      searchPlaceholder: "Ödeme ara...",
    },
    "tedarikciler/vade-raporu": {
      title: "Tedarikçi Vade Raporu",
      description: "Vade ve risk kayıtları.",
      endpoint: "/api/tenant/suppliers?view=risk&limit=250",
      columns: [
        { key: "code", label: "Tedarikçi Kodu" },
        { key: "name", label: "Tedarikçi" },
        { key: "riskLimit", label: "Risk Limiti", kind: "amount" },
        { key: "maturityDays", label: "Vade Günü" },
      ],
      searchPlaceholder: "Tedarikçi ara...",
    },
    "fatura/satis-faturalari": {
      title: "Satış Faturaları",
      description: "Satış fatura listesi.",
      endpoint: "/api/tenant/invoices?type=satis&limit=250",
      columns: [
        { key: "code", label: "Belge No" },
        { key: "customerCode", label: "Müşteri" },
        { key: "netTotal", label: "Net Tutar", kind: "amount" },
        { key: "status", label: "Durum", kind: "status" },
      ],
      searchPlaceholder: "Fatura ara...",
    },
    "fatura/alis-faturalari": {
      title: "Alış Faturaları",
      description: "Alış fatura listesi.",
      endpoint: "/api/tenant/purchases/invoices?limit=250",
      columns: [
        { key: "code", label: "Belge No" },
        { key: "supplierCode", label: "Tedarikçi" },
        { key: "netTotal", label: "Net Tutar", kind: "amount" },
        { key: "status", label: "Durum", kind: "status" },
      ],
      searchPlaceholder: "Fatura ara...",
    },
    "fatura/irsaliye": {
      title: "İrsaliye",
      description: "İrsaliye/Belge kayıtları.",
      endpoint: "/api/tenant/invoices?limit=250",
      columns: [
        { key: "code", label: "Belge No" },
        { key: "invoiceType", label: "Belge Tipi" },
        { key: "status", label: "Durum", kind: "status" },
      ],
      searchPlaceholder: "Belge ara...",
    },
    "fatura/belge-numara-serileri": {
      title: "Belge Numaraları",
      description: "Belge no serileri yönetimi için temel liste.",
      endpoint: "/api/tenant/invoices?limit=250",
      columns: [
        { key: "code", label: "Belge No" },
        { key: "invoiceType", label: "Belge Tipi" },
      ],
      searchPlaceholder: "Belge ara...",
    },
    "kasa/kasa-hareketleri": {
      title: "Kasa Hareketleri",
      description: "Kasalar arası transfer kayıtları.",
      endpoint: "/api/tenant/finance/cash-transfers?limit=250",
      columns: [
        { key: "code", label: "Fiş No" },
        { key: "fromCashCode", label: "Çıkan Kasa" },
        { key: "toCashCode", label: "Giren Kasa" },
        { key: "amount", label: "Tutar", kind: "amount" },
      ],
      searchPlaceholder: "Hareket ara...",
    },
    "kasa/banka-hareketleri": {
      title: "Banka Hareketleri",
      description: "Ödeme kayıtlarından banka odaklı görünüm.",
      endpoint: "/api/tenant/finance/payments?limit=250",
      columns: [
        { key: "code", label: "Fiş No" },
        { key: "supplierCode", label: "Tedarikçi" },
        { key: "amount", label: "Tutar", kind: "amount" },
        { key: "method", label: "Yöntem" },
      ],
      searchPlaceholder: "Banka hareketi ara...",
    },
    "odeme/webhook-loglari": {
      title: "Webhook Logları",
      description: "Ödeme callback logları.",
      endpoint: "/api/tenant/payment/webhook-logs?limit=250",
      columns: [
        { key: "code", label: "Referans" },
        { key: "name", label: "Sağlayıcı" },
        { key: "status", label: "Durum", kind: "status" },
        { key: "occurredAt", label: "Tarih", kind: "date" },
      ],
      searchPlaceholder: "Log ara...",
    },
    "odeme/iade-islemleri": {
      title: "Ödeme İade İşlemleri",
      description: "İade kayıtları.",
      endpoint: "/api/tenant/payment/refunds?limit=250",
      columns: [
        { key: "code", label: "Referans" },
        { key: "amount", label: "Tutar", kind: "amount" },
        { key: "status", label: "Durum", kind: "status" },
        { key: "occurredAt", label: "Tarih", kind: "date" },
      ],
      searchPlaceholder: "İade ara...",
    },
    "e-fatura/e-fatura-belgeleri": {
      title: "e-Fatura Belgeleri",
      description: "e-Belge listesi.",
      endpoint: "/api/tenant/einvoice/documents?limit=250",
      columns: [
        { key: "code", label: "Belge No" },
        { key: "scenario", label: "Senaryo" },
        { key: "total", label: "Tutar", kind: "amount" },
        { key: "status", label: "Durum", kind: "status" },
      ],
      searchPlaceholder: "Belge ara...",
    },
    "e-fatura/e-arsiv-belgeleri": {
      title: "e-Arşiv Belgeleri",
      description: "Arşivlenmiş e-belgeler.",
      endpoint: "/api/tenant/einvoice/documents?status=archived&limit=250",
      columns: [
        { key: "code", label: "Belge No" },
        { key: "providerReference", label: "Provider Ref" },
        { key: "total", label: "Tutar", kind: "amount" },
        { key: "status", label: "Durum", kind: "status" },
      ],
      searchPlaceholder: "Belge ara...",
    },
    "e-fatura/durum-senkronizasyonu": {
      title: "Durum Senkronizasyonu",
      description: "Belge durum loglarının listesi.",
      endpoint: "/api/tenant/einvoice/documents?limit=250",
      columns: [
        { key: "code", label: "Belge No" },
        { key: "providerReference", label: "Provider Ref" },
        { key: "status", label: "Durum", kind: "status" },
        { key: "updatedAt", label: "Güncelleme", kind: "date" },
      ],
      searchPlaceholder: "Belge ara...",
    },
    "e-fatura/gib-alias-kontrolu": {
      title: "GİB Alias Kontrol Kayıtları",
      description: "Belge listesi üzerinde alias kontrol referansı.",
      endpoint: "/api/tenant/einvoice/documents?limit=250",
      columns: [
        { key: "code", label: "Belge No" },
        { key: "receiverTaxId", label: "VKN/TCKN" },
        { key: "providerReference", label: "Alias/Ref" },
      ],
      searchPlaceholder: "Belge veya vergi no ara...",
    },
    "kullanicilar/aktivite-gecmisi": {
      title: "Kullanıcı Aktivite Geçmişi",
      description: "RBAC modül işlem kayıtları.",
      endpoint: "/api/tenant/audit/logs?module=rbac&limit=250",
      columns: [
        { key: "action", label: "İşlem" },
        { key: "entityName", label: "Varlık" },
        { key: "userId", label: "Kullanıcı" },
        { key: "createdAt", label: "Tarih", kind: "date" },
      ],
      searchPlaceholder: "Aktivite ara...",
    },
    "islem-gecmisi/iptal-kayitlari": {
      title: "İptal Kayıtları",
      description: "POS işlem kayıtları.",
      endpoint: "/api/tenant/audit/logs?module=pos&limit=250",
      columns: [
        { key: "action", label: "İşlem" },
        { key: "entityName", label: "Varlık" },
        { key: "userId", label: "Kullanıcı" },
        { key: "createdAt", label: "Tarih", kind: "date" },
      ],
      searchPlaceholder: "İptal kaydı ara...",
    },
    "islem-gecmisi/export-olaylari": {
      title: "Export Olayları",
      description: "Rapor dışa aktarım kayıtları.",
      endpoint: "/api/tenant/audit/logs?module=report&limit=250",
      columns: [
        { key: "action", label: "İşlem" },
        { key: "entityName", label: "Varlık" },
        { key: "userId", label: "Kullanıcı" },
        { key: "createdAt", label: "Tarih", kind: "date" },
      ],
      searchPlaceholder: "Export kaydı ara...",
    },
    "islem-gecmisi/ayar-degisiklikleri": {
      title: "Ayar Değişiklikleri",
      description: "Firma, POS ve entegrasyon ayar güncelleme kayıtları.",
      endpoint: "/api/tenant/audit/logs?module=settings&limit=250",
      columns: [
        { key: "action", label: "İşlem" },
        { key: "entityId", label: "Kapsam" },
        { key: "changedKeysText", label: "Değişen Alanlar" },
        { key: "ipAddress", label: "IP" },
        { key: "userId", label: "Kullanıcı" },
        { key: "createdAt", label: "Tarih", kind: "date" },
      ],
      searchPlaceholder: "Ayar kaydı ara...",
      transformRows: (rows) =>
        rows.map((row) => {
          const changedKeys = Array.isArray(row.changedKeys)
            ? row.changedKeys.filter((value): value is string => typeof value === "string")
            : [];

          return {
            ...row,
            changedKeysText: changedKeys.length > 0 ? changedKeys.join(", ") : "-",
          };
        }),
    },
    "islem-gecmisi/guvenlik-olaylari": {
      title: "Güvenlik Olayları",
      description: "Webhook logları üzerinden güvenlik görünümü.",
      endpoint: "/api/tenant/payment/webhook-logs?limit=250",
      columns: [
        { key: "name", label: "Kaynak" },
        { key: "status", label: "Durum", kind: "status" },
        { key: "occurredAt", label: "Tarih", kind: "date" },
      ],
      searchPlaceholder: "Güvenlik olayı ara...",
    },
  };

  const tableFeature = tableMap[key];
  if (tableFeature) {
    return <FeatureTable {...tableFeature} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Özellik Ekranı Hazırlanıyor</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">Bu alt menü için ekran eşlemesi bulunamadı.</p>
      </CardContent>
    </Card>
  );
}

export function FeatureWorkspaceClient({ moduleSegment, featureSegment }: FeatureWorkspaceClientProps) {
  return <div className="space-y-4">{resolveFeature(moduleSegment, featureSegment)}</div>;
}
