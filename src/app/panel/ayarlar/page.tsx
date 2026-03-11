import Link from "next/link";
import { CompanySettingsClient } from "@/app/panel/ayarlar/company-settings-client";

export default function SettingsPage() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] p-2">
        <Link
          href="/panel/ayarlar"
          className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-2 text-sm font-semibold"
        >
          Firma Ayarları
        </Link>
        <Link
          href="/panel/ayarlar/pos-ayarlar"
          className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-2 text-sm font-semibold"
        >
          POS Ayarları
        </Link>
        <Link
          href="/panel/ayarlar/e-fatura-ayarlar"
          className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-2 text-sm font-semibold"
        >
          e-Fatura Ayarları
        </Link>
        <Link
          href="/panel/ayarlar/entegrasyon-ayarlar"
          className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-2 text-sm font-semibold"
        >
          Entegrasyon Ayarları
        </Link>
        <Link
          href="/panel/ayarlar/yazici-ayarlar"
          className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-2 text-sm font-semibold"
        >
          Yazıcı Ayarları
        </Link>
        <Link
          href="/panel/ayarlar/sube-depo-yonetimi"
          className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-2 text-sm font-semibold"
        >
          Şube / Depo Yönetimi
        </Link>
        <Link
          href="/panel/ayarlar/sms-ayarlar"
          className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-2 text-sm font-semibold"
        >
          SMS Ayarları
        </Link>
        <Link
          href="/panel/ayarlar/duyuru-yonetimi"
          className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-2 text-sm font-semibold"
        >
          Duyuru Yönetimi
        </Link>
        <Link
          href="/panel/ayarlar/kredi-karti-takip"
          className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-2 text-sm font-semibold"
        >
          Kredi Kartı Takip
        </Link>
        <Link
          href="/panel/ayarlar/yedekleme"
          className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-2 text-sm font-semibold"
        >
          Yedekleme
        </Link>
      </div>

      <CompanySettingsClient />
    </div>
  );
}
