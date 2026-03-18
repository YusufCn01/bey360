"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Envelope<T> = { success: boolean; data: T; error?: { message?: string } };
type ProductOption = { id: string; code: string; name: string; salePrice: number; purchasePrice: number; vatRate: number };
type PartyOption = { code: string; name: string };
type InvoiceLine = { id: string; productId: string; productCode: string; productName: string; quantity: number; unitPrice: number; taxRate: number };
type InvoiceResult = { invoiceId: string; documentId?: string | null; invoiceNo?: string | null; netTotal: number };
type InvoiceListRow = { id: string; code: string | null; name: string | null; status: string; occurredAt?: string | null; payload?: Record<string, unknown> };
type EInvoiceRow = { id: string; code: string | null; status: string; scenario: string; total: number };
type SalesInvoiceDetail = { id: string; code: string; customerCode: string; customerName: string; invoiceType: "satis" | "iade"; scenario: "TEMELFATURA" | "TICARIFATURA" | "EARSIV"; notes: string; status: string; occurredAt: string | null; netTotal: number; collectedAmount: number; outstandingAmount: number; paymentStatus: string; documentId: string | null; eDocumentStatus: string | null; lines: Array<{ id: string; productId: string; productName: string; quantity: number; unitPrice: number; taxRate: number; netAmount: number }>; collections: Array<{ id: string; amount: number; method: string; occurredAt: string }> };
type PurchaseInvoiceDetail = { id: string; code: string; supplierCode: string; supplierName: string; notes: string; status: string; occurredAt: string | null; netTotal: number; paidAmount: number; outstanding: number; lines: Array<{ id: string; productId: string; productName: string; quantity: number; unitPrice: number; taxRate: number; netAmount: number }>; payments: Array<{ id: string; amount: number; method: string; occurredAt: string }> };

const statusMap: Record<string, string> = { draft: "Taslak", queued: "Kuyrukta", sending: "Gönderiliyor", sent: "Gönderildi", delivered: "Teslim edildi", accepted: "Kabul edildi", rejected: "Reddedildi", cancelled: "İptal edildi", failed: "Başarısız", archived: "Arşivlendi", issued: "Kesildi", posted: "Kaydedildi", open: "Açık", partial: "Kısmi", paid: "Kapandı", satis: "Satış", iade: "İade", nakit: "Nakit", kart: "Kart", havale_eft: "Havale / EFT", cek: "Çek", dekont: "Dekont" };

function asRecord(value: unknown): Record<string, unknown> { return !value || typeof value !== "object" || Array.isArray(value) ? {} : (value as Record<string, unknown>); }
function asText(value: unknown, fallback = "") { return typeof value === "string" && value.trim() ? value.trim() : fallback; }
function asNumber(value: unknown, fallback = 0) { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }
function parseDecimal(value: string) { return Math.max(0, Number(value.replace(",", ".")) || 0); }
function roundCurrency(value: number) { return Math.round(value * 100) / 100; }
function statusLabel(value: string) { return statusMap[value] ?? value; }
function formatTry(amount: number) { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount); }
function formatDate(value?: string | null) { if (!value) return "-"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("tr-TR"); }

async function request<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const payload = (await response.json()) as Envelope<T>;
  if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "İşlem başarısız.");
  return payload.data;
}

function previewHtml(title: string, code: string, partyLabel: string, partyName: string, partyCode: string, status: string, notes: string, occurredAt: string | null, lines: Array<{ productName: string; quantity: number; unitPrice: number; taxRate: number; netAmount: number }>, total: number, paid?: number, remaining?: number) {
  const rows = lines.map((line, index) => `<tr><td>${index + 1}</td><td>${line.productName}</td><td>${line.quantity}</td><td>${formatTry(line.unitPrice)}</td><td>%${line.taxRate}</td><td>${formatTry(line.netAmount)}</td></tr>`).join("");
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8" /><title>${title}</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#0f172a}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #cbd5e1;padding:10px;text-align:left}th{background:#eff6ff}.header{display:flex;justify-content:space-between;margin-bottom:24px}.brand{font-size:28px;font-weight:900;color:#1d4ed8}.meta{color:#475569;font-size:13px}.box{border:1px solid #cbd5e1;border-radius:12px;padding:12px;margin-bottom:16px}</style></head><body><div class="header"><div><div class="brand">Bey360</div><div class="meta">ERP Fatura Önizleme</div></div><div class="meta"><div><strong>${title}</strong></div><div>Belge No: ${code}</div><div>Tarih: ${formatDate(occurredAt)}</div><div>Durum: ${statusLabel(status)}</div></div></div><div class="box"><strong>${partyLabel}:</strong> ${partyName} (${partyCode || "-"})<br/><strong>Not:</strong> ${notes || "-"}</div><table><thead><tr><th>#</th><th>Ürün / Hizmet</th><th>Miktar</th><th>Birim Fiyat</th><th>KDV</th><th>Tutar</th></tr></thead><tbody>${rows}</tbody></table><div class="box" style="margin-top:18px"><strong>Genel Toplam:</strong> ${formatTry(total)}${typeof paid === "number" ? `<br/><strong>Tahsil / Ödeme:</strong> ${formatTry(paid)}` : ""}${typeof remaining === "number" ? `<br/><strong>Kalan:</strong> ${formatTry(remaining)}` : ""}</div></body></html>`;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return <div className="rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mx-text-muted)]">{label}</p><p className={`mt-2 text-2xl font-black ${accent ?? "text-[color:var(--mx-text)]"}`}>{value}</p></div>;
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return <tr><td colSpan={colSpan} className="px-3 py-6 text-center text-[color:var(--mx-text-muted)]">{text}</td></tr>;
}

