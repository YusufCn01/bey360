"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";

type MovementRow = {
  id: string;
  code: string | null;
  name: string | null;
  status: string;
  occurredAt: string | null;
  payload: {
    productId: string;
    deltaQuantity: number;
    warehouseId: string;
  };
};

const columns: ColumnDef<MovementRow>[] = [
  { accessorKey: "code", header: "İşlem Tipi" },
  { accessorKey: "name", header: "Açıklama" },
  {
    id: "productId",
    header: "Ürün",
    cell: ({ row }) => row.original.payload.productId ?? "-",
  },
  {
    id: "deltaQuantity",
    header: "Miktar",
    cell: ({ row }) => {
      const qty = row.original.payload.deltaQuantity ?? 0;
      const tone = qty < 0 ? "text-rose-300" : "text-emerald-300";
      return <span className={`font-bold ${tone}`}>{qty}</span>;
    },
  },
  {
    id: "warehouse",
    header: "Depo",
    cell: ({ row }) => row.original.payload.warehouseId ?? "-",
  },
  { accessorKey: "status", header: "Durum" },
];

export function StockMovementsClient() {
  const [rows, setRows] = React.useState<MovementRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tenant/inventory/stock-movements?limit=200", { cache: "no-store" });
      const body = (await response.json()) as { success: boolean; data: MovementRow[]; error?: { message?: string } };
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Stok hareketleri alınamadı.");
      }
      setRows(body.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stok hareketleri alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#1f3553] bg-[#0b1d35] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/panel/stok/stok-transfer"
              className="rounded-md border border-cyan-400/50 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/25"
            >
              Depo Transfer
            </Link>
            <Link
              href="/panel/stok/stok-sayim"
              className="rounded-md border border-[#29466b] bg-[#10243f] px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-[#153056]"
            >
              Stok Sayım
            </Link>
            <Button size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>
              Yenile
            </Button>
          </div>

          <p className="text-xs font-semibold text-slate-400">Toplam hareket: {rows.length}</p>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-rose-400/40 bg-rose-950/25 px-3 py-2 text-sm text-rose-100">{error}</p>
      ) : null}

      <div className="rounded-xl border border-[#1f3553] bg-[#0b1d35] p-3">
        {loading ? <p className="text-sm text-slate-400">Stok hareketleri yükleniyor...</p> : null}
        {!loading ? <DataTable columns={columns} data={rows} globalFilterPlaceholder="Ürün veya işlem tipi ara..." /> : null}
      </div>
    </div>
  );
}
