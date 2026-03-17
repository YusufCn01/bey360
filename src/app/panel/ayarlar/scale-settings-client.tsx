"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenantSettingsForm } from "@/app/panel/ayarlar/settings-form-utils";
import {
  applyScaleBrandPreset,
  defaultScaleConnectionSettings,
  getScaleBrandPreset,
  scaleBrandPresets,
} from "@/modules/scale/domain/scale-settings";

type ScaleReadEnvelope = {
  success: boolean;
  data?: {
    reachable?: boolean;
    stable?: boolean | null;
    weightKg?: number | null;
    weightText?: string | null;
    unit?: string;
    raw?: string;
    latencyMs?: number;
  };
  error?: {
    message?: string;
  };
};

type PortsEnvelope = {
  success: boolean;
  data?: {
    ports?: Array<{
      path: string;
      manufacturer: string;
      serialNumber: string;
      friendlyName: string;
      vendorId: string;
      productId: string;
    }>;
  };
  error?: {
    message?: string;
  };
};

type ScalePortItem = NonNullable<NonNullable<PortsEnvelope["data"]>["ports"]>[number];

function isSerialScaleSupportedHere(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const host = window.location.hostname.toLowerCase();
  const isLocalHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".test");
  const hasDesktopBridge = Boolean(
    (window as Window & {
      bey360Desktop?: unknown;
    }).bey360Desktop,
  );

  return isLocalHost || hasDesktopBridge;
}

function formatWeight(weightKg?: number | null): string {
  if (typeof weightKg !== "number" || !Number.isFinite(weightKg)) {
    return "-";
  }
  return `${weightKg.toFixed(3).replace(".", ",")} kg`;
}

