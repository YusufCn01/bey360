"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type UnitKind = "branch" | "warehouse";

type OrgUnit = {
  id: string;
  code: string;
  name: string;
  description: string;
  status: string;
  branchId: string;
  address: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { message?: string };
};

type UnitFormState = {
  code: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  branchId: string;
};

const emptyForm: UnitFormState = {
  code: "",
  name: "",
  description: "",
  address: "",
  phone: "",
  branchId: "",
};

function badgeClass(status: string) {
  if (status === "active") {
    return "border-emerald-300 bg-emerald-50 text-emerald-700";
  }
  return "border-amber-300 bg-amber-50 text-amber-700";
}

async function requestApi<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.method && init.method !== "GET" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers,
  });
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !body || !body.success) {
    throw new Error(body?.error?.message ?? "İşlem sırasında hata oluştu.");
  }
  return body.data;
}

function UnitTable({
  title,
  rows,
  showBranch = false,
  branchNameById,
  onToggleStatus,
}: {
  title: string;
  rows: OrgUnit[];
  showBranch?: boolean;
  branchNameById: Map<string, string>;
  onToggleStatus: (row: OrgUnit) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[color:var(--mx-border)] text-xs uppercase tracking-[0.12em] text-[color:var(--mx-text-muted)]">
              <th className="px-2 py-2">Kod</th>
              <th className="px-2 py-2">Ad</th>
              {showBranch ? <th className="px-2 py-2">Bağlı Şube</th> : null}
              <th className="px-2 py-2">Telefon</th>
              <th className="px-2 py-2">Durum</th>
              <th className="px-2 py-2 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={showBranch ? 6 : 5} className="px-2 py-4 text-sm text-[color:var(--mx-text-muted)]">
                  Kayıt bulunamadı.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[color:var(--mx-border)]/60">
                <td className="px-2 py-2 font-semibold">{row.code}</td>
                <td className="px-2 py-2">
                  <p className="font-semibold">{row.name}</p>
                  {row.description ? <p className="text-xs text-[color:var(--mx-text-muted)]">{row.description}</p> : null}
                </td>
                {showBranch ? (
                  <td className="px-2 py-2">
                    {row.branchId ? branchNameById.get(row.branchId) ?? row.branchId : "-"}
                  </td>
                ) : null}
                <td className="px-2 py-2">{row.phone || "-"}</td>
                <td className="px-2 py-2">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClass(row.status)}`}>
                    {row.status === "active" ? "Aktif" : "Pasif"}
                  </span>
                </td>
                <td className="px-2 py-2 text-right">
                  <Button size="sm" variant="secondary" onClick={() => onToggleStatus(row)}>
                    {row.status === "active" ? "Pasif Yap" : "Aktif Yap"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function OrganizationUnitsClient() {
  const [branches, setBranches] = React.useState<OrgUnit[]>([]);
  const [warehouses, setWarehouses] = React.useState<OrgUnit[]>([]);
  const [branchForm, setBranchForm] = React.useState<UnitFormState>(emptyForm);
  const [warehouseForm, setWarehouseForm] = React.useState<UnitFormState>(emptyForm);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const branchNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const item of branches) {
      map.set(item.id, `${item.code} - ${item.name}`);
    }
    return map;
  }, [branches]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [branchRows, warehouseRows] = await Promise.all([
        requestApi<OrgUnit[]>("/api/tenant/organization/units?kind=branch&limit=500"),
        requestApi<OrgUnit[]>("/api/tenant/organization/units?kind=warehouse&limit=500"),
      ]);
      setBranches(branchRows);
      setWarehouses(warehouseRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Şube/depo listeleri alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function patchForm(
    target: "branch" | "warehouse",
    key: keyof UnitFormState,
    value: string,
  ) {
    if (target === "branch") {
      setBranchForm((prev) => ({ ...prev, [key]: value }));
      return;
    }
    setWarehouseForm((prev) => ({ ...prev, [key]: value }));
  }

  async function createUnit(kind: UnitKind, form: UnitFormState) {
    if (!form.name.trim()) {
      setError(kind === "branch" ? "Şube adı zorunludur." : "Depo adı zorunludur.");
      return;
    }

    if (kind === "warehouse" && !form.branchId.trim()) {
      setError("Depo eklemek için bağlı şube seçmelisiniz.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await requestApi<OrgUnit>("/api/tenant/organization/units", {
        method: "POST",
        body: JSON.stringify({
          kind,
          code: form.code || undefined,
          name: form.name,
          description: form.description || undefined,
          address: form.address || undefined,
          phone: form.phone || undefined,
          branchId: kind === "warehouse" ? form.branchId : undefined,
          status: "active",
        }),
      });

      if (kind === "branch") {
        setBranchForm(emptyForm);
      } else {
        setWarehouseForm(emptyForm);
      }
      setMessage(kind === "branch" ? "Şube eklendi." : "Depo eklendi.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Kayıt eklenemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(kind: UnitKind, row: OrgUnit) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await requestApi<OrgUnit>("/api/tenant/organization/units", {
        method: "PATCH",
        body: JSON.stringify({
          id: row.id,
          kind,
          status: row.status === "active" ? "passive" : "active",
        }),
      });
      setMessage(`${kind === "branch" ? "Şube" : "Depo"} durumu güncellendi.`);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Durum güncellenemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Şube / Depo Yönetimi</CardTitle>
            <p className="text-sm text-[color:var(--mx-text-muted)]">
              Şube ve depoları bu ekrandan ekleyebilir, pasif/aktif yapabilirsiniz.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading || busy}>
            Yenile
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}
          {message ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yeni Şube Ekle</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <input
              value={branchForm.code}
              onChange={(event) => patchForm("branch", "code", event.target.value)}
              placeholder="Şube kodu (opsiyonel)"
              className="rounded-lg border border-[color:var(--mx-border)] px-3 py-2 text-sm"
            />
            <input
              value={branchForm.name}
              onChange={(event) => patchForm("branch", "name", event.target.value)}
              placeholder="Şube adı"
              className="rounded-lg border border-[color:var(--mx-border)] px-3 py-2 text-sm"
            />
            <input
              value={branchForm.phone}
              onChange={(event) => patchForm("branch", "phone", event.target.value)}
              placeholder="Telefon"
              className="rounded-lg border border-[color:var(--mx-border)] px-3 py-2 text-sm"
            />
            <input
              value={branchForm.address}
              onChange={(event) => patchForm("branch", "address", event.target.value)}
              placeholder="Adres"
              className="rounded-lg border border-[color:var(--mx-border)] px-3 py-2 text-sm"
            />
            <textarea
              value={branchForm.description}
              onChange={(event) => patchForm("branch", "description", event.target.value)}
              placeholder="Açıklama"
              className="min-h-24 rounded-lg border border-[color:var(--mx-border)] px-3 py-2 text-sm"
            />
            <Button onClick={() => void createUnit("branch", branchForm)} disabled={busy}>
              Şubeyi Kaydet
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yeni Depo Ekle</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <select
              value={warehouseForm.branchId}
              onChange={(event) => patchForm("warehouse", "branchId", event.target.value)}
              className="rounded-lg border border-[color:var(--mx-border)] px-3 py-2 text-sm"
            >
              <option value="">Bağlı şube seçin</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.code} - {branch.name}
                </option>
              ))}
            </select>
            <input
              value={warehouseForm.code}
              onChange={(event) => patchForm("warehouse", "code", event.target.value)}
              placeholder="Depo kodu (opsiyonel)"
              className="rounded-lg border border-[color:var(--mx-border)] px-3 py-2 text-sm"
            />
            <input
              value={warehouseForm.name}
              onChange={(event) => patchForm("warehouse", "name", event.target.value)}
              placeholder="Depo adı"
              className="rounded-lg border border-[color:var(--mx-border)] px-3 py-2 text-sm"
            />
            <input
              value={warehouseForm.phone}
              onChange={(event) => patchForm("warehouse", "phone", event.target.value)}
              placeholder="Telefon"
              className="rounded-lg border border-[color:var(--mx-border)] px-3 py-2 text-sm"
            />
            <input
              value={warehouseForm.address}
              onChange={(event) => patchForm("warehouse", "address", event.target.value)}
              placeholder="Adres"
              className="rounded-lg border border-[color:var(--mx-border)] px-3 py-2 text-sm"
            />
            <textarea
              value={warehouseForm.description}
              onChange={(event) => patchForm("warehouse", "description", event.target.value)}
              placeholder="Açıklama"
              className="min-h-24 rounded-lg border border-[color:var(--mx-border)] px-3 py-2 text-sm"
            />
            <Button onClick={() => void createUnit("warehouse", warehouseForm)} disabled={busy}>
              Depoyu Kaydet
            </Button>
          </CardContent>
        </Card>
      </div>

      {loading ? <p className="text-sm text-[color:var(--mx-text-muted)]">Listeler yükleniyor...</p> : null}

      <div className="grid gap-4">
        <UnitTable
          title="Şubeler"
          rows={branches}
          branchNameById={branchNameById}
          onToggleStatus={(row) => void toggleStatus("branch", row)}
        />
        <UnitTable
          title="Depolar"
          rows={warehouses}
          showBranch
          branchNameById={branchNameById}
          onToggleStatus={(row) => void toggleStatus("warehouse", row)}
        />
      </div>
    </div>
  );
}
