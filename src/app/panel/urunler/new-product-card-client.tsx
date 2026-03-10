"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SaveProductResponse = {
  success: boolean;
  error?: { message?: string };
};

type ProductFormState = {
  code: string;
  name: string;
  description: string;
  barcode: string;
  purchasePrice: string;
  purchaseCurrency: string;
  salePrice1: string;
  saleCurrency1: string;
  vatRate: string;
  unit: string;
  openingStock: string;
  salePrice2: string;
  saleCurrency2: string;
  salePrice3: string;
  saleCurrency3: string;
  salePrice4: string;
  saleCurrency4: string;
  specialCode1: string;
  specialCode2: string;
  specialCode3: string;
  specialCode4: string;
  productGroup: string;
  productSubGroup: string;
  minStockLevel: string;
  maxStockLevel: string;
  expiryDate: string;
  discountRate: string;
  lockedForSale: boolean;
  imageUrl: string;
};

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

const initialForm: ProductFormState = {
  code: "",
  name: "",
  description: "",
  barcode: "",
  purchasePrice: "0",
  purchaseCurrency: "TRY",
  salePrice1: "0",
  saleCurrency1: "TRY",
  vatRate: "20",
  unit: "ADET",
  openingStock: "0",
  salePrice2: "0",
  saleCurrency2: "TRY",
  salePrice3: "0",
  saleCurrency3: "TRY",
  salePrice4: "0",
  saleCurrency4: "TRY",
  specialCode1: "",
  specialCode2: "",
  specialCode3: "",
  specialCode4: "",
  productGroup: "Grupsuz",
  productSubGroup: "Grupsuz",
  minStockLevel: "0",
  maxStockLevel: "0",
  expiryDate: "",
  discountRate: "0",
  lockedForSale: false,
  imageUrl: "",
};

const currencyOptions = [
  { value: "TRY", label: "TL (Türk Lirası)" },
  { value: "USD", label: "USD (Dolar)" },
  { value: "EUR", label: "EUR (Euro)" },
];

