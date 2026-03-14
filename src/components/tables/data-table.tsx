"use client";
/* eslint-disable react-hooks/incompatible-library */

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  globalFilterPlaceholder: string;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  globalFilterPlaceholder = "Ara...",
}: DataTableProps<TData, TValue>) {
  const [globalFilterInput, setGlobalFilterInput] = React.useState("");
  const globalFilter = React.useDeferredValue(globalFilterInput);

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  React.useEffect(() => {
    table.setPageSize(20);
  }, [table]);

  return (
    <div className="space-y-3">
      <input
        value={globalFilterInput}
        onChange={(event) => setGlobalFilterInput(event.target.value)}
        placeholder={globalFilterPlaceholder}
        className="w-full rounded-lg border border-[#29466b] bg-[#10243f] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
      />

      <div className="overflow-x-auto rounded-lg border border-[#29466b]">
        <table className="min-w-full divide-y divide-[#29466b] text-sm">
          <thead className="bg-[#10243f]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 text-left font-semibold text-slate-200">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-[#29466b] bg-[#0a203a]">
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#10243f]">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 text-slate-100">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-400">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-400">
          Sayfa {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
        </span>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Önceki
          </Button>
          <Button variant="secondary" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Sonraki
          </Button>
        </div>
      </div>
    </div>
  );
}
