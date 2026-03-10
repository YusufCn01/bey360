"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type CreateCustomerPayload = {
  code?: string;
  name: string;
  taxNumber?: string;
  identityNumber?: string;
  email?: string;
  phone?: string;
  riskLimit?: number;
  maturityDays?: number;
  group?: string;
  subgroup?: string;
  notes?: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

type CustomerCreateResponse = {
  id: string;
  code: string | null;
  name: string | null;
};

type NewCustomerFormProps = {
  redirectAfterSave?: boolean;
};

type CustomerFormState = {
  code: string;
  name: string;
  taxNumber: string;
  identityNumber: string;
  email: string;
  phone: string;
  riskLimit: string;
  maturityDays: string;
  group: string;
  subgroup: string;
  notes: string;
};

const initialState: CustomerFormState = {
  code: "",
  name: "",
  taxNumber: "",
  identityNumber: "",
  email: "",
  phone: "",
  riskLimit: "0",
  maturityDays: "0",
  group: "",
  subgroup: "",
  notes: "",
};

function toOptionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toOptionalNonNegativeNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return Math.max(0, parsed);
}

export function NewCustomerForm({ redirectAfterSave = false }: NewCustomerFormProps) {
  const router = useRouter();
  const [form, setForm] = React.useState<CustomerFormState>(initialState);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [createdCode, setCreatedCode] = React.useState<string | null>(null);

  function patch<K extends keyof CustomerFormState>(key: K, value: CustomerFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    setCreatedCode(null);

    const name = form.name.trim();
    if (name.length < 2) {
      setSaving(false);
      setError("Müşteri adı en az 2 karakter olmalıdır.");
      return;
    }

    const payload: CreateCustomerPayload = {
      code: toOptionalText(form.code),
      name,
      taxNumber: toOptionalText(form.taxNumber),
      identityNumber: toOptionalText(form.identityNumber),
      email: toOptionalText(form.email),
      phone: toOptionalText(form.phone),
      riskLimit: toOptionalNonNegativeNumber(form.riskLimit),
      maturityDays: toOptionalNonNegativeNumber(form.maturityDays),
      group: toOptionalText(form.group),
      subgroup: toOptionalText(form.subgroup),
      notes: toOptionalText(form.notes),
    };

    try {
      const response = await fetch("/api/tenant/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as ApiEnvelope<CustomerCreateResponse>;
      if (!response.ok || !body.success || !body.data) {
        throw new Error(body.error?.message ?? "Müşteri kaydedilemedi.");
      }

      setCreatedCode(body.data.code ?? null);
      setMessage("Müşteri kartı oluşturuldu.");
      setForm(initialState);

      if (redirectAfterSave) {
        setTimeout(() => {
          router.push("/panel/musteriler");
          router.refresh();
        }, 500);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Müşteri kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={saveCustomer} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-semibold">Müşteri Kodu (Opsiyonel)</label>
          <input
            value={form.code}
            onChange={(event) => patch("code", event.target.value)}
            placeholder="Boş bırakılırsa otomatik üretilir"
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-semibold">Müşteri Adı / Ünvanı</label>
          <input
            value={form.name}
            onChange={(event) => patch("name", event.target.value)}
            placeholder="Örn: Örnek Market Gıda Ltd. Şti."
            required
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-semibold">Vergi No</label>
          <input value={form.taxNumber} onChange={(event) => patch("taxNumber", event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">T.C. Kimlik No</label>
          <input value={form.identityNumber} onChange={(event) => patch("identityNumber", event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Telefon</label>
          <input value={form.phone} onChange={(event) => patch("phone", event.target.value)} placeholder="05xx xxx xx xx" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">E-posta</label>
          <input type="email" value={form.email} onChange={(event) => patch("email", event.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-semibold">Risk Limiti (TL)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.riskLimit}
            onChange={(event) => patch("riskLimit", event.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Vade (Gün)</label>
          <input
            type="number"
            min={0}
            step={1}
            value={form.maturityDays}
            onChange={(event) => patch("maturityDays", event.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Müşteri Grubu</label>
          <input value={form.group} onChange={(event) => patch("group", event.target.value)} placeholder="Perakende / Toptan" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Alt Grup</label>
          <input value={form.subgroup} onChange={(event) => patch("subgroup", event.target.value)} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold">Notlar</label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(event) => patch("notes", event.target.value)}
          placeholder="Cari müşteri için özel notlar"
        />
      </div>

      {message ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
          {createdCode ? ` | Kod: ${createdCode}` : ""}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setForm(initialState);
            setError(null);
            setMessage(null);
            setCreatedCode(null);
          }}
          disabled={saving}
        >
          Formu Temizle
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Kaydediliyor..." : "Müşteri Kartını Kaydet"}
        </Button>
      </div>
    </form>
  );
}
