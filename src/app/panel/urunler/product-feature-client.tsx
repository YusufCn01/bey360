"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmModal, type ConfirmModalTone } from "@/components/ui/confirm-modal";
import { LabelDesignListFeature, LabelDesignerFeature } from "@/app/panel/urunler/label-designer-feature";

type ProductRecord = {
  id: string;
  code: string | null;
  name: string | null;
  payload?: Record<string, unknown>;
};

type ProductView = {
  id: string;
  code: string;
  name: string;
  barcode: string;
  description: string;
  imageUrl: string;
  unit: string;
  salePrice: number;
  purchasePrice: number;
  vatRate: number;
  minStockLevel: number;
  maxStockLevel: number;
  discountRate: number;
  productGroup: string;
  productSubGroup: string;
  lockedForSale: boolean;
};

type ProductFeatureClientProps = {
  feature: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message ?? "İşlem başarısız.");
  }
  return body.data as T;
}

function mapProduct(row: ProductRecord): ProductView {
  const payload = asRecord(row.payload);
  return {
    id: row.id,
    code: row.code ?? "",
    name: row.name ?? "",
    barcode: asText(payload.barcode),
    description: asText(payload.description),
    imageUrl: asText(payload.imageUrl),
    unit: asText(payload.defaultUnit, "ADET"),
    salePrice: asNumber(payload.salePrice, 0),
    purchasePrice: asNumber(payload.purchasePrice, 0),
    vatRate: asNumber(payload.vatRate, 20),
    minStockLevel: asNumber(payload.minStockLevel, 0),
    maxStockLevel: asNumber(payload.maxStockLevel, 0),
    discountRate: asNumber(payload.discountRate, 0),
    productGroup: asText(payload.productGroup, "Grupsuz"),
    productSubGroup: asText(payload.productSubGroup, "Grupsuz"),
    lockedForSale: asBool(payload.lockedForSale, false),
  };
}

function Notice({ error, message }: { error: string | null; message: string | null }) {
  return (
    <>
      {message ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
      ) : null}
      {error ? <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </>
  );
}

function useProducts(limit = 500) {
  const [products, setProducts] = React.useState<ProductView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await requestJson<ProductRecord[]>(`/api/tenant/products?limit=${limit}`);
      setProducts((rows ?? []).map(mapProduct));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Ürünler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return { products, loading, error, reload: load };
}

