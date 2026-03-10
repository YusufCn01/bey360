"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";

type PermissionRow = {
  id: string;
  key: string;
  module: string;
  action: string;
  description: string | null;
};

type RolePermissionRow = {
  permission: PermissionRow;
};

type RoleRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: RolePermissionRow[];
};

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: Array<{ role: { id: string; code: string; name: string } }>;
};

type PermissionGroup = {
  module: string;
  permissions: PermissionRow[];
};

type PermissionSelectorProps = {
  groups: PermissionGroup[];
  selectedKeys: string[];
  onToggle: (permissionKey: string) => void;
  inputPrefix: string;
};

const userColumns: ColumnDef<UserRow>[] = [
  { accessorKey: "email", header: "E-posta" },
  {
    id: "name",
    header: "Ad Soyad",
    cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`,
  },
  {
    id: "roles",
    header: "Roller",
    cell: ({ row }) => row.original.roles.map((item) => item.role.name).join(", ") || "-",
  },
  { accessorKey: "status", header: "Durum" },
];

const roleColumns: ColumnDef<RoleRow>[] = [
  { accessorKey: "code", header: "Rol Kodu" },
  { accessorKey: "name", header: "Rol Adı" },
  {
    id: "permissions",
    header: "İzin Sayısı",
    cell: ({ row }) => row.original.permissions.length ?? 0,
  },
  {
    id: "isSystem",
    header: "Tip",
    cell: ({ row }) => (row.original.isSystem ? "Sistem" : "Özel"),
  },
];

function PermissionSelector({ groups, selectedKeys, onToggle, inputPrefix }: PermissionSelectorProps) {
  if (groups.length === 0) {
    return <p className="text-xs text-slate-500">İzin listesi bulunamadı.</p>;
  }

  return (
    <div className="max-h-56 space-y-3 overflow-auto rounded-lg border border-slate-200 bg-white p-3">
      {groups.map((group) => (
        <div key={group.module} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{group.module}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.permissions.map((permission) => {
              const inputId = `${inputPrefix}-${permission.id}`;
              const checked = selectedKeys.includes(permission.key);
              return (
                <label key={permission.id} htmlFor={inputId} className="flex items-start gap-2 rounded-md border border-slate-200 p-2 text-xs">
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(permission.key)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-medium text-slate-800">{permission.key}</span>
                    <span className="text-slate-500">{permission.action}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function extractPermissionKeys(role: RoleRow | undefined): string[] {
  if (!role?.permissions) {
    return [];
  }

  return role.permissions.map((row) => row.permission.key);
}

export function UsersRolesClient() {
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [roles, setRoles] = React.useState<RoleRow[]>([]);
  const [permissions, setPermissions] = React.useState<PermissionRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [savingRolePermissions, setSavingRolePermissions] = React.useState(false);

  const [userEmail, setUserEmail] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [password, setPassword] = React.useState("Demo1234!");
  const [selectedRoleId, setSelectedRoleId] = React.useState("");

  const [roleCode, setRoleCode] = React.useState("");
  const [roleName, setRoleName] = React.useState("");
  const [roleDescription, setRoleDescription] = React.useState("");
  const [createRolePermissionKeys, setCreateRolePermissionKeys] = React.useState<string[]>([]);

  const [editingRoleId, setEditingRoleId] = React.useState("");
  const [editingPermissionKeys, setEditingPermissionKeys] = React.useState<string[]>([]);

  const permissionGroups = React.useMemo(() => {
    const grouped = new Map<string, PermissionRow[]>();
    for (const permission of permissions) {
      const moduleKey = permission.module || "genel";
      const existing = grouped.get(moduleKey) ?? [];
      existing.push(permission);
      grouped.set(moduleKey, existing);
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b, "tr-TR"))
      .map(([module, values]) => ({
        module,
        permissions: values.sort((a, b) => a.key.localeCompare(b.key, "tr-TR")),
      }));
  }, [permissions]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        fetch("/api/tenant/users"),
        fetch("/api/tenant/roles?includePermissions=true"),
      ]);

      const usersBody = (await usersResponse.json()) as {
        success: boolean;
        data: UserRow[];
        error: { message: string };
      };
      const rolesBody = (await rolesResponse.json()) as {
        success: boolean;
        data: {
          roles: RoleRow[];
          permissions: PermissionRow[];
        };
        error: { message: string };
      };

      if (!usersResponse.ok || !usersBody.success) {
        throw new Error(usersBody.error.message ?? "Kullanıcılar alınamadı.");
      }
      if (!rolesResponse.ok || !rolesBody.success || !rolesBody.data) {
        throw new Error(rolesBody.error.message ?? "Roller alınamadı.");
      }

      const nextRoles = rolesBody.data.roles ?? [];
      setUsers(usersBody.data ?? []);
      setRoles(nextRoles);
      setPermissions(rolesBody.data.permissions ?? []);
      if (nextRoles.length > 0 && !editingRoleId) {
        setEditingRoleId(nextRoles[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veri alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [editingRoleId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!editingRoleId) {
      setEditingPermissionKeys([]);
      return;
    }

    const role = roles.find((item) => item.id === editingRoleId);
    setEditingPermissionKeys(extractPermissionKeys(role));
  }, [editingRoleId, roles]);

  function togglePermission(permissionKey: string, selectedKeys: string[], onChange: (keys: string[]) => void) {
    if (selectedKeys.includes(permissionKey)) {
      onChange(selectedKeys.filter((item) => item !== permissionKey));
      return;
    }

    onChange([...selectedKeys, permissionKey]);
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/tenant/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          firstName,
          lastName,
          password,
          roleIds: selectedRoleId ? [selectedRoleId] : undefined,
        }),
      });
      const body = (await response.json()) as { success: boolean; error: { message: string } };
      if (!response.ok || !body.success) {
        throw new Error(body.error.message ?? "Kullanıcı oluşturulamadı.");
      }

      setUserEmail("");
      setFirstName("");
      setLastName("");
      setPassword("Demo1234!");
      setSelectedRoleId("");
      setMessage("Kullanıcı oluşturuldu.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kullanıcı oluşturulamadı.");
    }
  }

  async function createRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/tenant/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: roleCode,
          name: roleName,
          description: roleDescription || undefined,
          permissionKeys: createRolePermissionKeys,
        }),
      });
      const body = (await response.json()) as { success: boolean; error: { message: string } };
      if (!response.ok || !body.success) {
        throw new Error(body.error.message ?? "Rol oluşturulamadı.");
      }

      setRoleCode("");
      setRoleName("");
      setRoleDescription("");
      setCreateRolePermissionKeys([]);
      setMessage("Rol oluşturuldu.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rol oluşturulamadı.");
    }
  }

  async function updatePermissions(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingRoleId) {
      setError("Lütfen bir rol seçin.");
      return;
    }

    setSavingRolePermissions(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/tenant/roles/${editingRoleId}/permissions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          permissionKeys: editingPermissionKeys,
        }),
      });
      const body = (await response.json()) as { success: boolean; error: { message: string } };
      if (!response.ok || !body.success) {
        throw new Error(body.error.message ?? "Rol izinleri güncellenemedi.");
      }

      setMessage("Rol izinleri güncellendi.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rol izinleri güncellenemedi.");
    } finally {
      setSavingRolePermissions(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <form onSubmit={createUser} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold">Yeni Kullanıcı</p>
          <input
            value={userEmail}
            onChange={(event) => setUserEmail(event.target.value)}
            placeholder="E-posta"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Ad"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Soyad"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Geçici şifre"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            type="password"
            required
          />
          <select
            value={selectedRoleId}
            onChange={(event) => setSelectedRoleId(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Rol Seç (Opsiyonel)</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <Button type="submit">Kullanıcı Ekle</Button>
        </form>

        <form onSubmit={createRole} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold">Yeni Rol</p>
          <input
            value={roleCode}
            onChange={(event) => setRoleCode(event.target.value)}
            placeholder="Rol Kodu (orn: satis-temsilcisi)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <input
            value={roleName}
            onChange={(event) => setRoleName(event.target.value)}
            placeholder="Rol Adı"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <textarea
            value={roleDescription}
            onChange={(event) => setRoleDescription(event.target.value)}
            placeholder="Açıklama"
            className="h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-700">Rol İzinleri</p>
            <PermissionSelector
              groups={permissionGroups}
              selectedKeys={createRolePermissionKeys}
              onToggle={(permissionKey) =>
                togglePermission(permissionKey, createRolePermissionKeys, setCreateRolePermissionKeys)
              }
              inputPrefix="create-role-permission"
            />
          </div>
          <Button type="submit" variant="secondary">
            Rol Ekle
          </Button>
        </form>

        <form onSubmit={updatePermissions} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold">Rol İzin Güncelle</p>
          <select
            value={editingRoleId}
            onChange={(event) => setEditingRoleId(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          >
            <option value="">Rol Seç</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <PermissionSelector
            groups={permissionGroups}
            selectedKeys={editingPermissionKeys}
            onToggle={(permissionKey) => togglePermission(permissionKey, editingPermissionKeys, setEditingPermissionKeys)}
            inputPrefix="edit-role-permission"
          />
          <Button type="submit" disabled={savingRolePermissions}>
            {savingRolePermissions ? "Kaydediliyor..." : "İzinleri Kaydet"}
          </Button>
        </form>
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Kullanıcı ve roller yükleniyor...</p> : null}

      {!loading ? (
        <>
          <DataTable columns={userColumns} data={users} globalFilterPlaceholder="Kullanıcı ara..." />
          <DataTable columns={roleColumns} data={roles} globalFilterPlaceholder="Rol ara..." />
        </>
      ) : null}
    </div>
  );
}
