"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

type DealerApplicationResponse = {
  applicationId: string;
  applicationNumber: string;
  status: string;
  submittedAt: string;
};

type FormState = {
  companyName: string;
  tradeName: string;
  taxNumber: string;
  contactFirstName: string;
  contactLastName: string;
  contactTitle: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  address: string;
  requestedPlan: "starter" | "standard" | "professional" | "enterprise" | "custom";
  branchCount: string;
  monthlySalesTarget: string;
  note: string;
};

const initialFormState: FormState = {
  companyName: "",
  tradeName: "",
  taxNumber: "",
  contactFirstName: "",
  contactLastName: "",
  contactTitle: "",
  phone: "",
  email: "",
  city: "",
  district: "",
  address: "",
  requestedPlan: "starter",
  branchCount: "1",
  monthlySalesTarget: "",
  note: "",
};

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function DealerApplicationForm() {
  const [form, setForm] = React.useState<FormState>(initialFormState);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<DealerApplicationResponse | null>(null);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/public/dealer-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName: form.companyName,
          tradeName: form.tradeName || undefined,
          taxNumber: form.taxNumber,
          contactFirstName: form.contactFirstName,
          contactLastName: form.contactLastName,
          contactTitle: form.contactTitle || undefined,
          phone: form.phone,
          email: form.email,
          city: form.city,
          district: form.district || undefined,
          address: form.address || undefined,
          requestedPlan: form.requestedPlan,
          branchCount: Number(form.branchCount || 1),
          monthlySalesTarget: form.monthlySalesTarget ? Number(form.monthlySalesTarget.replace(",", ".")) : undefined,
          note: form.note || undefined,
        }),
      });

      const body = (await response.json().catch(() => null)) as ApiEnvelope<DealerApplicationResponse> | null;
      if (!response.ok || !body?.success || !body.data) {
        throw new Error(body?.error?.message ?? "BaÅŸvuru gÃ¶nderilemedi.");
      }

      setResult(body.data);
      setForm(initialFormState);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "BaÅŸvuru gÃ¶nderilemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] rounded-[28px] border border-[#4e5ca5]/50 bg-[#25336f]/85 p-6 text-white shadow-[0_30px_90px_rgba(8,16,52,0.55)] backdrop-blur-sm md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[34px] font-black uppercase tracking-[0.06em] text-white">Bayi BaÅŸvuru Formu</p>
          <p className="text-sm font-semibold text-[#b8c1f0]">Bey360 ekibine baÅŸvurunuzu iletin, ekibimiz size hÄ±zlÄ±ca dÃ¶nÃ¼ÅŸ yapsÄ±n.</p>
        </div>
        <Link
          href="/giris"
          className="rounded-xl border border-[#5f71bd] bg-[#3a4a88] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#485a9a]"
        >
          GiriÅŸ EkranÄ±na DÃ¶n
        </Link>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Firma AdÄ±</label>
            <input
              className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
              value={form.companyName}
              onChange={(event) => patch("companyName", event.target.value)}
              placeholder="Ã–rn: Bey360 MarketÃ§ilik A.Å."
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Ticari Ad</label>
            <input
              className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
              value={form.tradeName}
              onChange={(event) => patch("tradeName", event.target.value)}
              placeholder="Ã–rn: Bey360"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Vergi No</label>
            <input
              className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
              value={form.taxNumber}
              onChange={(event) => patch("taxNumber", event.target.value)}
              placeholder="10-11 hane"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Yetkili AdÄ±</label>
            <input
              className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
              value={form.contactFirstName}
              onChange={(event) => patch("contactFirstName", event.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Yetkili SoyadÄ±</label>
            <input
              className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
              value={form.contactLastName}
              onChange={(event) => patch("contactLastName", event.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">GÃ¶revi</label>
            <input
              className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
              value={form.contactTitle}
              onChange={(event) => patch("contactTitle", event.target.value)}
              placeholder="Ã–rn: Ä°ÅŸletme Sahibi"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Telefon</label>
            <input
              className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
              value={form.phone}
              onChange={(event) => patch("phone", event.target.value)}
              placeholder="05xx xxx xx xx"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">E-posta</label>
            <input
              type="email"
              className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
              value={form.email}
              onChange={(event) => patch("email", event.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Ä°l</label>
            <input
              className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
              value={form.city}
              onChange={(event) => patch("city", event.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Ä°lÃ§e</label>
            <input
              className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
              value={form.district}
              onChange={(event) => patch("district", event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Talep PlanÄ±</label>
            <select
              className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold text-white"
              value={form.requestedPlan}
              onChange={(event) => patch("requestedPlan", event.target.value as FormState["requestedPlan"])}
            >
              <option value="starter">Starter</option>
              <option value="standard">Standard</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Åube SayÄ±sÄ±</label>
            <input
              type="number"
              min={1}
              max={200}
              className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
              value={form.branchCount}
              onChange={(event) => patch("branchCount", event.target.value)}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">AylÄ±k Ciro Hedefi (TL)</label>
            <input
              type="number"
              min={0}
              className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
              value={form.monthlySalesTarget}
              onChange={(event) => patch("monthlySalesTarget", event.target.value)}
              placeholder="Opsiyonel"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Adres</label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 py-3 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
            value={form.address}
            onChange={(event) => patch("address", event.target.value)}
            placeholder="AÃ§Ä±k adres"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Ek Not</label>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 py-3 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
            value={form.note}
            onChange={(event) => patch("note", event.target.value)}
            placeholder="Operasyon tÃ¼rÃ¼, kasa sayÄ±sÄ±, e-ticaret ihtiyacÄ± vb."
          />
        </div>

        {result ? (
          <div className="rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
            BaÅŸvurunuz alÄ±ndÄ±. BaÅŸvuru No: <span className="font-black">{result.applicationNumber}</span>
            <br />
            KayÄ±t ZamanÄ±: {formatDate(result.submittedAt)}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-300/50 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">{error}</div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="h-12 rounded-xl border border-[#4f5fab] bg-[#3a467f] px-6 text-white hover:bg-[#4a588f]"
            disabled={submitting}
            onClick={() => {
              setForm(initialFormState);
              setError(null);
              setResult(null);
            }}
          >
            Formu Temizle
          </Button>
          <Button type="submit" className="h-12 rounded-xl bg-emerald-600 px-7 text-base font-black text-white hover:bg-emerald-500" disabled={submitting}>
            {submitting ? "BaÅŸvuru GÃ¶nderiliyor..." : "BaÅŸvuruyu GÃ¶nder"}
          </Button>
        </div>
      </form>
    </div>
  );
}

