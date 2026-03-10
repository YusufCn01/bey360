"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/data-table";

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
    cell: ({ row }) => `${row.original.payload.deltaQuantity ?? 0}`,
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

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/tenant/inventory/stock-movementslimit=200");
        const body = (await response.json()) as { success: boolean; data: MovementRow[]; error: { message: string } };
        if (!response.ok || !body.success) {
          throw new Error(body.error.message ?? "Stok hareketleri alınamadı.");
        }
        setRows(body.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Stok hareketleri alınamadı.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Stok hareketleri yükleniyor...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-700">{error}</p>;
  }

  return <DataTable columns={columns} data={rows} globalFilterPlaceholder="Ürün veya işlem tipi ara..." />;
}