function ProductPicker({
  products,
  selectedIds,
  setSelectedIds,
}: {
  products: ProductView[];
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function selectAll() {
    setSelectedIds((prev) => (prev.length === products.length ? [] : products.map((item) => item.id)));
  }

  return (
    <div className="space-y-2 rounded-md border border-[color:var(--mx-border)] p-3">
      <label className="inline-flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={products.length > 0 && selectedIds.length === products.length}
          onChange={selectAll}
        />
        Tümünü seç ({products.length})
      </label>
      <div className="grid max-h-72 gap-2 overflow-auto md:grid-cols-2">
        {products.map((item) => (
          <label key={item.id} className="inline-flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-2 py-1 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={selectedIds.includes(item.id)} onChange={() => toggle(item.id)} />
            {item.code} - {item.name}
          </label>
        ))}
      </div>
    </div>
  );
}

async function loadScope(scope: string) {
  const result = await requestJson<{ payload?: Record<string, unknown> }>(
    `/api/tenant/settings?scope=${encodeURIComponent(scope)}`,
  );
  return asRecord(result.payload);
}

async function saveScope(scope: string, payload: Record<string, unknown>) {
  await requestJson("/api/tenant/settings", {
    method: "POST",
    body: JSON.stringify({ scope, payload }),
  });
}

function ScopeEditor({
  title,
  description,
  scope,
  defaultPayload,
}: {
  title: string;
  description: string;
  scope: string;
  defaultPayload: Record<string, unknown>;
}) {
  const [text, setText] = React.useState("{}");
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const payload = await loadScope(scope);
      const value = Object.keys(payload).length === 0 ? defaultPayload : payload;
      setText(JSON.stringify(value, null, 2));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Ayar verisi okunamadı.");
    }
  }, [defaultPayload, scope]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload = JSON.parse(text) as Record<string, unknown>;
      await saveScope(scope, payload);
      setMessage("Kayıt tamamlandı.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Kaydetme başarısız.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-[color:var(--mx-text-muted)]">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea value={text} onChange={(event) => setText(event.target.value)} className="h-80 w-full rounded-md border border-[color:var(--mx-border)] p-2 font-mono text-xs" spellCheck={false} />
        <Notice error={error} message={message} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => void load()} disabled={busy}>
            Yenile
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ExistingProductCardFeature() {
  const { products, loading, error: loadError, reload } = useProducts();
  const [selectedId, setSelectedId] = React.useState("");
  const [form, setForm] = React.useState<ProductView | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedId) {
      setForm(null);
      return;
    }
    const selected = products.find((item) => item.id === selectedId) ?? null;
    setForm(selected ? { ...selected } : null);
  }, [selectedId, products]);

  function patch<K extends keyof ProductView>(key: K, value: ProductView[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!form) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await requestJson(`/api/tenant/products/${form.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          barcode: form.barcode,
          description: form.description,
          imageUrl: form.imageUrl,
          defaultUnit: form.unit,
          salePrice: form.salePrice,
          purchasePrice: form.purchasePrice,
          vatRate: form.vatRate,
          minStockLevel: form.minStockLevel,
          maxStockLevel: form.maxStockLevel,
          productGroup: form.productGroup,
          productSubGroup: form.productSubGroup,
          discountRate: form.discountRate,
          lockedForSale: form.lockedForSale,
        }),
      });
      setMessage("Ürün kartı güncellendi.");
      await reload();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Güncelleme başarısız.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mevcut Ürün Kartı</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
          <option value="">Ürün seçin...</option>
          {products.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} - {item.name}
            </option>
          ))}
        </select>
        {loading ? <p className="text-sm text-[color:var(--mx-text-muted)]">Ürünler yükleniyor...</p> : null}
        {loadError ? <p className="text-sm text-rose-700">{loadError}</p> : null}
        {form ? (
          <div className="grid gap-2 md:grid-cols-2">
            <input value={form.code} onChange={(event) => patch("code", event.target.value)} placeholder="Kod" />
            <input value={form.name} onChange={(event) => patch("name", event.target.value)} placeholder="Ad" />
            <input value={form.barcode} onChange={(event) => patch("barcode", event.target.value)} placeholder="Barkod" />
            <input value={form.description} onChange={(event) => patch("description", event.target.value)} placeholder="Açıklama" />
            <input type="number" step="0.01" value={form.salePrice} onChange={(event) => patch("salePrice", asNumber(event.target.value))} placeholder="Satış Fiyatı" />
            <input type="number" step="0.01" value={form.purchasePrice} onChange={(event) => patch("purchasePrice", asNumber(event.target.value))} placeholder="Alış Fiyatı" />
            <input type="number" value={form.vatRate} onChange={(event) => patch("vatRate", asNumber(event.target.value))} placeholder="KDV" />
            <input value={form.unit} onChange={(event) => patch("unit", event.target.value)} placeholder="Ölçü Birimi" />
            <input value={form.productGroup} onChange={(event) => patch("productGroup", event.target.value)} placeholder="Ürün Grubu" />
            <input value={form.productSubGroup} onChange={(event) => patch("productSubGroup", event.target.value)} placeholder="Ürün Alt Grubu" />
            <input type="number" value={form.minStockLevel} onChange={(event) => patch("minStockLevel", asNumber(event.target.value))} placeholder="Min Stok" />
            <input type="number" value={form.maxStockLevel} onChange={(event) => patch("maxStockLevel", asNumber(event.target.value))} placeholder="Max Stok" />
            <input type="number" value={form.discountRate} onChange={(event) => patch("discountRate", asNumber(event.target.value))} placeholder="İndirim %" />
            <label className="inline-flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="h-4 w-4" checked={form.lockedForSale} onChange={(event) => patch("lockedForSale", event.target.checked)} />
              Satışa kapalı
            </label>
            <div className="md:col-span-2">
              <input value={form.imageUrl} onChange={(event) => patch("imageUrl", event.target.value)} placeholder="Görsel URL" />
            </div>
          </div>
        ) : null}
        <Notice error={error} message={message} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => void reload()} disabled={busy}>
            Yenile
          </Button>
          <Button onClick={() => void save()} disabled={busy || !form}>
            {busy ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BulkProductEditFeature() {
  const { products, loading, error: loadError } = useProducts();
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [defaultUnit, setDefaultUnit] = React.useState("");
  const [vatRate, setVatRate] = React.useState("");
  const [productGroup, setProductGroup] = React.useState("");
  const [productSubGroup, setProductSubGroup] = React.useState("");
  const [lockedForSale, setLockedForSale] = React.useState<"none" | "true" | "false">("none");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  async function apply() {
    if (selectedIds.length === 0) {
      setError("En az bir ürün seçmelisiniz.");
      return;
    }
    const payload: Record<string, unknown> = { productIds: selectedIds };
    if (defaultUnit.trim()) payload.defaultUnit = defaultUnit;
    if (vatRate.trim()) payload.vatRate = asNumber(vatRate);
    if (productGroup.trim()) payload.productGroup = productGroup;
    if (productSubGroup.trim()) payload.productSubGroup = productSubGroup;
    if (lockedForSale !== "none") payload.lockedForSale = lockedForSale === "true";

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await requestJson<{ updatedCount: number }>("/api/tenant/products/bulk-update", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMessage(`${result.updatedCount} ürün güncellendi.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Toplu düzenleme başarısız.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Toplu Ürün Düzenle</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <p className="text-sm text-[color:var(--mx-text-muted)]">Ürünler yükleniyor...</p> : null}
        {loadError ? <p className="text-sm text-rose-700">{loadError}</p> : null}
        {!loading ? <ProductPicker products={products} selectedIds={selectedIds} setSelectedIds={setSelectedIds} /> : null}
        <div className="grid gap-2 md:grid-cols-2">
          <input value={defaultUnit} onChange={(event) => setDefaultUnit(event.target.value)} placeholder="Ölçü birimi (opsiyonel)" />
          <input value={vatRate} onChange={(event) => setVatRate(event.target.value)} placeholder="KDV (opsiyonel)" />
          <input value={productGroup} onChange={(event) => setProductGroup(event.target.value)} placeholder="Ürün grubu (opsiyonel)" />
          <input value={productSubGroup} onChange={(event) => setProductSubGroup(event.target.value)} placeholder="Ürün alt grubu (opsiyonel)" />
          <select value={lockedForSale} onChange={(event) => setLockedForSale(event.target.value as "none" | "true" | "false")} className="md:col-span-2">
            <option value="none">Satış kilidi değişmesin</option>
            <option value="true">Satışa kapat</option>
            <option value="false">Satışa aç</option>
          </select>
        </div>
        <Notice error={error} message={message} />
        <div className="flex justify-end">
          <Button onClick={() => void apply()} disabled={busy}>
            {busy ? "Uygulanıyor..." : "Toplu Uygula"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function buildCsv(products: ProductView[]) {
  const headers = [
    "code",
    "name",
    "barcode",
    "salePrice",
    "purchasePrice",
    "vatRate",
    "defaultUnit",
    "productGroup",
    "productSubGroup",
    "minStockLevel",
    "maxStockLevel",
    "discountRate",
    "lockedForSale",
    "imageUrl",
    "description",
  ];
  const lines = [headers.join(";")];
  for (const item of products) {
    const row = [
      item.code,
      item.name,
      item.barcode,
      item.salePrice,
      item.purchasePrice,
      item.vatRate,
      item.unit,
      item.productGroup,
      item.productSubGroup,
      item.minStockLevel,
      item.maxStockLevel,
      item.discountRate,
      item.lockedForSale,
      item.imageUrl,
      item.description,
    ].map((value) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`);
    lines.push(row.join(";"));
  }
  return lines.join("\n");
}

function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return [] as Record<string, string>[];
  }
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delimiter).map((part) => part.replaceAll("\"", "").trim());
  return lines.slice(1).map((line) => {
    const parts = line.split(delimiter).map((part) => part.replace(/^"|"$/g, "").replaceAll("\"\"", "\"").trim());
    const row: Record<string, string> = {};
    headers.forEach((key, index) => {
      row[key] = parts[index] ?? "";
    });
    return row;
  });
}

function normalizeImportRow(raw: Record<string, unknown>) {
  const aliases: Record<string, string> = {
    kod: "code",
    urun_kodu: "code",
    ad: "name",
    urun_adi: "name",
    barkod: "barcode",
    aciklama: "description",
    satisfiyati: "salePrice",
    satis_fiyat: "salePrice",
    alisfiyati: "purchasePrice",
    alis_fiyat: "purchasePrice",
    kdv: "vatRate",
    olcu: "defaultUnit",
    birim: "defaultUnit",
    urun_grubu: "productGroup",
    urun_alt_grubu: "productSubGroup",
    gorsel: "imageUrl",
    image: "imageUrl",
    imageurl: "imageUrl",
    baslangic_stok: "openingStock",
    min_stok: "minStockLevel",
    max_stok: "maxStockLevel",
  };

  const row: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const normalizedKey = key
      .trim()
      .toLocaleLowerCase("tr")
      .replaceAll("ç", "c")
      .replaceAll("ğ", "g")
      .replaceAll("ı", "i")
      .replaceAll("ö", "o")
      .replaceAll("ş", "s")
      .replaceAll("ü", "u")
      .replaceAll(" ", "_");
    const canonical = aliases[normalizedKey] ?? key;
    row[canonical] = String(value ?? "").trim();
  }
  return row;
}

function ExcelExportFeature() {
  const { products, loading, error, reload } = useProducts();
  const [message, setMessage] = React.useState<string | null>(null);

  async function exportCsv() {
    const csv = buildCsv(products);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `urunler-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(href);
    setMessage(`${products.length} kayıt dışarı aktarıldı.`);
    try {
      await requestJson("/api/tenant/products/export-log", {
        method: "POST",
        body: JSON.stringify({ format: "csv", rowCount: products.length }),
      });
    } catch {
      // log atılamasa da dışa aktarma tamamlanır
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Excel Dışarı Aktar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <p className="text-sm text-[color:var(--mx-text-muted)]">Ürünler yükleniyor...</p> : null}
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <p className="text-sm text-[color:var(--mx-text-muted)]">Toplam kayıt: {products.length}</p>
        <Notice error={null} message={message} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => void reload()}>
            Yenile
          </Button>
          <Button onClick={() => void exportCsv()} disabled={products.length === 0}>
            CSV Dışa Aktar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ExcelImportFeature() {
  const [rows, setRows] = React.useState<Record<string, string>[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const lowerName = file.name.toLocaleLowerCase("tr");
    let parsed: Record<string, string>[] = [];

    if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
      parsed = rawRows.map(normalizeImportRow);
    } else {
      const text = await file.text();
      parsed = parseCsv(text).map((row) => normalizeImportRow(row));
    }

    setRows(parsed);
    setMessage(`${parsed.length} satır hazırlandı.`);
    setError(null);
  }

  async function importRows() {
    if (rows.length === 0) {
      setError("Önce CSV dosyası seçmelisiniz.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payloadRows = rows.map((row) => ({
        code: row.code || undefined,
        name: row.name,
        barcode: row.barcode || undefined,
        description: row.description || undefined,
        salePrice: asNumber(row.salePrice, 0),
        purchasePrice: asNumber(row.purchasePrice, 0),
        vatRate: asNumber(row.vatRate, 20),
        defaultUnit: row.defaultUnit || "ADET",
        productGroup: row.productGroup || undefined,
        productSubGroup: row.productSubGroup || undefined,
        imageUrl: row.imageUrl || undefined,
        openingStock: asNumber(row.openingStock, 0),
        minStockLevel: asNumber(row.minStockLevel, 0),
        maxStockLevel: asNumber(row.maxStockLevel, 0),
      }));

      const result = await requestJson<{
        totalRows: number;
        createdCount: number;
        failedCount: number;
        errors: Array<{ rowIndex: number; message: string }>;
      }>("/api/tenant/products/import", {
        method: "POST",
        body: JSON.stringify({ rows: payloadRows }),
      });

      setMessage(`Aktarım tamamlandı. Oluşturulan: ${result.createdCount}, Hatalı: ${result.failedCount}`);
      if (result.failedCount > 0 && result.errors[0]) {
        setError(`İlk hata satırı ${result.errors[0].rowIndex}: ${result.errors[0].message}`);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "İçe aktarma başarısız.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Excel İçeri Aktar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-[color:var(--mx-text-muted)]">
          CSV veya XLSX dosyası yükleyebilirsiniz. Beklenen kolonlar: code,name,barcode,salePrice,purchasePrice,vatRate,defaultUnit,productGroup,productSubGroup,imageUrl,openingStock,minStockLevel,maxStockLevel
        </p>
        <input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onFile} />
        {rows.length > 0 ? <p className="text-sm text-[color:var(--mx-text-muted)]">Hazır satır: {rows.length}</p> : null}
        <Notice error={error} message={message} />
        <div className="flex justify-end">
          <Button onClick={() => void importRows()} disabled={busy || rows.length === 0}>
            {busy ? "Aktarılıyor..." : "İçeri Aktar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ExcelTransferLogFeature() {
  const [rows, setRows] = React.useState<Array<{ id: string; action: string; createdAt: string; payload?: Record<string, unknown> }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const all = await requestJson<Array<{ id: string; action: string; createdAt: string; payload?: Record<string, unknown> }>>(
          "/api/tenant/audit/logs?module=product&limit=250",
        );
        setRows((all ?? []).filter((item) => item.action.includes("excel")));
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Loglar yüklenemedi.");
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Excel Aktarım Log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <p className="text-sm text-[color:var(--mx-text-muted)]">Loglar yükleniyor...</p> : null}
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        {!loading ? (
          <div className="overflow-auto rounded-md border border-[color:var(--mx-border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[color:var(--mx-surface-soft)]">
                <tr>
                  <th className="px-2 py-2 text-left">İşlem</th>
                  <th className="px-2 py-2 text-left">Detay</th>
                  <th className="px-2 py-2 text-left">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-2 py-8 text-center text-[color:var(--mx-text-muted)]">
                      Excel aktarım kaydı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-[color:var(--mx-border)]">
                      <td className="px-2 py-2">{row.action}</td>
                      <td className="px-2 py-2">{JSON.stringify(row.payload ?? {})}</td>
                      <td className="px-2 py-2">{new Date(row.createdAt).toLocaleString("tr-TR")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function BulkPriceAdjustFeature() {
  const { products, loading, error: loadError } = useProducts();
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [operation, setOperation] = React.useState<"increase_percent" | "decrease_percent" | "set_price">("increase_percent");
  const [value, setValue] = React.useState("10");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  async function apply() {
    if (selectedIds.length === 0) {
      setError("En az bir ürün seçmelisiniz.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await requestJson<{ updatedCount: number }>("/api/tenant/products/prices", {
        method: "POST",
        body: JSON.stringify({
          productIds: selectedIds,
          operation,
          value: asNumber(value, 0),
        }),
      });
      setMessage(`${result.updatedCount} ürün için zam/indirim uygulandı.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Toplu zam/indirim başarısız.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Toplu Zam / İndirim</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <p className="text-sm text-[color:var(--mx-text-muted)]">Ürünler yükleniyor...</p> : null}
        {loadError ? <p className="text-sm text-rose-700">{loadError}</p> : null}
        {!loading ? <ProductPicker products={products} selectedIds={selectedIds} setSelectedIds={setSelectedIds} /> : null}
        <div className="grid gap-2 md:grid-cols-3">
          <select value={operation} onChange={(event) => setOperation(event.target.value as "increase_percent" | "decrease_percent" | "set_price")}>
            <option value="increase_percent">Yüzde Zam</option>
            <option value="decrease_percent">Yüzde İndirim</option>
            <option value="set_price">Sabit Fiyat</option>
          </select>
          <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Değer" />
          <Button onClick={() => void apply()} disabled={busy}>
            {busy ? "Uygulanıyor..." : "Uygula"}
          </Button>
        </div>
        <Notice error={error} message={message} />
      </CardContent>
    </Card>
  );
}

function TopluEtiketYazdirFeature() {
  const { products, loading, error } = useProducts();
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [fontSize, setFontSize] = React.useState("12");
  const [printError, setPrintError] = React.useState<string | null>(null);

  function print() {
    const selected = products.filter((item) => selectedIds.includes(item.id));
    if (selected.length === 0) {
      setPrintError("Yazdırmak için ürün seçmelisiniz.");
      return;
    }
    const size = asNumber(fontSize, 12);
    const html = `
      <html><head><title>Etiket Yazdır</title></head>
      <body>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(58mm,1fr));gap:6px;">
          ${selected
            .map(
              (item) => `
            <div style="border:1px solid #999;padding:4px;height:40mm;display:flex;flex-direction:column;justify-content:space-between;">
              <div style="font-size:${size}px;font-weight:700;">${item.name}</div>
              <div style="font-size:${Math.max(size - 1, 9)}px;">${item.barcode || item.code}</div>
              <div style="font-size:${size + 1}px;font-weight:700;">${item.salePrice.toFixed(2)} â‚º</div>
            </div>`,
            )
            .join("")}
        </div>
        <script>window.onload=()=>window.print()</script>
      </body></html>`;
    const win = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
    if (!win) {
      setPrintError("Yazdırma penceresi açılamadı.");
      return;
    }
    win.document.write(html);
    win.document.close();
    setPrintError(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Toplu Etiket Yazdır</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <p className="text-sm text-[color:var(--mx-text-muted)]">Ürünler yükleniyor...</p> : null}
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <input value={fontSize} onChange={(event) => setFontSize(event.target.value)} placeholder="Font boyutu" />
        {!loading ? <ProductPicker products={products} selectedIds={selectedIds} setSelectedIds={setSelectedIds} /> : null}
        {printError ? <p className="text-sm text-rose-700">{printError}</p> : null}
        <div className="flex justify-end">
          <Button onClick={print}>Yazdır</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SeriSayimFeature() {
  type SerialCountRow = {
    key: string;
    productId: string;
    productCode: string;
    productName: string;
    barcode: string;
    warehouseId: string;
    available: number;
    counted: number;
    scanned: boolean;
  };

  type SerialCountSession = {
    id: string;
    startedAt: string;
    startedBy: string;
    rows: SerialCountRow[];
  };

  type SerialCountSummary = {
    total: number;
    notCounted: number;
    exact: number;
    missing: number;
    extra: number;
  };

  type SerialCountResponse = {
    active: boolean;
    session: SerialCountSession | null;
    summary: SerialCountSummary | null;
    message?: string;
  };

  type SerialConfirmState =
    | { open: false }
    | {
        open: true;
        action: "finish" | "cancel" | "resetRow";
        rowKey?: string;
        rowLabel?: string;
      };

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [barcode, setBarcode] = React.useState("");
  const [active, setActive] = React.useState(false);
  const [session, setSession] = React.useState<SerialCountSession | null>(null);
  const [summary, setSummary] = React.useState<SerialCountSummary | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [confirmState, setConfirmState] = React.useState<SerialConfirmState>({ open: false });

  const syncState = React.useCallback((result: SerialCountResponse) => {
    setActive(Boolean(result.active));
    setSession(result.session ?? null);
    setSummary(result.summary ?? null);
    if (typeof result.message === "string" && result.message.length > 0) {
      setMessage(result.message);
    }
  }, []);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestJson<SerialCountResponse>("/api/tenant/inventory/stock-count");
      syncState(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Seri sayım bilgisi alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [syncState]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runAction(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await requestJson<SerialCountResponse>("/api/tenant/inventory/stock-count", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      syncState(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Seri sayım işlemi başarısız.");
    } finally {
      setBusy(false);
    }
  }

  function rowState(row: SerialCountRow): "notCounted" | "exact" | "missing" | "extra" {
    if (!row.scanned) {
      return "notCounted";
    }
    if (row.counted === row.available) {
      return "exact";
    }
    if (row.counted < row.available) {
      return "missing";
    }
    return "extra";
  }

  const stateClass: Record<ReturnType<typeof rowState>, string> = {
    notCounted: "bg-slate-100",
    exact: "bg-emerald-50",
    missing: "bg-rose-50",
    extra: "bg-amber-50",
  };

  async function scanBarcode() {
    const value = barcode.trim();
    if (!value) {
      setError("Barkod alanı boş olamaz.");
      return;
    }

    await runAction({ action: "scan", barcode: value });
    setBarcode("");
  }

  const rows = session?.rows ?? [];
  const confirmContent = React.useMemo(() => {
    if (!confirmState.open) {
      return null;
    }

    if (confirmState.action === "finish") {
      return {
        title: "Sayımı Bitir",
        description: "Mevcut sayım stok hareketlerine işlenecek. İşlem onaylansın mı?",
        confirmLabel: "Bitir",
        cancelLabel: "Vazgeç",
        tone: "info" as ConfirmModalTone,
      };
    }

    if (confirmState.action === "cancel") {
      return {
        title: "Sayım İptal",
        description: "Aktif sayım sıfırlanacak. Bu işlem geri alınamaz.",
        confirmLabel: "İptal Et",
        cancelLabel: "Vazgeç",
        tone: "danger" as ConfirmModalTone,
      };
    }

    return {
      title: "Satır Sayımını Sıfırla",
      description: `${confirmState.rowLabel || "Seçili ürün"} için sayım miktarı sıfırlansın mı?`,
      confirmLabel: "Sıfırla",
      cancelLabel: "Vazgeç",
      tone: "danger" as ConfirmModalTone,
    };
  }, [confirmState]);

  async function executeConfirmedAction() {
    if (!confirmState.open) {
      return;
    }

    const action = confirmState;
    setConfirmState({ open: false });

    if (action.action === "finish") {
      await runAction({ action: "finish" });
      return;
    }
    if (action.action === "cancel") {
      await runAction({ action: "cancel" });
      return;
    }

    if (action.rowKey) {
      await runAction({ action: "resetRow", rowKey: action.rowKey });
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Seri Sayım Modülü</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
        <div className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3 text-sm leading-6">
          <p className="font-semibold">Kullanım Özeti</p>
          <p>Barkodu okutun, her okutma ilgili ürünün sayım miktarını 1 artırır.</p>
          <p>Gri = Sayılmadı, Yeşil = Doğru, Kırmızı = Eksik, Sarı = Fazla.</p>
          <p>Sayım aktifken satış, satış iade, ürün girişi ve ürün çıkışı işlemleri geçici olarak durdurulur.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!active ? (
            <Button onClick={() => void runAction({ action: "start" })} disabled={busy || loading}>
              Sayımı Başlat
            </Button>
          ) : (
            <>
              <Button onClick={() => setConfirmState({ open: true, action: "finish" })} disabled={busy}>
                Sayımı Bitir
              </Button>
              <Button variant="danger" onClick={() => setConfirmState({ open: true, action: "cancel" })} disabled={busy}>
                Sayım İptal
              </Button>
            </>
          )}

          <Button variant="secondary" onClick={() => void refresh()} disabled={busy || loading}>
            Yenile
          </Button>
        </div>

        {active ? (
          <div className="grid gap-2 rounded-md border border-[color:var(--mx-border)] p-3 md:grid-cols-[1fr_auto]">
            <input
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              placeholder="Barkod okut / yaz"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void scanBarcode();
                }
              }}
            />
            <Button onClick={() => void scanBarcode()} disabled={busy}>
              Okut
            </Button>
          </div>
        ) : null}

        {summary ? (
          <div className="grid gap-2 text-sm md:grid-cols-5">
            <div className="rounded-md border border-[color:var(--mx-border)] px-3 py-2">Toplam: {summary.total}</div>
            <div className="rounded-md border border-[color:var(--mx-border)] px-3 py-2">Sayılmadı: {summary.notCounted}</div>
            <div className="rounded-md border border-[color:var(--mx-border)] px-3 py-2">Doğru: {summary.exact}</div>
            <div className="rounded-md border border-[color:var(--mx-border)] px-3 py-2">Eksik: {summary.missing}</div>
            <div className="rounded-md border border-[color:var(--mx-border)] px-3 py-2">Fazla: {summary.extra}</div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-md bg-slate-200 px-2 py-1 text-slate-700">Gri: Sayılmadı</span>
          <span className="rounded-md bg-emerald-200 px-2 py-1 text-emerald-800">Yeşil: Doğru</span>
          <span className="rounded-md bg-rose-200 px-2 py-1 text-rose-800">Kırmızı: Eksik</span>
          <span className="rounded-md bg-amber-200 px-2 py-1 text-amber-800">Sarı: Fazla</span>
        </div>

        <div className="overflow-auto rounded-md border border-[color:var(--mx-border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[color:var(--mx-surface-soft)]">
              <tr>
                <th className="px-2 py-2 text-left">Ürün</th>
                <th className="px-2 py-2 text-left">Barkod / Kod</th>
                <th className="px-2 py-2 text-left">Depo</th>
                <th className="px-2 py-2 text-left">Sistem</th>
                <th className="px-2 py-2 text-left">Sayılan</th>
                <th className="px-2 py-2 text-left">Fark</th>
                <th className="px-2 py-2 text-left">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-4 text-center text-[color:var(--mx-text-muted)]">
                    {loading ? "Seri sayım verisi yükleniyor..." : "Aktif sayım satırı bulunmuyor."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const diff = row.counted - row.available;
                  const state = rowState(row);
                  return (
                    <tr key={row.key} className={`border-t border-[color:var(--mx-border)] ${stateClass[state]}`}>
                      <td className="px-2 py-2">
                        <p className="font-semibold">{row.productName || row.productId}</p>
                        <p className="text-xs text-[color:var(--mx-text-muted)]">{row.productCode}</p>
                      </td>
                      <td className="px-2 py-2">{row.barcode || row.productCode || "-"}</td>
                      <td className="px-2 py-2">{row.warehouseId}</td>
                      <td className="px-2 py-2">{row.available.toFixed(2)}</td>
                      <td className="px-2 py-2 font-semibold">{row.counted.toFixed(2)}</td>
                      <td className={`px-2 py-2 font-semibold ${diff < 0 ? "text-rose-700" : diff > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                        {diff.toFixed(2)}
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() =>
                            setConfirmState({
                              open: true,
                              action: "resetRow",
                              rowKey: row.key,
                              rowLabel: row.productName || row.productCode || row.productId,
                            })
                          }
                          disabled={busy}
                        >
                          İptal
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

          <Notice error={error} message={message} />
        </CardContent>
      </Card>
      <ConfirmModal
        open={confirmState.open && Boolean(confirmContent)}
        title={confirmContent?.title ?? ""}
        description={confirmContent?.description ?? ""}
        confirmLabel={confirmContent?.confirmLabel ?? "Onayla"}
        cancelLabel={confirmContent?.cancelLabel ?? "Vazgeç"}
        tone={confirmContent?.tone ?? "info"}
        busy={busy}
        onCancel={() => setConfirmState({ open: false })}
        onConfirm={() => {
          void executeConfirmedAction();
        }}
      />
    </>
  );
}

export function ProductFeatureClient({ feature }: ProductFeatureClientProps) {
  if (feature === "mevcut-urun-karti") return <ExistingProductCardFeature />;
  if (feature === "toplu-urun-duzenle") return <BulkProductEditFeature />;
  if (feature === "excel-disari-aktar") return <ExcelExportFeature />;
  if (feature === "excel-iceri-aktar") return <ExcelImportFeature />;
  if (feature === "excel-aktarim-log") return <ExcelTransferLogFeature />;
  if (feature === "toplu-zam-indirim") return <BulkPriceAdjustFeature />;
  if (feature === "toplu-etiket-yazdir") return <TopluEtiketYazdirFeature />;
  if (feature === "seri-sayim-modulu") return <SeriSayimFeature />;

  if (feature === "urun-karti-basliklari") {
    return (
      <ScopeEditor
        title="Ürün Kartı Başlıkları"
        description="Özel başlıklar JSON olarak düzenlenir."
        scope="urun_karti_basliklari"
        defaultPayload={{ items: [{ key: "ozel_kod_5", label: "Özel Kod 5", enabled: true }] }}
      />
    );
  }

  if (feature === "urun-gruplari") {
    return (
      <ScopeEditor
        title="Ürün Grupları"
        description="Ürün grup ve alt grupları JSON olarak düzenlenir."
        scope="urun_gruplari"
        defaultPayload={{ groups: [{ name: "Gıda", subGroups: ["Atıştırmalık", "İçecek"] }] }}
      />
    );
  }

  if (feature === "yeni-etiket-dizayni") return <LabelDesignerFeature />;
  if (feature === "etiket-dizaynlari") return <LabelDesignListFeature />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ürün Özelliği Hazırlanıyor</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[color:var(--mx-text-muted)]">Bu özellik için içerik tanımı bulunamadı.</p>
      </CardContent>
    </Card>
  );
}


