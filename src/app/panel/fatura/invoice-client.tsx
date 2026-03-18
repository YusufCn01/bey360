"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Envelope<T> = {
  success: boolean;
  data: T;
  error?: { message?: string };
};

type ProductOption = {
  id: string;
  code: string;
  name: string;
  salePrice: number;
  vatRate: number;
};

type CustomerOption = {
  code: string;
  name: string;
};

type InvoiceLine = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

type InvoiceResult = {
  invoiceId: string;
  documentId: string;
  invoiceNo: string;
  netTotal: number;
};

type InvoiceListRow = {
  id: string;
  code: string | null;
  name: string | null;
  status: string;
  occurredAt?: string | null;
  payload?: Record<string, unknown>;
};

type EInvoiceRow = {
  id: string;
  code: string | null;
  name: string | null;
  status: string;
  scenario: string;
  profile: string;
  total: number;
  currency: string;
  providerCode: string;
  providerReference: string | null;
  updatedAt: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatTry(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("tr-TR");
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: "Taslak",
    queued: "Kuyrukta",
    sending: "Gönderiliyor",
    sent: "Gönderildi",
    delivered: "Teslim Edildi",
    accepted: "Kabul Edildi",
    rejected: "Reddedildi",
    cancelled: "İptal Edildi",
    failed: "Başarısız",
    archived: "Arşivlendi",
    issued: "Kesildi",
  };
  return map[status] ?? status;
}

async function request<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json()) as Envelope<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? "İşlem başarısız.");
  }
  return payload.data;
}

