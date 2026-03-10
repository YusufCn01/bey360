"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ConfirmModal, type ConfirmModalTone } from "@/components/ui/confirm-modal";
import {
  defaultPosParameters,
  parsePosParameters,
  POS_PARAMETERS_SCOPE,
  type PosParameters,
} from "@/modules/pos/domain/pos-parameters";

type SettingsEnvelope = {
  success: boolean;
  data?: {
    payload?: Record<string, unknown>;
  };
  error?: { message?: string };
};

type ResetMovementsResult = {
  suspendedItems: number;
  suspendedCarts: number;
  cartEvents: number;
  priceChecks: number;
  openSessions: number;
};

type ResetMovementsEnvelope = {
  success: boolean;
  data?: ResetMovementsResult;
  error?: { message?: string };
};

type OkcTestResult = {
  reachable: boolean;
  latencyMs: number;
  reason: string;
};

type OkcTestEnvelope = {
  success: boolean;
  data?: OkcTestResult;
  error?: { message?: string };
};

type ConfirmDialogState = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: ConfirmModalTone;
};

function patchValue<K extends keyof PosParameters>(
  prev: PosParameters,
  key: K,
  value: PosParameters[K],
): PosParameters {
  return { ...prev, [key]: value };
}

export function PosParametersClient() {
  const [form, setForm] = React.useState<PosParameters>(defaultPosParameters);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testingOkc, setTestingOkc] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = React.useState<ConfirmDialogState>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Onayla",
    cancelLabel: "Vazgeç",
    tone: "info",
  });
  const confirmDialogResolverRef = React.useRef<((accepted: boolean) => void) | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tenant/settings?scope=${encodeURIComponent(POS_PARAMETERS_SCOPE)}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as SettingsEnvelope;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "POS parametreleri yüklenemedi.");
      }

      setForm(parsePosParameters(body.data?.payload ?? {}));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "POS parametreleri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openConfirmDialog = React.useCallback(
    (options: Omit<ConfirmDialogState, "open">) =>
      new Promise<boolean>((resolve) => {
        confirmDialogResolverRef.current = resolve;
        setConfirmDialog({
          open: true,
          title: options.title,
          description: options.description,
          confirmLabel: options.confirmLabel,
          cancelLabel: options.cancelLabel,
          tone: options.tone,
        });
      }),
    [],
  );

  const closeConfirmDialog = React.useCallback((accepted: boolean) => {
    const resolver = confirmDialogResolverRef.current;
    confirmDialogResolverRef.current = null;
    if (resolver) {
      resolver(accepted);
    }
    setConfirmDialog((prev) => ({
      ...prev,
      open: false,
    }));
  }, []);

  React.useEffect(() => {
    return () => {
      const resolver = confirmDialogResolverRef.current;
      confirmDialogResolverRef.current = null;
      if (resolver) {
        resolver(false);
      }
    };
  }, []);

  async function persist(next: PosParameters) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/tenant/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: POS_PARAMETERS_SCOPE,
          payload: next,
        }),
      });
      const body = (await response.json()) as SettingsEnvelope;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "POS parametreleri kaydedilemedi.");
      }

      setForm(next);
      setMessage("POS parametreleri kaydedildi.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "POS parametreleri kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function onResetProgram() {
    const accepted = await openConfirmDialog({
      title: "Program Sıfırlama",
      description: "Program parametreleri varsayılan ayarlara döndürülsün mü?",
      confirmLabel: "Sıfırla",
      cancelLabel: "Vazgeç",
      tone: "danger",
    });
    if (!accepted) {
      return;
    }

    const next: PosParameters = {
      ...defaultPosParameters,
      lastProgramResetAt: new Date().toISOString(),
      lastMovementResetAt: form.lastMovementResetAt,
    };
    await persist(next);

    window.localStorage.removeItem("pos:customer-screen");
    window.localStorage.removeItem("pos-operator-state");
  }

  async function onResetMovements() {
    const accepted = await openConfirmDialog({
      title: "POS Hareketlerini Sıfırla",
      description: "POS geçici hareketleri sıfırlansın mı? Bu işlem geri alınamaz.",
      confirmLabel: "Sıfırla",
      cancelLabel: "Vazgeç",
      tone: "danger",
    });
    if (!accepted) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/tenant/pos/maintenance/reset-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = (await response.json()) as ResetMovementsEnvelope;
      if (!response.ok || !body.success || !body.data) {
        throw new Error(body.error?.message ?? "POS hareketleri sıfırlanamadı.");
      }

      const next: PosParameters = {
        ...form,
        lastMovementResetAt: new Date().toISOString(),
      };
      await persist(next);

      setMessage(
        `Hareketler sıfırlandı. Askı: ${body.data.suspendedCarts}, Askı Satır: ${body.data.suspendedItems}, Kart Olayı: ${body.data.cartEvents}, Fiyat Log: ${body.data.priceChecks}, Açık Oturum: ${body.data.openSessions}`,
      );
      window.localStorage.removeItem("pos:customer-screen");
      window.localStorage.removeItem("pos-operator-state");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "POS hareketleri sıfırlanamadı.");
    } finally {
      setSaving(false);
    }
  }

  async function onTestOkc() {
    const ipAddress = form.okcIpAddress.trim();
    const port = Number(form.okcPort.trim());

    if (!ipAddress) {
      setError("ÖKC bağlantı testi için IP adresi girin.");
      return;
    }
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      setError("ÖKC bağlantı testi için geçerli bir port girin.");
      return;
    }

    setTestingOkc(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/tenant/pos/maintenance/test-okc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipAddress, port, timeoutMs: 2500 }),
      });
      const body = (await response.json()) as OkcTestEnvelope;
      if (!response.ok || !body.success || !body.data) {
        throw new Error(body.error?.message ?? "ÖKC bağlantı testi başarısız.");
      }

      if (body.data.reachable) {
        setMessage(`ÖKC bağlantısı başarılı. Gecikme: ${body.data.latencyMs} ms.`);
      } else {
        setError(`${body.data.reason} (Süre: ${body.data.latencyMs} ms)`);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "ÖKC bağlantı testi başarısız.");
    } finally {
      setTestingOkc(false);
    }
  }

  return (
    <>
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
              onClick={() => void load()}
              disabled={saving}
            >
              Yenile
            </Button>
            <Button
              size="sm"
              className="h-9 border border-lime-300/70 bg-lime-400 text-slate-900 hover:bg-lime-300"
              onClick={() => setMessage("POS parametre ekranı aktif.")}
            >
              Bilgi
            </Button>
          </div>
          <p className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">POS Parametre Yönetimi</p>
        </div>
      </div>

      <div className="rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] p-3">
        {loading ? (
          <p className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-8 text-center text-sm text-[color:var(--mx-text-muted)]">
            Parametreler yükleniyor...
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Bilgi Fişi Boyutu</label>
                  <select
                    value={form.infoReceiptSize}
                    onChange={(event) =>
                      setForm((prev) => patchValue(prev, "infoReceiptSize", event.target.value === "80" ? "80" : "58"))
                    }
                  >
                    <option value="58">58 MM</option>
                    <option value="80">80 MM</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">Bilgi Fişi Basım</label>
                  <select
                    value={form.infoReceiptPrintMode}
                    onChange={(event) =>
                      setForm((prev) =>
                        patchValue(
                          prev,
                          "infoReceiptPrintMode",
                          event.target.value === "always" || event.target.value === "never" ? event.target.value : "ask",
                        ),
                      )
                    }
                  >
                    <option value="ask">Her satışta sorulsun</option>
                    <option value="always">Her satışta otomatik yazdır</option>
                    <option value="never">Yazdırma</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={form.preventOutOfStockSale}
                    onChange={(event) => setForm((prev) => patchValue(prev, "preventOutOfStockSale", event.target.checked))}
                  />
                  Stokta olmayan ürün satılamaz
                </label>

                <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={form.enableTwoFactorAuth}
                    onChange={(event) => setForm((prev) => patchValue(prev, "enableTwoFactorAuth", event.target.checked))}
                  />
                  2 Faktörlü kimlik doğrulaması (2FA)
                </label>

                <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={form.warningSoundsEnabled}
                    onChange={(event) => setForm((prev) => patchValue(prev, "warningSoundsEnabled", event.target.checked))}
                  />
                  Uyarı sesleri açık
                </label>

                <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={form.barcodeSoundsEnabled}
                    onChange={(event) => setForm((prev) => patchValue(prev, "barcodeSoundsEnabled", event.target.checked))}
                  />
                  Barkod okuma sesleri açık
                </label>

                <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={form.preventExpiredProductSale}
                    onChange={(event) =>
                      setForm((prev) => patchValue(prev, "preventExpiredProductSale", event.target.checked))
                    }
                  />
                  Son kullanım tarihi geçmiş ürün satılamaz
                </label>

                <div className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-2">
                  <label className="mb-1 block text-sm font-semibold">SKT Takip Periyodu (Gün)</label>
                  <p className="mb-2 text-sm text-[color:var(--mx-text-muted)]">
                    Son kullanım tarihi yaklaşan ürünler listesinde kaç gün öncesine kadar gösterilsin.
                  </p>
                  <input
                    type="number"
                    min={0}
                    value={form.expiryWarningDays}
                    onChange={(event) =>
                      setForm((prev) => patchValue(prev, "expiryWarningDays", Math.max(0, Number(event.target.value) || 0)))
                    }
                    placeholder="Örn: 32"
                  />
                </div>

                <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={form.requireChangeFlowOnSale}
                    onChange={(event) => setForm((prev) => patchValue(prev, "requireChangeFlowOnSale", event.target.checked))}
                  />
                  Satış ekranında para üstü uygulamasını kullanmak zorunlu
                </label>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={form.okcActive}
                    onChange={(event) => setForm((prev) => patchValue(prev, "okcActive", event.target.checked))}
                  />
                  ÖKC Aktif
                </label>

                <div>
                  <label className="mb-1 block text-sm font-semibold">ÖKC Cihazı</label>
                  <select
                    value={form.okcDevice}
                    onChange={(event) => setForm((prev) => patchValue(prev, "okcDevice", event.target.value))}
                  >
                    <option value="">Cihaz Seçiniz</option>
                    <option value="hugin">Hugin</option>
                    <option value="ingenico">Ingenico</option>
                    <option value="verifone">Verifone</option>
                    <option value="profilo">Profilo</option>
                    <option value="pavo">Pavo</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">ÖKC IP Adresi</label>
                  <input
                    value={form.okcIpAddress}
                    onChange={(event) => setForm((prev) => patchValue(prev, "okcIpAddress", event.target.value))}
                    placeholder="Örn: 192.168.1.100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">ÖKC Port Numarası</label>
                  <input
                    value={form.okcPort}
                    onChange={(event) => setForm((prev) => patchValue(prev, "okcPort", event.target.value))}
                    placeholder="Örn: 5000"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">ÖKC Seri No</label>
                  <input
                    value={form.okcSerialNo}
                    onChange={(event) => setForm((prev) => patchValue(prev, "okcSerialNo", event.target.value))}
                    placeholder="Cihaz seri numarası"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    className="h-10"
                    disabled={saving || testingOkc}
                    onClick={() => {
                      void onTestOkc();
                    }}
                  >
                    {testingOkc ? "ÖKC Test Ediliyor..." : "ÖKC Bağlantı Testi"}
                  </Button>
                </div>

                <div className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-2 text-xs text-[color:var(--mx-text-muted)]">
                  <p>Son Program Sıfırlama: {form.lastProgramResetAt ? new Date(form.lastProgramResetAt).toLocaleString("tr-TR") : "-"}</p>
                  <p>Son Hareket Sıfırlama: {form.lastMovementResetAt ? new Date(form.lastMovementResetAt).toLocaleString("tr-TR") : "-"}</p>
                </div>
              </div>
            </div>

            {message ? (
              <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
            ) : null}
            {error ? (
              <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="danger"
                className="h-10"
                disabled={saving}
                onClick={() => {
                  void onResetProgram();
                }}
              >
                Programı Sıfırla
              </Button>
              <Button
                className="h-10 bg-amber-500 text-white hover:bg-amber-600"
                disabled={saving}
                onClick={() => {
                  void onResetMovements();
                }}
              >
                Tüm Hareketleri Sıfırla
              </Button>
              <Button
                className="h-10 bg-emerald-700 text-white hover:bg-emerald-600"
                disabled={saving}
                onClick={() => {
                  void persist(form);
                }}
              >
                {saving ? "Kaydediliyor..." : "Parametreleri Kaydet"}
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
      <ConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        tone={confirmDialog.tone}
        busy={saving}
        onCancel={() => closeConfirmDialog(false)}
        onConfirm={() => closeConfirmDialog(true)}
      />
    </>
  );
}

