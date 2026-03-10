"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useTenantSettingsForm } from "@/app/panel/ayarlar/settings-form-utils";

function SettingLayout({
  title,
  subtitle,
  loading,
  saving,
  message,
  error,
  onReload,
  onSave,
  children,
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  saving: boolean;
  message: string | null;
  error: string | null;
  onReload: () => void;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[color:var(--mx-border-strong)] bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 p-2 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-9 border border-white/30 bg-slate-700 text-white hover:bg-slate-600">
              Parametreler
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-9 border border-cyan-300/40 bg-cyan-900/40 text-cyan-100 hover:bg-cyan-800/60"
              onClick={onReload}
              disabled={saving}
            >
              Yenile
            </Button>
            <Button
              size="sm"
              className="h-9 border border-lime-300/70 bg-lime-400 text-slate-900 hover:bg-lime-300"
              onClick={onSave}
              disabled={saving || loading}
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">{title}</p>
            <p className="text-xs text-slate-300">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] p-3">
        {loading ? (
          <p className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-8 text-center text-sm text-[color:var(--mx-text-muted)]">
            Ayarlar yükleniyor...
          </p>
        ) : (
          <div className="space-y-3">
            {children}
            {message ? (
              <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
            ) : null}
            {error ? (
              <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function EInvoiceSettingsClient() {
  const defaults = React.useMemo(
    () => ({
      provider: "none",
      environment: "test",
      senderAlias: "",
      senderTitle: "",
      archiveEmail: "",
      autoSend: false,
      autoDraft: true,
      sendHour: "23:30",
      showTaxExemptionCodes: false,
    }),
    [],
  );
  const { form, patch, loading, saving, message, error, load, save } = useTenantSettingsForm(
    "e_invoice_settings",
    defaults,
  );

  return (
    <SettingLayout
      title="e-Fatura Ayarları"
      subtitle="Sağlayıcı, gönderici ve otomasyon ayarları"
      loading={loading}
      saving={saving}
      message={message}
      error={error}
      onReload={() => void load()}
      onSave={() => void save(form)}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold">Sağlayıcı</label>
          <select value={form.provider} onChange={(event) => patch("provider", event.target.value)}>
            <option value="none">Sağlayıcı Seçilmedi</option>
            <option value="inhouse">Inhouse</option>
            <option value="uyumsoft">Uyumsoft</option>
            <option value="foriba">Foriba</option>
            <option value="edm">EDM</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Ortam</label>
          <select value={form.environment} onChange={(event) => patch("environment", event.target.value)}>
            <option value="test">Test</option>
            <option value="production">Canlı</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Gönderici Alias</label>
          <input
            value={form.senderAlias}
            onChange={(event) => patch("senderAlias", event.target.value)}
            placeholder="urn:mail:pk@firma.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Gönderici Ünvan</label>
          <input value={form.senderTitle} onChange={(event) => patch("senderTitle", event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">e-Arşiv E-posta</label>
          <input
            type="email"
            value={form.archiveEmail}
            onChange={(event) => patch("archiveEmail", event.target.value)}
            placeholder="arsiv@firma.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Otomatik Gönderim Saati</label>
          <input type="time" value={form.sendHour} onChange={(event) => patch("sendHour", event.target.value)} />
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
          <input type="checkbox" className="h-4 w-4" checked={form.autoDraft} onChange={(event) => patch("autoDraft", event.target.checked)} />
          Taslak otomatik oluştur
        </label>
        <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
          <input type="checkbox" className="h-4 w-4" checked={form.autoSend} onChange={(event) => patch("autoSend", event.target.checked)} />
          Uygun belgeleri otomatik gönder
        </label>
        <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={form.showTaxExemptionCodes}
            onChange={(event) => patch("showTaxExemptionCodes", event.target.checked)}
          />
          İstisna kodlarını göster
        </label>
      </div>
    </SettingLayout>
  );
}

export function IntegrationSettingsClient() {
  const defaults = React.useMemo(
    () => ({
      webhookUrl: "",
      webhookSecret: "",
      apiKey: "",
      allowedIps: "",
      requestTimeoutMs: 10000,
      retryCount: 3,
      syncCustomers: true,
      syncProducts: true,
      syncStock: true,
    }),
    [],
  );
  const { form, patch, loading, saving, message, error, load, save } = useTenantSettingsForm(
    "integration_settings",
    defaults,
  );

  return (
    <SettingLayout
      title="Entegrasyon Ayarları"
      subtitle="Webhook, API erişimi ve eşitleme seçenekleri"
      loading={loading}
      saving={saving}
      message={message}
      error={error}
      onReload={() => void load()}
      onSave={() => void save(form)}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-semibold">Webhook URL</label>
          <input
            value={form.webhookUrl}
            onChange={(event) => patch("webhookUrl", event.target.value)}
            placeholder="https://ornek.com/webhook/erp"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Webhook Secret</label>
          <input value={form.webhookSecret} onChange={(event) => patch("webhookSecret", event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">API Key</label>
          <input value={form.apiKey} onChange={(event) => patch("apiKey", event.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-semibold">İzinli IP Listesi</label>
          <textarea
            rows={3}
            value={form.allowedIps}
            onChange={(event) => patch("allowedIps", event.target.value)}
            placeholder="192.168.1.10, 192.168.1.11"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">İstek Timeout (ms)</label>
          <input
            type="number"
            min={1000}
            step={500}
            value={form.requestTimeoutMs}
            onChange={(event) => patch("requestTimeoutMs", Math.max(1000, Number(event.target.value) || 1000))}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Retry Sayısı</label>
          <input
            type="number"
            min={0}
            step={1}
            value={form.retryCount}
            onChange={(event) => patch("retryCount", Math.max(0, Math.floor(Number(event.target.value) || 0)))}
          />
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={form.syncCustomers}
            onChange={(event) => patch("syncCustomers", event.target.checked)}
          />
          Müşteri eşitleme açık
        </label>
        <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={form.syncProducts}
            onChange={(event) => patch("syncProducts", event.target.checked)}
          />
          Ürün eşitleme açık
        </label>
        <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={form.syncStock}
            onChange={(event) => patch("syncStock", event.target.checked)}
          />
          Stok eşitleme açık
        </label>
      </div>
    </SettingLayout>
  );
}

export function PrinterSettingsClient() {
  const defaults = React.useMemo(
    () => ({
      receiptPrinterName: "",
      invoicePrinterName: "",
      labelPrinterName: "",
      receiptPaperMm: "58",
      receiptCopies: 1,
      autoPrintReceipt: true,
      autoPrintInvoice: false,
      autoPrintLabel: false,
      printPreviewEnabled: true,
    }),
    [],
  );
  const { form, patch, loading, saving, message, error, load, save } = useTenantSettingsForm(
    "printer_settings",
    defaults,
  );

  return (
    <SettingLayout
      title="Yazıcı Ayarları"
      subtitle="Fiş, fatura ve etiket yazdırma ayarları"
      loading={loading}
      saving={saving}
      message={message}
      error={error}
      onReload={() => void load()}
      onSave={() => void save(form)}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold">Fiş Yazıcısı</label>
          <input value={form.receiptPrinterName} onChange={(event) => patch("receiptPrinterName", event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Fatura Yazıcısı</label>
          <input value={form.invoicePrinterName} onChange={(event) => patch("invoicePrinterName", event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Etiket Yazıcısı</label>
          <input value={form.labelPrinterName} onChange={(event) => patch("labelPrinterName", event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Fiş Kağıt Genişliği</label>
          <select value={form.receiptPaperMm} onChange={(event) => patch("receiptPaperMm", event.target.value)}>
            <option value="58">58 MM</option>
            <option value="80">80 MM</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Fiş Kopya Sayısı</label>
          <input
            type="number"
            min={1}
            step={1}
            value={form.receiptCopies}
            onChange={(event) => patch("receiptCopies", Math.max(1, Math.floor(Number(event.target.value) || 1)))}
          />
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={form.autoPrintReceipt}
            onChange={(event) => patch("autoPrintReceipt", event.target.checked)}
          />
          Fiş otomatik yazdır
        </label>
        <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={form.autoPrintInvoice}
            onChange={(event) => patch("autoPrintInvoice", event.target.checked)}
          />
          Fatura otomatik yazdır
        </label>
        <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={form.autoPrintLabel}
            onChange={(event) => patch("autoPrintLabel", event.target.checked)}
          />
          Etiket otomatik yazdır
        </label>
        <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={form.printPreviewEnabled}
            onChange={(event) => patch("printPreviewEnabled", event.target.checked)}
          />
          Yazdırma önizleme açık
        </label>
      </div>
    </SettingLayout>
  );
}