export function InvoiceClient() {
  const [products, setProducts] = React.useState<ProductOption[]>([]);
  const [customers, setCustomers] = React.useState<CustomerOption[]>([]);
  const [invoiceRows, setInvoiceRows] = React.useState<InvoiceListRow[]>([]);
  const [eInvoiceRows, setEInvoiceRows] = React.useState<EInvoiceRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [busyDocumentId, setBusyDocumentId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [customerCode, setCustomerCode] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [invoiceType, setInvoiceType] = React.useState<"satis" | "iade">("satis");
  const [scenario, setScenario] = React.useState<"TEMELFATURA" | "TICARIFATURA" | "EARSIV">("EARSIV");
  const [notes, setNotes] = React.useState("");
  const [selectedProductId, setSelectedProductId] = React.useState("");
  const [lineQuantity, setLineQuantity] = React.useState("1");
  const [linePrice, setLinePrice] = React.useState("0");
  const [lineVatRate, setLineVatRate] = React.useState("20");
  const [lines, setLines] = React.useState<InvoiceLine[]>([]);
  const [lastInvoiceResult, setLastInvoiceResult] = React.useState<InvoiceResult | null>(null);

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productRows, customerRows, invoices, eDocuments] = await Promise.all([
        request<Array<{ id: string; code: string; name: string; payload?: Record<string, unknown> }>>("/api/tenant/products?limit=250"),
        request<Array<{ code?: string; name?: string }>>("/api/tenant/customers?limit=250"),
        request<InvoiceListRow[]>("/api/tenant/invoices?limit=80&type=satis"),
        request<EInvoiceRow[]>("/api/tenant/einvoice/documents?limit=80"),
      ]);

      setProducts(
        productRows
          .map((row) => {
            const payload = asRecord(row.payload);
            return {
              id: row.id,
              code: row.code,
              name: row.name,
              salePrice: asNumber(payload.salePrice, 0),
              vatRate: asNumber(payload.vatRate, 20),
            } satisfies ProductOption;
          })
          .sort((a, b) => a.name.localeCompare(b.name, "tr")),
      );

      setCustomers(
        customerRows
          .map((row) => ({
            code: asText(row.code),
            name: asText(row.name),
          }))
          .filter((row) => row.code && row.name)
          .sort((a, b) => a.name.localeCompare(b.name, "tr")),
      );

      setInvoiceRows(invoices);
      setEInvoiceRows(eDocuments);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Fatura verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const selectedProduct = React.useMemo(
    () => products.find((row) => row.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  React.useEffect(() => {
    if (!selectedProduct) {
      return;
    }
    setLinePrice(String(selectedProduct.salePrice || 0));
    setLineVatRate(String(selectedProduct.vatRate || 20));
  }, [selectedProduct]);

  const invoiceTotal = React.useMemo(
    () =>
      lines.reduce((sum, line) => {
        const gross = line.quantity * line.unitPrice;
        return sum + gross + (gross * line.taxRate) / 100;
      }, 0),
    [lines],
  );

  function addLine() {
    if (!selectedProduct) {
      setError("Fatura satırı için ürün seçin.");
      return;
    }

    const quantity = Math.max(0, Number(lineQuantity.replace(",", ".")) || 0);
    const unitPrice = Math.max(0, Number(linePrice.replace(",", ".")) || 0);
    const taxRate = Math.max(0, Number(lineVatRate.replace(",", ".")) || 0);
    if (quantity <= 0 || unitPrice <= 0) {
      setError("Miktar ve birim fiyat 0'dan büyük olmalıdır.");
      return;
    }

    setLines((prev) => [
      ...prev,
      {
        id: `${selectedProduct.id}-${Date.now()}`,
        productId: selectedProduct.id,
        productCode: selectedProduct.code,
        productName: selectedProduct.name,
        quantity,
        unitPrice,
        taxRate,
      },
    ]);
    setError(null);
    setMessage(`${selectedProduct.name} fatura satırına eklendi.`);
  }

  function removeLine(lineId: string) {
    setLines((prev) => prev.filter((row) => row.id !== lineId));
  }

  async function createInvoice() {
    if (!customerCode.trim() || !customerName.trim()) {
      setError("Fatura için müşteri seçin.");
      return;
    }
    if (lines.length === 0) {
      setError("En az bir fatura satırı ekleyin.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await request<InvoiceResult>("/api/tenant/invoices", {
        method: "POST",
        body: JSON.stringify({
          customerCode,
          customerName,
          invoiceType,
          scenario,
          profile: scenario,
          currency: "TRY",
          notes: notes || undefined,
          lines: lines.map((line) => ({
            productId: line.productId,
            productName: line.productName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxRate: line.taxRate,
          })),
        }),
      });

      setLastInvoiceResult(result);
      setLines([]);
      setNotes("");
      setMessage(`Fatura kesildi. Belge No: ${result.invoiceNo}`);
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Fatura kesilemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function sendEDocument(documentId: string) {
    setBusyDocumentId(`send:${documentId}`);
    setError(null);
    setMessage(null);
    try {
      await request(`/api/tenant/einvoice/documents/${documentId}/send`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setMessage("e-Belge kuyruğa gönderildi.");
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "e-Belge kuyruğa gönderilemedi.");
    } finally {
      setBusyDocumentId(null);
    }
  }

  async function syncEDocument(documentId: string) {
    setBusyDocumentId(`sync:${documentId}`);
    setError(null);
    setMessage(null);
    try {
      await request(`/api/tenant/einvoice/documents/${documentId}/sync`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setMessage("e-Belge durumu senkronize edildi.");
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "e-Belge durumu senkronize edilemedi.");
    } finally {
      setBusyDocumentId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Satış Faturası Kes</CardTitle>
              <p className="mt-1 text-sm text-[color:var(--mx-text-muted)]">
                ERP içinden doğrudan satış / iade faturası, e-Arşiv ve e-Fatura taslağı oluşturun.
              </p>
            </div>
            <Button variant="secondary" onClick={() => void loadAll()} disabled={loading}>
              Yenile
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold">Müşteri</label>
                <select
                  value={customerCode}
                  onChange={(event) => {
                    const next = customers.find((row) => row.code === event.target.value);
                    setCustomerCode(next?.code ?? "");
                    setCustomerName(next?.name ?? "");
                  }}
                >
                  <option value="">Müşteri seçin</option>
                  {customers.map((row) => (
                    <option key={row.code} value={row.code}>
                      {row.code} - {row.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Fatura Tipi</label>
                <select value={invoiceType} onChange={(event) => setInvoiceType(event.target.value as "satis" | "iade")}>
                  <option value="satis">Satış Faturası</option>
                  <option value="iade">İade Faturası</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Senaryo</label>
                <select value={scenario} onChange={(event) => setScenario(event.target.value as "TEMELFATURA" | "TICARIFATURA" | "EARSIV")}>
                  <option value="EARSIV">e-Arşiv</option>
                  <option value="TEMELFATURA">Temel Fatura</option>
                  <option value="TICARIFATURA">Ticari Fatura</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Müşteri Ünvanı</label>
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Müşteri ünvanı" />
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3 md:grid-cols-[minmax(0,1.2fr)_120px_140px_120px_auto]">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mx-text-muted)]">Ürün</label>
                <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)}>
                  <option value="">Ürün seçin</option>
                  {products.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.code} - {row.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mx-text-muted)]">Miktar</label>
                <input value={lineQuantity} onChange={(event) => setLineQuantity(event.target.value)} inputMode="decimal" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mx-text-muted)]">Birim Fiyat</label>
                <input value={linePrice} onChange={(event) => setLinePrice(event.target.value)} inputMode="decimal" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mx-text-muted)]">KDV %</label>
                <input value={lineVatRate} onChange={(event) => setLineVatRate(event.target.value)} inputMode="decimal" />
              </div>
              <div className="self-end">
                <Button onClick={addLine}>Satıra Ekle</Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[color:var(--mx-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[color:var(--mx-surface-soft)] text-[color:var(--mx-text)]">
                  <tr>
                    <th className="px-3 py-3 text-left">Ürün</th>
                    <th className="px-3 py-3 text-left">Miktar</th>
                    <th className="px-3 py-3 text-left">Birim Fiyat</th>
                    <th className="px-3 py-3 text-left">KDV</th>
                    <th className="px-3 py-3 text-left">Tutar</th>
                    <th className="px-3 py-3 text-left">#</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-[color:var(--mx-text-muted)]">
                        Henüz fatura satırı eklenmedi.
                      </td>
                    </tr>
                  ) : (
                    lines.map((line) => {
                      const total = line.quantity * line.unitPrice * (1 + line.taxRate / 100);
                      return (
                        <tr key={line.id} className="border-t border-[color:var(--mx-border)]">
                          <td className="px-3 py-3">
                            <p className="font-semibold">{line.productName}</p>
                            <p className="text-xs text-[color:var(--mx-text-muted)]">{line.productCode}</p>
                          </td>
                          <td className="px-3 py-3">{line.quantity}</td>
                          <td className="px-3 py-3">{formatTry(line.unitPrice)}</td>
                          <td className="px-3 py-3">%{line.taxRate}</td>
                          <td className="px-3 py-3 font-semibold">{formatTry(total)}</td>
                          <td className="px-3 py-3">
                            <Button size="sm" variant="danger" onClick={() => removeLine(line.id)}>
                              Sil
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <label className="mb-1 block text-sm font-semibold">Not</label>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="İrsaliye notu, açıklama veya teslim bilgisi" />
              </div>
              <div className="rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--mx-text-muted)]">Fatura Özeti</p>
                <p className="mt-2 text-sm text-[color:var(--mx-text-muted)]">Satır sayısı: {lines.length}</p>
                <p className="mt-1 text-sm text-[color:var(--mx-text-muted)]">Senaryo: {scenario}</p>
                <p className="mt-4 text-3xl font-black text-[color:var(--mx-text)]">{formatTry(invoiceTotal)}</p>
                <Button className="mt-4 w-full" onClick={() => void createInvoice()} disabled={submitting}>
                  {submitting ? "Fatura Kesiliyor..." : "Fatura Kes"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>e-Belge İşlemleri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lastInvoiceResult ? (
                <>
                  <div className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3">
                    <p className="text-sm font-semibold">Son kesilen belge: {lastInvoiceResult.invoiceNo}</p>
                    <p className="mt-1 text-xs text-[color:var(--mx-text-muted)]">Belge ID: {lastInvoiceResult.documentId}</p>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Button
                      variant="secondary"
                      onClick={() => void sendEDocument(lastInvoiceResult.documentId)}
                      disabled={busyDocumentId === `send:${lastInvoiceResult.documentId}`}
                    >
                      {busyDocumentId === `send:${lastInvoiceResult.documentId}` ? "Gönderiliyor..." : "e-Belgeyi Kuyruğa Gönder"}
                    </Button>
                    <Button
                      onClick={() => void syncEDocument(lastInvoiceResult.documentId)}
                      disabled={busyDocumentId === `sync:${lastInvoiceResult.documentId}`}
                    >
                      {busyDocumentId === `sync:${lastInvoiceResult.documentId}` ? "Senkronize Ediliyor..." : "Durum Senkronize Et"}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[color:var(--mx-text-muted)]">
                  Fatura kestikten sonra e-Belge gönderim ve durum sorgulama aksiyonları burada aktif olur.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>İşlem Mesajları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {message ? <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
              {error ? <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
              {!message && !error ? <p className="text-sm text-[color:var(--mx-text-muted)]">Henüz işlem yapılmadı.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kesilen Faturalar</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[color:var(--mx-surface-soft)] text-[color:var(--mx-text)]">
                <tr>
                  <th className="px-3 py-3 text-left">Belge No</th>
                  <th className="px-3 py-3 text-left">Cari</th>
                  <th className="px-3 py-3 text-left">Tip</th>
                  <th className="px-3 py-3 text-left">Tutar</th>
                  <th className="px-3 py-3 text-left">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {invoiceRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-[color:var(--mx-text-muted)]">
                      Fatura kaydı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  invoiceRows.map((row) => {
                    const payload = asRecord(row.payload);
                    const netTotal = asNumber(payload.netTotal, 0);
                    const invoiceTypeValue = asText(payload.invoiceType, "satis");
                    return (
                      <tr key={row.id} className="border-t border-[color:var(--mx-border)]">
                        <td className="px-3 py-3 font-semibold">{row.code ?? "-"}</td>
                        <td className="px-3 py-3">{row.name ?? "-"}</td>
                        <td className="px-3 py-3">{invoiceTypeValue === "iade" ? "İade" : "Satış"}</td>
                        <td className="px-3 py-3">{formatTry(netTotal)}</td>
                        <td className="px-3 py-3">{formatDate(row.occurredAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>e-Fatura / e-Arşiv Belgeleri</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[color:var(--mx-surface-soft)] text-[color:var(--mx-text)]">
                <tr>
                  <th className="px-3 py-3 text-left">Belge No</th>
                  <th className="px-3 py-3 text-left">Senaryo</th>
                  <th className="px-3 py-3 text-left">Durum</th>
                  <th className="px-3 py-3 text-left">Tutar</th>
                  <th className="px-3 py-3 text-left">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {eInvoiceRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-[color:var(--mx-text-muted)]">
                      e-Belge kaydı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  eInvoiceRows.map((row) => {
                    const sending = busyDocumentId === `send:${row.id}`;
                    const syncing = busyDocumentId === `sync:${row.id}`;
                    return (
                      <tr key={row.id} className="border-t border-[color:var(--mx-border)]">
                        <td className="px-3 py-3 font-semibold">{row.code ?? "-"}</td>
                        <td className="px-3 py-3">{row.scenario}</td>
                        <td className="px-3 py-3">{statusLabel(row.status)}</td>
                        <td className="px-3 py-3">{formatTry(row.total)}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="secondary" onClick={() => void sendEDocument(row.id)} disabled={sending || syncing}>
                              {sending ? "Gönderiliyor..." : "Gönder"}
                            </Button>
                            <Button size="sm" onClick={() => void syncEDocument(row.id)} disabled={sending || syncing}>
                              {syncing ? "Senk..." : "Senkronize"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