export function NewProductCardClient() {
  const [tab, setTab] = React.useState<"genel" | "ek">("genel");
  const [form, setForm] = React.useState<ProductFormState>(initialForm);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  function patchField<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSelectImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Görsel boyutu en fazla 2MB olabilir.");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Görsel okunamadı."));
      reader.readAsDataURL(file);
    });

    patchField("imageUrl", dataUrl);
    setError(null);
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/tenant/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code || undefined,
          name: form.name,
          description: form.description || undefined,
          barcode: form.barcode || undefined,
          defaultUnit: form.unit,
          purchasePrice: toNumber(form.purchasePrice, 0),
          salePrice: toNumber(form.salePrice1, 0),
          vatRate: toNumber(form.vatRate, 20),
          openingStock: toNumber(form.openingStock, 0),
          minStockLevel: toNumber(form.minStockLevel, 0),
          maxStockLevel: toNumber(form.maxStockLevel, 0),
          imageUrl: form.imageUrl || undefined,
          purchaseCurrency: form.purchaseCurrency,
          saleCurrency1: form.saleCurrency1,
          salePrice2: toNumber(form.salePrice2, 0),
          saleCurrency2: form.saleCurrency2,
          salePrice3: toNumber(form.salePrice3, 0),
          saleCurrency3: form.saleCurrency3,
          salePrice4: toNumber(form.salePrice4, 0),
          saleCurrency4: form.saleCurrency4,
          specialCode1: form.specialCode1 || undefined,
          specialCode2: form.specialCode2 || undefined,
          specialCode3: form.specialCode3 || undefined,
          specialCode4: form.specialCode4 || undefined,
          productGroup: form.productGroup || undefined,
          productSubGroup: form.productSubGroup || undefined,
          expiryDate: form.expiryDate || undefined,
          discountRate: toNumber(form.discountRate, 0),
          lockedForSale: form.lockedForSale,
        }),
      });

      const body = (await response.json()) as SaveProductResponse;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Ürün kaydedilemedi.");
      }

      setMessage("Ürün kartı kaydedildi.");
      setForm((prev) => ({
        ...initialForm,
        productGroup: prev.productGroup,
        productSubGroup: prev.productSubGroup,
      }));
      setTab("genel");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Ürün kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yeni Ürün Kartı</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submitForm} className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTab("genel")}
              className={`rounded-md border px-4 py-3 text-sm font-semibold ${
                tab === "genel"
                  ? "border-[color:var(--mx-brand-500)] bg-[color:var(--mx-brand-500)] text-white"
                  : "border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] text-[color:var(--mx-text)]"
              }`}
            >
              GENEL
            </button>
            <button
              type="button"
              onClick={() => setTab("ek")}
              className={`rounded-md border px-4 py-3 text-sm font-semibold ${
                tab === "ek"
                  ? "border-[color:var(--mx-brand-500)] bg-[color:var(--mx-brand-500)] text-white"
                  : "border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] text-[color:var(--mx-text)]"
              }`}
            >
              EK BİLGİLER
            </button>
          </div>

          {tab === "genel" ? (
            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Ürün Kodu</label>
                    <input value={form.code} onChange={(event) => patchField("code", event.target.value)} placeholder="Barkod veya kod" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Barkod / QR</label>
                    <input value={form.barcode} onChange={(event) => patchField("barcode", event.target.value)} placeholder="868..." />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">Ürün Adı</label>
                  <input value={form.name} onChange={(event) => patchField("name", event.target.value)} placeholder="Örn: Namet Dana Kasap Sucuk 250G" required />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">Ürün Açıklama</label>
                  <input value={form.description} onChange={(event) => patchField("description", event.target.value)} placeholder="Ürün kısa açıklaması" />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Alış Fiyat</label>
                    <input type="number" min={0} step="0.01" value={form.purchasePrice} onChange={(event) => patchField("purchasePrice", event.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Alış Fiyat Tipi</label>
                    <select value={form.purchaseCurrency} onChange={(event) => patchField("purchaseCurrency", event.target.value)}>
                      {currencyOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Satış Fiyat 1</label>
                    <input type="number" min={0} step="0.01" value={form.salePrice1} onChange={(event) => patchField("salePrice1", event.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Satış Fiyat 1 Tipi</label>
                    <select value={form.saleCurrency1} onChange={(event) => patchField("saleCurrency1", event.target.value)}>
                      {currencyOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold">KDV</label>
                    <input type="number" min={0} max={100} step="0.01" value={form.vatRate} onChange={(event) => patchField("vatRate", event.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-semibold">Hızlı KDV Seç</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 1, 10, 20].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => patchField("vatRate", String(rate))}
                          className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-2 py-2 text-xs font-bold"
                        >
                          {rate}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Ölçü Birimi</label>
                    <select value={form.unit} onChange={(event) => patchField("unit", event.target.value)}>
                      <option value="ADET">Adet</option>
                      <option value="KG">Kg</option>
                      <option value="LT">Litre</option>
                      <option value="KOLI">Koli</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Başlangıç Bakiyesi</label>
                    <input type="number" step="0.01" value={form.openingStock} onChange={(event) => patchField("openingStock", event.target.value)} />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid h-60 place-items-center rounded-lg border border-dashed border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)]">
                  {form.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.imageUrl} alt="Ürün görseli" className="h-full w-full rounded-lg object-contain p-2" />
                  ) : (
                    <span className="px-4 text-center text-sm text-[color:var(--mx-text-muted)]">Ürün görseli eklenmedi</span>
                  )}
                </div>
                <input
                  value={form.imageUrl}
                  onChange={(event) => patchField("imageUrl", event.target.value)}
                  placeholder="Resim URL..."
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 text-sm font-semibold">
                    Dosya Seç
                    <input type="file" accept="image/*" className="hidden" onChange={onSelectImage} />
                  </label>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => patchField("imageUrl", "")}
                  >
                    Resmi Sil
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Satış Fiyat 2</label>
                  <input type="number" min={0} step="0.01" value={form.salePrice2} onChange={(event) => patchField("salePrice2", event.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Satış Fiyat 2 Tipi</label>
                  <select value={form.saleCurrency2} onChange={(event) => patchField("saleCurrency2", event.target.value)}>
                    {currencyOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Satış Fiyat 3</label>
                  <input type="number" min={0} step="0.01" value={form.salePrice3} onChange={(event) => patchField("salePrice3", event.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Satış Fiyat 3 Tipi</label>
                  <select value={form.saleCurrency3} onChange={(event) => patchField("saleCurrency3", event.target.value)}>
                    {currencyOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Satış Fiyat 4</label>
                  <input type="number" min={0} step="0.01" value={form.salePrice4} onChange={(event) => patchField("salePrice4", event.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Satış Fiyat 4 Tipi</label>
                  <select value={form.saleCurrency4} onChange={(event) => patchField("saleCurrency4", event.target.value)}>
                    {currencyOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Özel Kod 1</label>
                  <input value={form.specialCode1} onChange={(event) => patchField("specialCode1", event.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Özel Kod 2</label>
                  <input value={form.specialCode2} onChange={(event) => patchField("specialCode2", event.target.value)} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Özel Kod 3</label>
                  <input value={form.specialCode3} onChange={(event) => patchField("specialCode3", event.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Özel Kod 4</label>
                  <input value={form.specialCode4} onChange={(event) => patchField("specialCode4", event.target.value)} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Ürün Grubu</label>
                  <input value={form.productGroup} onChange={(event) => patchField("productGroup", event.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Ürün Alt Grubu</label>
                  <input value={form.productSubGroup} onChange={(event) => patchField("productSubGroup", event.target.value)} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Kritik Stok Seviyesi</label>
                  <input type="number" min={0} step="0.01" value={form.minStockLevel} onChange={(event) => patchField("minStockLevel", event.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Max Stok Seviyesi</label>
                  <input type="number" min={0} step="0.01" value={form.maxStockLevel} onChange={(event) => patchField("maxStockLevel", event.target.value)} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Son Kullanım Tarihi</label>
                  <input type="date" value={form.expiryDate} onChange={(event) => patchField("expiryDate", event.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">İndirim %</label>
                  <input type="number" min={0} max={100} step="0.01" value={form.discountRate} onChange={(event) => patchField("discountRate", event.target.value)} />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.lockedForSale}
                  onChange={(event) => patchField("lockedForSale", event.target.checked)}
                  className="h-4 w-4"
                />
                Ürün kartı kilitli, satış yapılamaz
              </label>
            </div>
          )}

          {message ? (
            <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
          ) : null}
          {error ? (
            <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="min-w-32">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
