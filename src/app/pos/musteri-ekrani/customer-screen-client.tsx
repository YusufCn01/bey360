"use client";

import * as React from "react";
import { formatTry } from "@/lib/format/currency";

type CustomerScreenLine = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type CustomerScreenState = {
  registerName: string;
  customerName: string;
  total: number;
  totalQuantity: number;
  lines: CustomerScreenLine[];
  updatedAt: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeState(input: unknown): CustomerScreenState {
  const row = asRecord(input);
  const linesRaw = Array.isArray(row.lines) ? row.lines : [];
  const lines = linesRaw.map((item, index) => {
    const line = asRecord(item);
    return {
      id: asText(line.id, `line-${index + 1}`),
      name: asText(line.name, "Ürün"),
      quantity: asNumber(line.quantity, 0),
      unitPrice: asNumber(line.unitPrice, 0),
      total: asNumber(line.total, 0),
    } satisfies CustomerScreenLine;
  });

  return {
    registerName: asText(row.registerName, "Kasa"),
    customerName: asText(row.customerName, "Perakende"),
    total: asNumber(row.total, 0),
    totalQuantity: asNumber(row.totalQuantity, 0),
    lines,
    updatedAt: asText(row.updatedAt, new Date().toISOString()),
  };
}

function readFromStorage(): CustomerScreenState | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem("pos:customer-screen");
  if (!raw) {
    return null;
  }

  try {
    return normalizeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function CustomerScreenClient() {
  const [data, setData] = React.useState<CustomerScreenState | null>(null);

  React.useEffect(() => {
    setData(readFromStorage());
  }, []);

  React.useEffect(() => {
    const fromStorage = readFromStorage();
    if (fromStorage) {
      setData(fromStorage);
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== "pos:customer-screen") {
        return;
      }
      setData(readFromStorage());
    };
    window.addEventListener("storage", onStorage);

    if (typeof BroadcastChannel === "undefined") {
      return () => window.removeEventListener("storage", onStorage);
    }

    const channel = new BroadcastChannel("pos-customer-screen");
    const onMessage = (event: MessageEvent) => {
      const packet = asRecord(event.data);
      if (asText(packet.type) !== "state") {
        return;
      }
      setData(normalizeState(packet.payload));
    };

    channel.addEventListener("message", onMessage);
    channel.postMessage({ type: "request-state" });

    return () => {
      window.removeEventListener("storage", onStorage);
      channel.removeEventListener("message", onMessage);
      channel.close();
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] shadow-lg">
      <div className="flex items-center justify-between bg-gradient-to-r from-emerald-900 via-emerald-700 to-emerald-800 px-5 py-3 text-white">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-emerald-200">Müşteri Ekranı</p>
          <p className="text-lg font-bold">{data?.registerName ?? "Kasa"}</p>
          <p className="text-sm text-emerald-100">{data?.customerName ?? "Perakende"}</p>
        </div>
        <div className="rounded-md border border-emerald-200/50 bg-emerald-950/90 px-5 py-2 text-right">
          <p className="text-xs text-emerald-200">Toplam</p>
          <p className="text-4xl font-black tracking-tight text-lime-400">{formatTry(data?.total ?? 0)}</p>
        </div>
      </div>

      <div className="max-h-[calc(100vh-11rem)] overflow-auto p-4">
        {!data || data.lines.length === 0 ? (
          <div className="grid min-h-[52vh] place-items-center rounded-xl border border-dashed border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] p-6 text-center">
            <div>
              <p className="text-xl font-bold text-[color:var(--mx-text)]">Sepet bekleniyor...</p>
              <p className="mt-2 text-sm text-[color:var(--mx-text-muted)]">POS ekranından ürün eklendiğinde burada anlık görünecek.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {data.lines.map((line, index) => (
              <div key={line.id} className="grid grid-cols-[56px_1fr_120px_160px] items-center gap-3 rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-3">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-700 text-xl font-black text-white">{index + 1}</div>
                <p className="text-lg font-semibold text-[color:var(--mx-text)]">{line.name}</p>
                <p className="text-right text-lg font-bold text-[color:var(--mx-text)]">{line.quantity.toFixed(0)} x</p>
                <p className="text-right text-2xl font-black text-emerald-700">{formatTry(line.total)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-5 py-3 text-sm text-[color:var(--mx-text-muted)]">
        <p>Toplam Kalem: {data?.totalQuantity.toFixed(0) ?? "0"}</p>
        <p>Güncelleme: {data ? new Date(data.updatedAt).toLocaleTimeString("tr-TR") : "--:--:--"}</p>
      </div>
    </div>
  );
}