export function ScaleSettingsClient() {
  const defaults = React.useMemo(() => defaultScaleConnectionSettings, []);
  const { form, setForm, patch, loading, saving, message, error, load, save } = useTenantSettingsForm(
    "scale_connection_settings",
    defaults,
  );
  const [ports, setPorts] = React.useState<ScalePortItem[]>([]);
  const [portsBusy, setPortsBusy] = React.useState(false);
  const [actionBusy, setActionBusy] = React.useState<"test" | "read" | null>(null);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [lastRead, setLastRead] = React.useState<ScaleReadEnvelope["data"] | null>(null);
  const [readLogs, setReadLogs] = React.useState<string[]>([]);

  const activePreset = React.useMemo(() => getScaleBrandPreset(form.brand), [form.brand]);
  const serialSupportedHere = React.useMemo(() => isSerialScaleSupportedHere(), []);

  async function fetchPorts() {
    if (!isSerialScaleSupportedHere()) {
      setActionError("Seri port tarama sadece masaustu uygulamada veya local sunucuda kullanilabilir. Bulutta TCP/Ethernet terazi kullanin.");
      setActionMessage(null);
      return;
    }

    setPortsBusy(true);
    setActionError(null);

    try {
      const response = await fetch("/api/tenant/scale/ports", { cache: "no-store" });
      const body = (await response.json()) as PortsEnvelope;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Seri port listesi alinamadi.");
      }
      setPorts(body.data?.ports ?? []);
      setActionMessage("Seri port listesi guncellendi.");
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Seri port listesi alinamadi.");
    } finally {
      setPortsBusy(false);
    }
  }

  async function runDeviceAction(kind: "test" | "read") {
    if (form.transport === "serial" && !isSerialScaleSupportedHere()) {
      setActionError("Seri port terazi baglantisi bulut sunucuda calismaz. Bey360 masaustu uygulamasini veya local sunucuyu kullanin ya da TCP/Ethernet terazi ayarlayin.");
      setActionMessage(null);
      return;
    }

    setActionBusy(kind);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/tenant/scale/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: form,
        }),
      });
      const body = (await response.json()) as ScaleReadEnvelope;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Terazi islemi basarisiz.");
      }

      setLastRead(body.data ?? null);
      if (body.data?.raw) {
        const rawText = body.data.raw;
        setReadLogs((prev) => [`${new Date().toLocaleTimeString("tr-TR")} | ${rawText}`, ...prev].slice(0, 12));
      }
      if (kind === "test") {
        setActionMessage("Terazi baglantisi basarili.");
      } else {
        setActionMessage("Teraziden agirlik okundu.");
      }
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Terazi islemi basarisiz.");
    } finally {
      setActionBusy(null);
    }
  }

  function applyPreset(brand: typeof form.brand) {
    const next = applyScaleBrandPreset(brand, {
      enabled: form.enabled,
      host: form.host,
      serialPath: form.serialPath,
      timeoutMs: form.timeoutMs,
    });
    setForm(next);
    setActionMessage(`${getScaleBrandPreset(brand).label} profili uygulandi.`);
    setActionError(null);
  }

  return (
    <div className="space-y-4">
      <Card className="border-[color:var(--mx-border-strong)] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">Terazi Entegrasyonu</p>
            <h1 className="mt-1 text-2xl font-black">TEM, CAS, Dikomsan, Hana, Betsa ve TESS baglantilari</h1>
            <p className="mt-1 text-sm text-slate-300">
              Seri port veya TCP ile canli agirlik okuyun, barkodlu terazi urun akisini tek ayardan yonetin.
            </p>
            {form.brand === "cas" || form.brand === "cas_cl3000_stream" ? (
              <p className="mt-2 text-xs font-semibold text-amber-200">
                CAS CL3000 icin iki hazir profil var: "CAS / CL3000" sorgulu mod, "CAS / CL3000 (Stream)" surekli veri akisi modu.
              </p>
            ) : null}
            <p className="mt-2 text-xs font-semibold text-slate-200">
              Calisma ortami: {serialSupportedHere ? "Masaustu / Local - seri port desteklenir" : "Bulut - sadece TCP/Ethernet kullanin"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void load()} disabled={saving || loading}>
              Yenile
            </Button>
            <Button variant="secondary" onClick={() => void fetchPorts()} disabled={portsBusy}>
              {portsBusy ? "Portlar taraniyor..." : "Seri Portlari Tara"}
            </Button>
            <Button variant="secondary" onClick={() => void runDeviceAction("test")} disabled={actionBusy !== null || loading}>
              {actionBusy === "test" ? "Test ediliyor..." : "Baglanti Testi"}
            </Button>
            <Button onClick={() => void runDeviceAction("read")} disabled={actionBusy !== null || loading}>
              {actionBusy === "read" ? "Okunuyor..." : "Anlik Agirlik Oku"}
            </Button>
            <Button onClick={() => void save(form)} disabled={saving || loading}>
              {saving ? "Kaydediliyor..." : "Ayarlari Kaydet"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Baglanti Profili</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="rounded-lg border border-[color:var(--mx-border)] p-3 text-sm font-semibold">
                <span className="mb-2 block text-xs uppercase tracking-[0.12em] text-[color:var(--mx-text-muted)]">Marka</span>
                <select
                  value={form.brand}
                  onChange={(event) => {
                    const nextBrand = event.target.value as typeof form.brand;
                    patch("brand", nextBrand);
                    applyPreset(nextBrand);
                  }}
                >
                  {scaleBrandPresets.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="rounded-lg border border-[color:var(--mx-border)] p-3 text-sm font-semibold">
                <span className="mb-2 block text-xs uppercase tracking-[0.12em] text-[color:var(--mx-text-muted)]">Tasima Tipi</span>
                <select value={form.transport} onChange={(event) => patch("transport", event.target.value as "serial" | "tcp")}>
                  <option value="serial">Seri Port</option>
                  <option value="tcp">TCP / Ethernet</option>
                </select>
              </label>
            </div>

            <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-3 text-sm text-[color:var(--mx-text)]">
              <p className="font-black text-cyan-300">{activePreset.label}</p>
              <p className="mt-1 text-[color:var(--mx-text-muted)]">{activePreset.description}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-semibold">
                <span className="mb-1 block">Host / IP</span>
                <input value={form.host} onChange={(event) => patch("host", event.target.value)} placeholder="192.168.1.50" />
              </label>
              <label className="text-sm font-semibold">
                <span className="mb-1 block">TCP Port</span>
                <input
                  type="number"
                  value={form.port}
                  onChange={(event) => patch("port", Math.max(1, Number(event.target.value) || 1))}
                />
              </label>
              <label className="text-sm font-semibold">
                <span className="mb-1 block">Seri Port</span>
                <input value={form.serialPath} onChange={(event) => patch("serialPath", event.target.value)} placeholder="COM3 / /dev/ttyUSB0" />
              </label>
              <label className="text-sm font-semibold">
                <span className="mb-1 block">Timeout (ms)</span>
                <input
                  type="number"
                  value={form.timeoutMs}
                  onChange={(event) => patch("timeoutMs", Math.max(500, Number(event.target.value) || 500))}
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-sm font-semibold">
                <span className="mb-1 block">Baud Rate</span>
                <input
                  type="number"
                  value={form.baudRate}
                  onChange={(event) => patch("baudRate", Math.max(1200, Number(event.target.value) || 1200))}
                />
              </label>
              <label className="text-sm font-semibold">
                <span className="mb-1 block">Data Bits</span>
                <select value={form.dataBits} onChange={(event) => patch("dataBits", event.target.value === "7" ? 7 : 8)}>
                  <option value="8">8</option>
                  <option value="7">7</option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                <span className="mb-1 block">Stop Bits</span>
                <select value={form.stopBits} onChange={(event) => patch("stopBits", event.target.value === "2" ? 2 : 1)}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                <span className="mb-1 block">Parity</span>
                <select value={form.parity} onChange={(event) => patch("parity", event.target.value as "none" | "even" | "odd")}>
                  <option value="none">None</option>
                  <option value="even">Even</option>
                  <option value="odd">Odd</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm font-semibold">
                <span className="mb-1 block">Komut Modu</span>
                <select value={form.commandMode} onChange={(event) => patch("commandMode", event.target.value as "none" | "text" | "hex")}>
                  <option value="text">Metin</option>
                  <option value="hex">HEX</option>
                  <option value="none">Komut Gonderme</option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                <span className="mb-1 block">Okuma Modu</span>
                <select value={form.readMode} onChange={(event) => patch("readMode", event.target.value as "poll" | "stream")}>
                  <option value="poll">Sorgu / Cevap</option>
                  <option value="stream">Surekli Akin</option>
                </select>
              </label>
              <label className="flex items-end gap-2 rounded-lg border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold">
                <input type="checkbox" checked={form.enabled} onChange={(event) => patch("enabled", event.target.checked)} className="h-4 w-4" />
                Terazi entegrasyonu aktif
              </label>
            </div>

            <div className="grid gap-3">
              <label className="text-sm font-semibold">
                <span className="mb-1 block">Sorgu Komutu</span>
                <input
                  value={form.pollCommand}
                  onChange={(event) => patch("pollCommand", event.target.value)}
                  placeholder="Ornek: SI\\r\\n veya 05"
                />
              </label>
              <label className="text-sm font-semibold">
                <span className="mb-1 block">Cevap Regex Deseni</span>
                <input
                  value={form.responsePattern}
                  onChange={(event) => patch("responsePattern", event.target.value)}
                  placeholder="(?<stable>ST|US)?...(?<weight>...)"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm font-semibold">
                <span className="mb-1 block">Stable Tokenlar</span>
                <input value={form.stableTokens} onChange={(event) => patch("stableTokens", event.target.value)} placeholder="ST,GS" />
              </label>
              <label className="text-sm font-semibold">
                <span className="mb-1 block">Unstable Tokenlar</span>
                <input value={form.unstableTokens} onChange={(event) => patch("unstableTokens", event.target.value)} placeholder="US,MOTION" />
              </label>
              <label className="text-sm font-semibold">
                <span className="mb-1 block">Varsayilan Birim</span>
                <select value={form.unit} onChange={(event) => patch("unit", event.target.value as "kg" | "g")}>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                </select>
              </label>
            </div>

            {message ? (
              <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
            ) : null}
            {error ? (
              <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
            ) : null}
            {actionMessage ? (
              <p className="rounded-md border border-cyan-300 bg-cyan-50 px-3 py-2 text-sm text-cyan-700">{actionMessage}</p>
            ) : null}
            {actionError ? (
              <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{actionError}</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Canli Okuma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-400">Son Agirlik</p>
                <p className="mt-2 text-4xl font-black text-[color:var(--mx-text)]">{formatWeight(lastRead?.weightKg)}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-2">
                    Stabilite:{" "}
                    <span className="font-black">
                      {lastRead?.stable === true ? "Stabil" : lastRead?.stable === false ? "Hareketli" : "-"}
                    </span>
                  </div>
                  <div className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-2">
                    Gecikme: <span className="font-black">{lastRead?.latencyMs ?? "-"} ms</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3 text-xs text-[color:var(--mx-text-muted)]">
                <p className="font-black text-[color:var(--mx-text)]">Ham cevap</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono">{lastRead?.raw || "Henüz veri okunmadı."}</pre>
              </div>
              <div className="rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-3 text-xs text-[color:var(--mx-text-muted)]">
                <p className="font-black text-[color:var(--mx-text)]">Ham Veri Logu</p>
                <div className="mt-2 max-h-48 space-y-1 overflow-auto font-mono">
                  {readLogs.length > 0 ? (
                    readLogs.map((line) => (
                      <div key={line} className="rounded border border-[color:var(--mx-border)] bg-white px-2 py-1">
                        {line}
                      </div>
                    ))
                  ) : (
                    <p>Henüz log oluşmadı.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Algilanan Seri Portlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ports && ports.length > 0 ? (
                ports.map((port: ScalePortItem) => (
                  <button
                    key={port.path}
                    type="button"
                    onClick={() => patch("serialPath", port.path)}
                    className="w-full rounded-lg border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-3 text-left transition hover:border-cyan-400/60 hover:bg-[color:var(--mx-surface)]"
                  >
                    <p className="font-black">{port.path}</p>
                    <p className="text-xs text-[color:var(--mx-text-muted)]">
                      {[port.manufacturer, port.friendlyName, port.vendorId && `VID:${port.vendorId}`, port.productId && `PID:${port.productId}`]
                        .filter(Boolean)
                        .join(" | ") || "Ayrinti yok"}
                    </p>
                  </button>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-[color:var(--mx-border)] px-3 py-6 text-center text-sm text-[color:var(--mx-text-muted)]">
                  Port listesi bos. Masaustu uygulamada veya cihaz bagli makinede "Seri Portlari Tara" butonunu kullanin.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
