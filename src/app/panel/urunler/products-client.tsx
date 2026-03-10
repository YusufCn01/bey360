"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";

type ProductRow = {
  id: string;
  code: string | null;
  name: string | null;
  status: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
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

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

const columns: ColumnDef<ProductRow>[] = [
  {
    id: "image",
    header: "Görsel",
    cell: ({ row }) => {
      const payload = asRecord(row.original.payload);
      const imageUrl = asText(payload.imageUrl);
      const name = row.original.name ?? "Ürün";
      if (imageUrl) {
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="h-10 w-10 rounded-md border border-[color:var(--mx-border)] object-cover" />
        );
      }

      return (
        <div className="grid h-10 w-10 place-items-center rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] text-xs font-bold text-[color:var(--mx-text-muted)]">
          {name.slice(0, 2).toUpperCase()}
        </div>
      );
    },
  },
  {
    accessorKey: "code",
    header: "Ürün Kodu",
  },
  {
    accessorKey: "name",
    header: "Ürün Adı",
  },
  {
    id: "barcode",
    header: "Barkod",
    cell: ({ row }) => {
      const payload = asRecord(row.original.payload);
      return asText(payload.barcode, "-");
    },
  },
  {
    id: "salePrice",
    header: "Satış Fiyat 1",
    cell: ({ row }) => {
      const payload = asRecord(row.original.payload);
      const salePrice = asNumber(payload.salePrice, 0);
      return `${salePrice.toFixed(2)} ₺`;
    },
  },
  {
    id: "stockMinMax",
    header: "Stok Limit",
    cell: ({ row }) => {
      const payload = asRecord(row.original.payload);
      const min = asNumber(payload.minStockLevel, 0);
      const max = asNumber(payload.maxStockLevel, 0);
      return `${min} / ${max}`;
    },
  },
  {
    accessorKey: "status",
    header: "Durum",
    cell: ({ row }) => (
      <span className="inline-flex rounded-full bg-[color:var(--mx-surface-soft)] px-2 py-0.5 text-xs font-semibold text-[color:var(--mx-text)]">
        {row.original.status}
      </span>
    ),
  },
];

export function ProductsClient() {
  const [rows, setRows] = React.useState<ProductRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tenant/products", { cache: "no-store" });
      const body = (await response.json()) as { success: boolean; data: ProductRow[]; error?: { message?: string } };
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Ürünler yüklenemedi.");
      }
      setRows(body.data ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Ürünler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-[color:var(--mx-text-muted)]">Toplam ürün: {rows.length}</p>
        <Button size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>
          Yenile
        </Button>
      </div>

      {error ? <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {loading ? <p className="text-sm text-[color:var(--mx-text-muted)]">Ürünler yükleniyor...</p> : null}
      {!loading ? <DataTable columns={columns} data={rows} globalFilterPlaceholder="Ürün kodu, adı veya barkod ara..." /> : null}
    </div>
  );
}