export function InvoiceClient() {
  const [products, setProducts] = React.useState<ProductOption[]>([]);
  const [customers, setCustomers] = React.useState<PartyOption[]>([]);
  const [suppliers, setSuppliers] = React.useState<PartyOption[]>([]);
  const [invoiceRows, setInvoiceRows] = React.useState<InvoiceListRow[]>([]);
  const [purchaseRows, setPurchaseRows] = React.useState<InvoiceListRow[]>([]);
  const [eInvoiceRows, setEInvoiceRows] = React.useState<EInvoiceRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
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
  const [editingInvoiceId, setEditingInvoiceId] = React.useState<string | null>(null);
  const [lastInvoiceResult, setLastInvoiceResult] = React.useState<InvoiceResult | null>(null);

  const [supplierCode, setSupplierCode] = React.useState("");
  const [supplierName, setSupplierName] = React.useState("");
  const [purchaseDocumentNo, setPurchaseDocumentNo] = React.useState("");
  const [purchaseNotes, setPurchaseNotes] = React.useState("");
  const [purchasePaidAmount, setPurchasePaidAmount] = React.useState("0");
  const [purchaseProductId, setPurchaseProductId] = React.useState("");
  const [purchaseQuantity, setPurchaseQuantity] = React.useState("1");
  const [purchasePrice, setPurchasePrice] = React.useState("0");
  const [purchaseVatRate, setPurchaseVatRate] = React.useState("20");
  const [purchaseLines, setPurchaseLines] = React.useState<InvoiceLine[]>([]);

  const [selectedSalesDetail, setSelectedSalesDetail] = React.useState<SalesInvoiceDetail | null>(null);
  const [selectedPurchaseDetail, setSelectedPurchaseDetail] = React.useState<PurchaseInvoiceDetail | null>(null);
  const [collectionAmount, setCollectionAmount] = React.useState("0");
  const [collectionMethod, setCollectionMethod] = React.useState<"nakit" | "kart" | "havale_eft" | "cek" | "dekont">("nakit");
  const [paymentAmount, setPaymentAmount] = React.useState("0");
  const [paymentMethod, setPaymentMethod] = React.useState<"nakit" | "kart" | "havale_eft" | "dekont">("nakit");

  const selectedSalesProduct = React.useMemo(() => products.find((row) => row.id === selectedProductId) ?? null, [products, selectedProductId]);
  const selectedPurchaseProduct = React.useMemo(() => products.find((row) => row.id === purchaseProductId) ?? null, [products, purchaseProductId]);
  const salesTotal = React.useMemo(() => lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * (1 + line.taxRate / 100), 0), [lines]);
  const purchaseTotal = React.useMemo(() => purchaseLines.reduce((sum, line) => sum + line.quantity * line.unitPrice * (1 + line.taxRate / 100), 0), [purchaseLines]);

  const resetSalesForm = React.useCallback(() => { setEditingInvoiceId(null); setCustomerCode(""); setCustomerName(""); setInvoiceType("satis"); setScenario("EARSIV"); setNotes(""); setSelectedProductId(""); setLineQuantity("1"); setLinePrice("0"); setLineVatRate("20"); setLines([]); }, []);
  const resetPurchaseForm = React.useCallback(() => { setSupplierCode(""); setSupplierName(""); setPurchaseDocumentNo(""); setPurchaseNotes(""); setPurchasePaidAmount("0"); setPurchaseProductId(""); setPurchaseQuantity("1"); setPurchasePrice("0"); setPurchaseVatRate("20"); setPurchaseLines([]); }, []);

  const loadAll = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [productRows, customerRows, supplierRows, invoices, purchases, eDocuments] = await Promise.all([
        request<Array<{ id: string; code: string; name: string; payload?: Record<string, unknown> }>>("/api/tenant/products?limit=250"),
        request<Array<{ code?: string; name?: string }>>("/api/tenant/customers?limit=250"),
        request<Array<{ code?: string; name?: string }>>("/api/tenant/suppliers?limit=250"),
        request<InvoiceListRow[]>("/api/tenant/invoices?limit=100"),
        request<InvoiceListRow[]>("/api/tenant/purchases/invoices?limit=100"),
        request<EInvoiceRow[]>("/api/tenant/einvoice/documents?limit=100"),
      ]);
      setProducts(productRows.map((row) => { const payload = asRecord(row.payload); return { id: row.id, code: row.code, name: row.name, salePrice: asNumber(payload.salePrice, 0), purchasePrice: asNumber(payload.purchasePrice, asNumber(payload.salePrice, 0)), vatRate: asNumber(payload.vatRate, 20) }; }).sort((a, b) => a.name.localeCompare(b.name, "tr")));
      setCustomers(customerRows.map((row) => ({ code: asText(row.code), name: asText(row.name) })).filter((row) => row.code && row.name).sort((a, b) => a.name.localeCompare(b.name, "tr")));
      setSuppliers(supplierRows.map((row) => ({ code: asText(row.code), name: asText(row.name) })).filter((row) => row.code && row.name).sort((a, b) => a.name.localeCompare(b.name, "tr")));
      setInvoiceRows(invoices); setPurchaseRows(purchases); setEInvoiceRows(eDocuments);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Fatura verileri yüklenemedi.");
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { void loadAll(); }, [loadAll]);
  React.useEffect(() => { if (selectedSalesProduct) { setLinePrice(String(selectedSalesProduct.salePrice || 0)); setLineVatRate(String(selectedSalesProduct.vatRate || 20)); } }, [selectedSalesProduct]);
  React.useEffect(() => { if (selectedPurchaseProduct) { setPurchasePrice(String(selectedPurchaseProduct.purchasePrice || selectedPurchaseProduct.salePrice || 0)); setPurchaseVatRate(String(selectedPurchaseProduct.vatRate || 20)); } }, [selectedPurchaseProduct]);
  function appendLine(params: { product: ProductOption | null; quantityText: string; priceText: string; taxText: string; target: React.Dispatch<React.SetStateAction<InvoiceLine[]>> }) {
    if (!params.product) { setError("Önce ürün seçin."); return; }
    const quantity = parseDecimal(params.quantityText); const unitPrice = parseDecimal(params.priceText); const taxRate = parseDecimal(params.taxText);
    if (quantity <= 0 || unitPrice <= 0) { setError("Miktar ve fiyat 0'dan büyük olmalıdır."); return; }
    params.target((prev) => [...prev, { id: `${params.product!.id}-${Date.now()}-${prev.length}`, productId: params.product!.id, productCode: params.product!.code, productName: params.product!.name, quantity, unitPrice, taxRate }]);
    setError(null);
  }
  function removeLine(lineId: string, target: React.Dispatch<React.SetStateAction<InvoiceLine[]>>) { target((prev) => prev.filter((row) => row.id !== lineId)); }

  async function selectSalesInvoice(invoiceId: string) {
    setBusyKey(`sales-detail:${invoiceId}`);
    try { const detail = await request<SalesInvoiceDetail>(`/api/tenant/invoices/${invoiceId}`); setSelectedSalesDetail(detail); setCollectionAmount(String(detail.outstandingAmount > 0 ? detail.outstandingAmount : 0)); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Fatura detayı yüklenemedi."); }
    finally { setBusyKey(null); }
  }

  async function selectPurchaseInvoice(invoiceId: string) {
    setBusyKey(`purchase-detail:${invoiceId}`);
    try { const detail = await request<PurchaseInvoiceDetail>(`/api/tenant/purchases/invoices/${invoiceId}`); setSelectedPurchaseDetail(detail); setPaymentAmount(String(detail.outstanding > 0 ? detail.outstanding : 0)); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Alış faturası detayı yüklenemedi."); }
    finally { setBusyKey(null); }
  }

  async function createOrUpdateSalesInvoice() {
    if (!customerCode.trim() || !customerName.trim()) { setError("Fatura için müşteri seçin."); return; }
    if (lines.length === 0) { setError("En az bir satış satırı ekleyin."); return; }
    setBusyKey("sales-submit"); setError(null); setMessage(null);
    try {
      const body = { customerCode, customerName, invoiceType, scenario, profile: scenario, currency: "TRY", notes: notes || undefined, lines: lines.map((line) => ({ productId: line.productId, productName: line.productName, quantity: line.quantity, unitPrice: line.unitPrice, taxRate: line.taxRate })) };
      const result = editingInvoiceId ? await request<InvoiceResult>(`/api/tenant/invoices/${editingInvoiceId}`, { method: "PATCH", body: JSON.stringify(body) }) : await request<InvoiceResult>("/api/tenant/invoices", { method: "POST", body: JSON.stringify(body) });
      setLastInvoiceResult(result); setMessage(editingInvoiceId ? `Fatura güncellendi. Belge No: ${result.invoiceNo ?? "-"}` : `Fatura kesildi. Belge No: ${result.invoiceNo ?? "-"}`); resetSalesForm(); await loadAll(); if (result.invoiceId) await selectSalesInvoice(result.invoiceId);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Fatura işlemi tamamlanamadı."); }
    finally { setBusyKey(null); }
  }

  async function loadInvoiceIntoForm(invoiceId: string) {
    setBusyKey(`sales-edit:${invoiceId}`);
    try {
      const detail = await request<SalesInvoiceDetail>(`/api/tenant/invoices/${invoiceId}`);
      setEditingInvoiceId(detail.id); setCustomerCode(detail.customerCode); setCustomerName(detail.customerName); setInvoiceType(detail.invoiceType); setScenario(detail.scenario); setNotes(detail.notes || "");
      setLines(detail.lines.map((line, index) => ({ id: `${line.id}-${index}`, productId: line.productId, productCode: products.find((row) => row.id === line.productId)?.code ?? "", productName: line.productName, quantity: line.quantity, unitPrice: line.unitPrice, taxRate: line.taxRate })));
      setMessage(`${detail.code} düzenleme formuna yüklendi.`);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Fatura düzenleme formuna yüklenemedi."); }
    finally { setBusyKey(null); }
  }

  async function cancelSalesInvoiceRow(invoiceId: string) {
    if (!window.confirm("Bu satış faturasını iptal etmek istediğinizden emin misiniz?")) return;
    setBusyKey(`sales-cancel:${invoiceId}`);
    try { await request(`/api/tenant/invoices/${invoiceId}/cancel`, { method: "POST", body: JSON.stringify({ reason: "ERP fatura ekranından iptal edildi." }) }); setMessage("Satış faturası iptal edildi."); await loadAll(); if (selectedSalesDetail?.id === invoiceId) await selectSalesInvoice(invoiceId); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Fatura iptal edilemedi."); }
    finally { setBusyKey(null); }
  }

  async function createPurchaseInvoice() {
    if (!supplierCode.trim() || !supplierName.trim()) { setError("Alış faturası için tedarikçi seçin."); return; }
    if (purchaseLines.length === 0) { setError("En az bir alış satırı ekleyin."); return; }
    setBusyKey("purchase-submit"); setError(null); setMessage(null);
    try {
      const result = await request<{ purchaseInvoiceId: string; documentNo: string }>("/api/tenant/purchases/invoices", { method: "POST", body: JSON.stringify({ supplierCode, supplierName, documentNo: purchaseDocumentNo || undefined, currency: "TRY", paidAmount: parseDecimal(purchasePaidAmount), notes: purchaseNotes || undefined, lines: purchaseLines.map((line) => ({ productId: line.productId, productName: line.productName, quantity: line.quantity, unitPrice: line.unitPrice, taxRate: line.taxRate })) }) });
      setMessage(`Alış faturası kaydedildi. Belge No: ${result.documentNo}`); resetPurchaseForm(); await loadAll(); await selectPurchaseInvoice(result.purchaseInvoiceId);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Alış faturası oluşturulamadı."); }
    finally { setBusyKey(null); }
  }

  async function saveCollection() {
    if (!selectedSalesDetail) { setError("Tahsilat için önce bir satış faturası seçin."); return; }
    const amount = parseDecimal(collectionAmount); if (amount <= 0) { setError("Tahsilat tutarı 0'dan büyük olmalıdır."); return; }
    setBusyKey(`sales-collection:${selectedSalesDetail.id}`);
    try { await request(`/api/tenant/invoices/${selectedSalesDetail.id}/collection`, { method: "POST", body: JSON.stringify({ amount, method: collectionMethod, currency: "TRY" }) }); setMessage("Fatura tahsilatı kaydedildi."); await loadAll(); await selectSalesInvoice(selectedSalesDetail.id); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Tahsilat kaydı oluşturulamadı."); }
    finally { setBusyKey(null); }
  }

  async function savePurchasePayment() {
    if (!selectedPurchaseDetail) { setError("Ödeme için önce bir alış faturası seçin."); return; }
    const amount = parseDecimal(paymentAmount); if (amount <= 0) { setError("Ödeme tutarı 0'dan büyük olmalıdır."); return; }
    setBusyKey(`purchase-payment:${selectedPurchaseDetail.id}`);
    try { await request(`/api/tenant/purchases/invoices/${selectedPurchaseDetail.id}/payment`, { method: "POST", body: JSON.stringify({ amount, method: paymentMethod, currency: "TRY" }) }); setMessage("Alış faturası ödemesi kaydedildi."); await loadAll(); await selectPurchaseInvoice(selectedPurchaseDetail.id); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Ödeme kaydı oluşturulamadı."); }
    finally { setBusyKey(null); }
  }

  async function sendDocument(documentId: string) {
    setBusyKey(`send:${documentId}`);
    try { await request(`/api/tenant/einvoice/documents/${documentId}/send`, { method: "POST", body: JSON.stringify({}) }); setMessage("e-Belge kuyruğa gönderildi."); await loadAll(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Belge kuyruğa gönderilemedi."); }
    finally { setBusyKey(null); }
  }

  async function syncDocument(documentId: string) {
    setBusyKey(`sync:${documentId}`);
    try { await request(`/api/tenant/einvoice/documents/${documentId}/sync`, { method: "POST", body: JSON.stringify({}) }); setMessage("e-Belge durumu senkronize edildi."); await loadAll(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Belge senkronize edilemedi."); }
    finally { setBusyKey(null); }
  }

  function openPreview(kind: "sales" | "purchase", detail: SalesInvoiceDetail | PurchaseInvoiceDetail | null) {
    if (!detail) { setError("Önizleme için önce belge detayı seçin."); return; }
    const html = kind === "sales"
      ? previewHtml((detail as SalesInvoiceDetail).invoiceType === "iade" ? "İade Faturası" : "Satış Faturası", detail.code, "Cari Müşteri", (detail as SalesInvoiceDetail).customerName, (detail as SalesInvoiceDetail).customerCode, detail.status, detail.notes, detail.occurredAt, detail.lines, (detail as SalesInvoiceDetail).netTotal, (detail as SalesInvoiceDetail).collectedAmount, (detail as SalesInvoiceDetail).outstandingAmount)
      : previewHtml("Alış Faturası", detail.code, "Tedarikçi", (detail as PurchaseInvoiceDetail).supplierName, (detail as PurchaseInvoiceDetail).supplierCode, detail.status, detail.notes, detail.occurredAt, detail.lines, (detail as PurchaseInvoiceDetail).netTotal, (detail as PurchaseInvoiceDetail).paidAmount, (detail as PurchaseInvoiceDetail).outstanding);
    const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=780"); if (!popup) { setError("Önizleme penceresi açılamadı. Tarayıcı engelliyor olabilir."); return; } popup.document.open(); popup.document.write(html); popup.document.close();
  }

  async function previewSalesInvoice(invoiceId: string) { const detail = selectedSalesDetail?.id === invoiceId ? selectedSalesDetail : await request<SalesInvoiceDetail>(`/api/tenant/invoices/${invoiceId}`); if (selectedSalesDetail?.id !== invoiceId) setSelectedSalesDetail(detail); openPreview("sales", detail); }
  async function previewPurchaseInvoice(invoiceId: string) { const detail = selectedPurchaseDetail?.id === invoiceId ? selectedPurchaseDetail : await request<PurchaseInvoiceDetail>(`/api/tenant/purchases/invoices/${invoiceId}`); if (selectedPurchaseDetail?.id !== invoiceId) setSelectedPurchaseDetail(detail); openPreview("purchase", detail); }
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>{editingInvoiceId ? "Satış Faturasını Düzenle" : "Satış / İade Faturası Kes"}</CardTitle>
              <p className="mt-1 text-sm text-[color:var(--mx-text-muted)]">ERP içinden satış ve iade faturası oluşturun, e-Belge senaryosunu seçin ve tahsilat akışına bağlayın.</p>
            </div>
            <div className="flex gap-2"><Button variant="secondary" onClick={() => void loadAll()} disabled={loading}>Yenile</Button>{editingInvoiceId ? <Button variant="secondary" onClick={resetSalesForm}>Yeni Faturaya Dön</Button> : null}</div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div><label className="mb-1 block text-sm font-semibold">Müşteri</label><select value={customerCode} onChange={(event) => { const next = customers.find((row) => row.code === event.target.value); setCustomerCode(next?.code ?? ""); setCustomerName(next?.name ?? ""); }}><option value="">Müşteri seçin</option>{customers.map((row) => <option key={row.code} value={row.code}>{row.code} - {row.name}</option>)}</select></div>
              <div><label className="mb-1 block text-sm font-semibold">Fatura Tipi</label><select value={invoiceType} onChange={(event) => setInvoiceType(event.target.value as "satis" | "iade")}><option value="satis">Satış faturası</option><option value="iade">İade faturası</option></select></div>
              <div><label className="mb-1 block text-sm font-semibold">Senaryo</label><select value={scenario} onChange={(event) => setScenario(event.target.value as "TEMELFATURA" | "TICARIFATURA" | "EARSIV")}><option value="EARSIV">e-Arşiv</option><option value="TEMELFATURA">Temel Fatura</option><option value="TICARIFATURA">Ticari Fatura</option></select></div>
              <div><label className="mb-1 block text-sm font-semibold">Müşteri Ünvanı</label><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Müşteri ünvanı" /></div>
            </div>
            <div className="grid gap-3 rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3 md:grid-cols-[minmax(0,1.2fr)_110px_130px_110px_auto]">
              <div><label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mx-text-muted)]">Ürün</label><select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)}><option value="">Ürün seçin</option>{products.map((row) => <option key={row.id} value={row.id}>{row.code} - {row.name}</option>)}</select></div>
              <div><label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mx-text-muted)]">Miktar</label><input value={lineQuantity} onChange={(event) => setLineQuantity(event.target.value)} inputMode="decimal" /></div>
              <div><label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mx-text-muted)]">Birim Fiyat</label><input value={linePrice} onChange={(event) => setLinePrice(event.target.value)} inputMode="decimal" /></div>
              <div><label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mx-text-muted)]">KDV %</label><input value={lineVatRate} onChange={(event) => setLineVatRate(event.target.value)} inputMode="decimal" /></div>
              <div className="self-end"><Button onClick={() => appendLine({ product: selectedSalesProduct, quantityText: lineQuantity, priceText: linePrice, taxText: lineVatRate, target: setLines })}>Satıra Ekle</Button></div>
            </div>
            <div className="overflow-hidden rounded-xl border border-[color:var(--mx-border)]"><table className="min-w-full text-sm"><thead className="bg-[color:var(--mx-surface-soft)] text-[color:var(--mx-text)]"><tr><th className="px-3 py-3 text-left">Ürün</th><th className="px-3 py-3 text-left">Miktar</th><th className="px-3 py-3 text-left">Birim Fiyat</th><th className="px-3 py-3 text-left">KDV</th><th className="px-3 py-3 text-left">Tutar</th><th className="px-3 py-3 text-left">#</th></tr></thead><tbody>{lines.length === 0 ? <EmptyRow colSpan={6} text="Henüz satış satırı eklenmedi." /> : lines.map((line) => { const total = roundCurrency(line.quantity * line.unitPrice * (1 + line.taxRate / 100)); return <tr key={line.id} className="border-t border-[color:var(--mx-border)]"><td className="px-3 py-3"><p className="font-semibold">{line.productName}</p><p className="text-xs text-[color:var(--mx-text-muted)]">{line.productCode}</p></td><td className="px-3 py-3">{line.quantity}</td><td className="px-3 py-3">{formatTry(line.unitPrice)}</td><td className="px-3 py-3">%{line.taxRate}</td><td className="px-3 py-3 font-semibold">{formatTry(total)}</td><td className="px-3 py-3"><Button size="sm" variant="danger" onClick={() => removeLine(line.id, setLines)}>Sil</Button></td></tr>; })}</tbody></table></div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_280px]"><div><label className="mb-1 block text-sm font-semibold">Not</label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Teslim, açıklama, irsaliye veya ödeme notu" /></div><div className="rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--mx-text-muted)]">Fatura Özeti</p><p className="mt-2 text-sm text-[color:var(--mx-text-muted)]">Satır sayısı: {lines.length}</p><p className="mt-1 text-sm text-[color:var(--mx-text-muted)]">Senaryo: {scenario}</p><p className="mt-4 text-3xl font-black text-[color:var(--mx-text)]">{formatTry(salesTotal)}</p><Button className="mt-4 w-full" onClick={() => void createOrUpdateSalesInvoice()} disabled={busyKey === "sales-submit"}>{busyKey === "sales-submit" ? "Kaydediliyor..." : editingInvoiceId ? "Faturayı Güncelle" : "Fatura Kes"}</Button></div></div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card><CardHeader><CardTitle>Alış Faturası</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-2"><div><label className="mb-1 block text-sm font-semibold">Tedarikçi</label><select value={supplierCode} onChange={(event) => { const next = suppliers.find((row) => row.code === event.target.value); setSupplierCode(next?.code ?? ""); setSupplierName(next?.name ?? ""); }}><option value="">Tedarikçi seçin</option>{suppliers.map((row) => <option key={row.code} value={row.code}>{row.code} - {row.name}</option>)}</select></div><div><label className="mb-1 block text-sm font-semibold">Belge No</label><input value={purchaseDocumentNo} onChange={(event) => setPurchaseDocumentNo(event.target.value)} placeholder="Opsiyonel dış fatura no" /></div><div><label className="mb-1 block text-sm font-semibold">Tedarikçi Ünvanı</label><input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="Tedarikçi ünvanı" /></div><div><label className="mb-1 block text-sm font-semibold">Peşin Ödeme</label><input value={purchasePaidAmount} onChange={(event) => setPurchasePaidAmount(event.target.value)} inputMode="decimal" /></div></div><div className="grid gap-3 rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3 md:grid-cols-[minmax(0,1.2fr)_110px_130px_110px_auto]"><div><label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mx-text-muted)]">Ürün</label><select value={purchaseProductId} onChange={(event) => setPurchaseProductId(event.target.value)}><option value="">Ürün seçin</option>{products.map((row) => <option key={row.id} value={row.id}>{row.code} - {row.name}</option>)}</select></div><div><label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mx-text-muted)]">Miktar</label><input value={purchaseQuantity} onChange={(event) => setPurchaseQuantity(event.target.value)} inputMode="decimal" /></div><div><label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mx-text-muted)]">Alış Fiyatı</label><input value={purchasePrice} onChange={(event) => setPurchasePrice(event.target.value)} inputMode="decimal" /></div><div><label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mx-text-muted)]">KDV %</label><input value={purchaseVatRate} onChange={(event) => setPurchaseVatRate(event.target.value)} inputMode="decimal" /></div><div className="self-end"><Button variant="secondary" onClick={() => appendLine({ product: selectedPurchaseProduct, quantityText: purchaseQuantity, priceText: purchasePrice, taxText: purchaseVatRate, target: setPurchaseLines })}>Satıra Ekle</Button></div></div><div className="overflow-hidden rounded-xl border border-[color:var(--mx-border)]"><table className="min-w-full text-sm"><thead className="bg-[color:var(--mx-surface-soft)] text-[color:var(--mx-text)]"><tr><th className="px-3 py-3 text-left">Ürün</th><th className="px-3 py-3 text-left">Miktar</th><th className="px-3 py-3 text-left">Birim Fiyat</th><th className="px-3 py-3 text-left">KDV</th><th className="px-3 py-3 text-left">Tutar</th><th className="px-3 py-3 text-left">#</th></tr></thead><tbody>{purchaseLines.length === 0 ? <EmptyRow colSpan={6} text="Henüz alış satırı eklenmedi." /> : purchaseLines.map((line) => { const total = roundCurrency(line.quantity * line.unitPrice * (1 + line.taxRate / 100)); return <tr key={line.id} className="border-t border-[color:var(--mx-border)]"><td className="px-3 py-3"><p className="font-semibold">{line.productName}</p><p className="text-xs text-[color:var(--mx-text-muted)]">{line.productCode}</p></td><td className="px-3 py-3">{line.quantity}</td><td className="px-3 py-3">{formatTry(line.unitPrice)}</td><td className="px-3 py-3">%{line.taxRate}</td><td className="px-3 py-3 font-semibold">{formatTry(total)}</td><td className="px-3 py-3"><Button size="sm" variant="danger" onClick={() => removeLine(line.id, setPurchaseLines)}>Sil</Button></td></tr>; })}</tbody></table></div><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_280px]"><div><label className="mb-1 block text-sm font-semibold">Not</label><textarea value={purchaseNotes} onChange={(event) => setPurchaseNotes(event.target.value)} rows={4} placeholder="Tedarikçi notu, teslim, masraf veya açıklama" /></div><div className="rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--mx-text-muted)]">Alış Özeti</p><p className="mt-2 text-sm text-[color:var(--mx-text-muted)]">Satır sayısı: {purchaseLines.length}</p><p className="mt-1 text-sm text-[color:var(--mx-text-muted)]">Peşin ödeme: {formatTry(parseDecimal(purchasePaidAmount))}</p><p className="mt-4 text-3xl font-black text-[color:var(--mx-text)]">{formatTry(purchaseTotal)}</p><Button className="mt-4 w-full" onClick={() => void createPurchaseInvoice()} disabled={busyKey === "purchase-submit"}>{busyKey === "purchase-submit" ? "Kaydediliyor..." : "Alış Faturası Oluştur"}</Button><Button className="mt-2 w-full" variant="secondary" onClick={resetPurchaseForm}>Formu Temizle</Button></div></div></CardContent></Card>
          <Card><CardHeader><CardTitle>e-Belge İşlemleri</CardTitle></CardHeader><CardContent className="space-y-3">{lastInvoiceResult ? <><div className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3"><p className="text-sm font-semibold">Son satış belgesi: {lastInvoiceResult.invoiceNo ?? "-"}</p><p className="mt-1 text-xs text-[color:var(--mx-text-muted)]">Belge ID: {lastInvoiceResult.documentId ?? "-"}</p></div><div className="grid gap-2 md:grid-cols-2"><Button variant="secondary" onClick={() => lastInvoiceResult.documentId && void sendDocument(lastInvoiceResult.documentId)} disabled={!lastInvoiceResult.documentId || busyKey === `send:${lastInvoiceResult.documentId}`}>e-Belgeyi Gönder</Button><Button onClick={() => lastInvoiceResult.documentId && void syncDocument(lastInvoiceResult.documentId)} disabled={!lastInvoiceResult.documentId || busyKey === `sync:${lastInvoiceResult.documentId}`}>Durumu Senkronize Et</Button></div></> : <p className="text-sm text-[color:var(--mx-text-muted)]">Satış faturası kestikten sonra e-Fatura / e-Arşiv gönderim aksiyonları burada aktif olur.</p>}</CardContent></Card>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card><CardHeader><CardTitle>Kesilen Satış Faturaları</CardTitle></CardHeader><CardContent className="overflow-auto"><table className="min-w-full text-sm"><thead className="bg-[color:var(--mx-surface-soft)] text-[color:var(--mx-text)]"><tr><th className="px-3 py-3 text-left">Belge No</th><th className="px-3 py-3 text-left">Cari</th><th className="px-3 py-3 text-left">Tip</th><th className="px-3 py-3 text-left">Tutar</th><th className="px-3 py-3 text-left">Tahsilat</th><th className="px-3 py-3 text-left">İşlem</th></tr></thead><tbody>{invoiceRows.length === 0 ? <EmptyRow colSpan={6} text="Satış faturası kaydı bulunamadı." /> : invoiceRows.map((row) => { const payload = asRecord(row.payload); const netTotal = asNumber(payload.netTotal, 0); const collectedAmount = asNumber(payload.collectedAmount, 0); const paymentStatus = asText(payload.paymentStatus, "open"); const type = asText(payload.invoiceType, "satis"); return <tr key={row.id} className="border-t border-[color:var(--mx-border)]"><td className="px-3 py-3 font-semibold">{row.code ?? "-"}<div className="text-xs text-[color:var(--mx-text-muted)]">{formatDate(row.occurredAt)}</div></td><td className="px-3 py-3">{row.name ?? "-"}</td><td className="px-3 py-3">{statusLabel(type)}<div className="text-xs text-[color:var(--mx-text-muted)]">{statusLabel(row.status)}</div></td><td className="px-3 py-3">{formatTry(netTotal)}</td><td className="px-3 py-3">{formatTry(collectedAmount)}<div className="text-xs text-[color:var(--mx-text-muted)]">{statusLabel(paymentStatus)}</div></td><td className="px-3 py-3"><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => void selectSalesInvoice(row.id)}>Detay</Button><Button size="sm" variant="secondary" onClick={() => void loadInvoiceIntoForm(row.id)}>Düzenle</Button><Button size="sm" onClick={() => void previewSalesInvoice(row.id)}>Önizle</Button><Button size="sm" variant="danger" onClick={() => void cancelSalesInvoiceRow(row.id)} disabled={row.status === "cancelled"}>İptal</Button></div></td></tr>; })}</tbody></table></CardContent></Card>
        <Card><CardHeader><CardTitle>Satış Faturası Detayı</CardTitle></CardHeader><CardContent className="space-y-4">{selectedSalesDetail ? <><div className="grid gap-3 md:grid-cols-2"><Stat label="Genel Toplam" value={formatTry(selectedSalesDetail.netTotal)} /><Stat label="Kalan" value={formatTry(selectedSalesDetail.outstandingAmount)} accent="text-rose-600" /><Stat label="Tahsil Edilen" value={formatTry(selectedSalesDetail.collectedAmount)} accent="text-emerald-600" /><Stat label="e-Belge Durumu" value={selectedSalesDetail.eDocumentStatus ? statusLabel(selectedSalesDetail.eDocumentStatus) : "-"} /></div><div className="rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mx-text-muted)]">{selectedSalesDetail.code}</p><p className="mt-2 text-lg font-bold">{selectedSalesDetail.customerName}</p><p className="text-sm text-[color:var(--mx-text-muted)]">{selectedSalesDetail.customerCode}</p></div><div className="rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-4 space-y-3"><p className="text-sm font-semibold">Tahsilat Ekle</p><div className="grid gap-3 md:grid-cols-2"><input value={collectionAmount} onChange={(event) => setCollectionAmount(event.target.value)} inputMode="decimal" /><select value={collectionMethod} onChange={(event) => setCollectionMethod(event.target.value as typeof collectionMethod)}><option value="nakit">Nakit</option><option value="kart">Kart</option><option value="havale_eft">Havale / EFT</option><option value="cek">Çek</option><option value="dekont">Dekont</option></select></div><div className="flex gap-2"><Button onClick={() => void saveCollection()} disabled={busyKey === `sales-collection:${selectedSalesDetail.id}`}>Tahsilatı Kaydet</Button><Button variant="secondary" onClick={() => openPreview("sales", selectedSalesDetail)}>Yazdır / Önizle</Button></div></div><div className="rounded-xl border border-[color:var(--mx-border)] p-4"><p className="mb-2 text-sm font-semibold">Tahsilat Geçmişi</p>{selectedSalesDetail.collections.length === 0 ? <p className="text-sm text-[color:var(--mx-text-muted)]">Bu faturaya bağlı tahsilat kaydı yok.</p> : <div className="space-y-2">{selectedSalesDetail.collections.map((row) => <div key={row.id} className="rounded-lg border border-[color:var(--mx-border)] px-3 py-2 text-sm"><div className="flex items-center justify-between"><span>{statusLabel(row.method)}</span><strong>{formatTry(row.amount)}</strong></div><div className="text-xs text-[color:var(--mx-text-muted)]">{formatDate(row.occurredAt)}</div></div>)}</div>}</div></> : <p className="text-sm text-[color:var(--mx-text-muted)]">Detay, tahsilat ve yazdırma işlemleri için listeden bir satış faturası seçin.</p>}</CardContent></Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card><CardHeader><CardTitle>Alış Faturaları</CardTitle></CardHeader><CardContent className="overflow-auto"><table className="min-w-full text-sm"><thead className="bg-[color:var(--mx-surface-soft)] text-[color:var(--mx-text)]"><tr><th className="px-3 py-3 text-left">Belge No</th><th className="px-3 py-3 text-left">Tedarikçi</th><th className="px-3 py-3 text-left">Toplam</th><th className="px-3 py-3 text-left">Ödeme</th><th className="px-3 py-3 text-left">İşlem</th></tr></thead><tbody>{purchaseRows.length === 0 ? <EmptyRow colSpan={5} text="Alış faturası kaydı bulunamadı." /> : purchaseRows.map((row) => { const payload = asRecord(row.payload); return <tr key={row.id} className="border-t border-[color:var(--mx-border)]"><td className="px-3 py-3 font-semibold">{row.code ?? "-"}<div className="text-xs text-[color:var(--mx-text-muted)]">{formatDate(row.occurredAt)}</div></td><td className="px-3 py-3">{row.name ?? "-"}</td><td className="px-3 py-3">{formatTry(asNumber(payload.netTotal, 0))}</td><td className="px-3 py-3">{formatTry(asNumber(payload.paidAmount, 0))}<div className="text-xs text-[color:var(--mx-text-muted)]">Kalan {formatTry(asNumber(payload.outstanding, 0))}</div></td><td className="px-3 py-3"><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => void selectPurchaseInvoice(row.id)}>Detay</Button><Button size="sm" onClick={() => void previewPurchaseInvoice(row.id)}>Önizle</Button></div></td></tr>; })}</tbody></table></CardContent></Card>
        <Card><CardHeader><CardTitle>Alış Faturası Detayı</CardTitle></CardHeader><CardContent className="space-y-4">{selectedPurchaseDetail ? <><div className="grid gap-3 md:grid-cols-2"><Stat label="Genel Toplam" value={formatTry(selectedPurchaseDetail.netTotal)} /><Stat label="Kalan" value={formatTry(selectedPurchaseDetail.outstanding)} accent="text-rose-600" /><Stat label="Ödenen" value={formatTry(selectedPurchaseDetail.paidAmount)} accent="text-emerald-600" /><Stat label="Durum" value={statusLabel(selectedPurchaseDetail.status)} /></div><div className="rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mx-text-muted)]">{selectedPurchaseDetail.code}</p><p className="mt-2 text-lg font-bold">{selectedPurchaseDetail.supplierName}</p><p className="text-sm text-[color:var(--mx-text-muted)]">{selectedPurchaseDetail.supplierCode}</p></div><div className="rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-4 space-y-3"><p className="text-sm font-semibold">Tedarikçi Ödemesi</p><div className="grid gap-3 md:grid-cols-2"><input value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} inputMode="decimal" /><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)}><option value="nakit">Nakit</option><option value="kart">Kart</option><option value="havale_eft">Havale / EFT</option><option value="dekont">Dekont</option></select></div><div className="flex gap-2"><Button onClick={() => void savePurchasePayment()} disabled={busyKey === `purchase-payment:${selectedPurchaseDetail.id}`}>Ödemeyi Kaydet</Button><Button variant="secondary" onClick={() => openPreview("purchase", selectedPurchaseDetail)}>Yazdır / Önizle</Button></div></div><div className="rounded-xl border border-[color:var(--mx-border)] p-4"><p className="mb-2 text-sm font-semibold">Ödeme Geçmişi</p>{selectedPurchaseDetail.payments.length === 0 ? <p className="text-sm text-[color:var(--mx-text-muted)]">Bu alış faturasına bağlı ödeme kaydı yok.</p> : <div className="space-y-2">{selectedPurchaseDetail.payments.map((row) => <div key={row.id} className="rounded-lg border border-[color:var(--mx-border)] px-3 py-2 text-sm"><div className="flex items-center justify-between"><span>{statusLabel(row.method)}</span><strong>{formatTry(row.amount)}</strong></div><div className="text-xs text-[color:var(--mx-text-muted)]">{formatDate(row.occurredAt)}</div></div>)}</div>}</div></> : <p className="text-sm text-[color:var(--mx-text-muted)]">Detay, ödeme ve yazdırma işlemleri için listeden bir alış faturası seçin.</p>}</CardContent></Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card><CardHeader><CardTitle>e-Fatura / e-Arşiv Belgeleri</CardTitle></CardHeader><CardContent className="overflow-auto"><table className="min-w-full text-sm"><thead className="bg-[color:var(--mx-surface-soft)] text-[color:var(--mx-text)]"><tr><th className="px-3 py-3 text-left">Belge No</th><th className="px-3 py-3 text-left">Senaryo</th><th className="px-3 py-3 text-left">Durum</th><th className="px-3 py-3 text-left">Tutar</th><th className="px-3 py-3 text-left">İşlem</th></tr></thead><tbody>{eInvoiceRows.length === 0 ? <EmptyRow colSpan={5} text="e-Belge kaydı bulunamadı." /> : eInvoiceRows.map((row) => <tr key={row.id} className="border-t border-[color:var(--mx-border)]"><td className="px-3 py-3 font-semibold">{row.code ?? "-"}</td><td className="px-3 py-3">{row.scenario}</td><td className="px-3 py-3">{statusLabel(row.status)}</td><td className="px-3 py-3">{formatTry(row.total)}</td><td className="px-3 py-3"><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => void sendDocument(row.id)} disabled={busyKey === `send:${row.id}`}>Gönder</Button><Button size="sm" onClick={() => void syncDocument(row.id)} disabled={busyKey === `sync:${row.id}`}>Senkronize</Button></div></td></tr>)}</tbody></table></CardContent></Card>
        <Card><CardHeader><CardTitle>İşlem Mesajları</CardTitle></CardHeader><CardContent className="space-y-3">{message ? <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}{error ? <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}{!message && !error ? <p className="text-sm text-[color:var(--mx-text-muted)]">Henüz işlem yapılmadı.</p> : null}<div className="rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-4 text-sm text-[color:var(--mx-text-muted)]"><p className="font-semibold text-[color:var(--mx-text)]">Bu ekranda aktif olan akışlar</p><ul className="mt-2 list-disc space-y-1 pl-5"><li>Satış / iade faturası kesme ve düzenleme</li><li>Alış faturası oluşturma</li><li>Satış faturasına tahsilat bağlama</li><li>Alış faturasına ödeme bağlama</li><li>Fatura yazdırma / önizleme</li><li>Satış faturasını iptal etme</li><li>e-Fatura / e-Arşiv gönderim ve durum senkronizasyonu</li></ul></div>{loading ? <p className="text-xs text-[color:var(--mx-text-muted)]">Veriler yükleniyor...</p> : null}</CardContent></Card>
      </div>
    </div>
  );
}
