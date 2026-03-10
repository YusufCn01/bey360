import Link from "next/link";
import { PosClient } from "../panel/pos/pos-client";
import { FullscreenToggleButton } from "@/app/pos/fullscreen-toggle-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getPlatformMaintenanceState } from "@/lib/platform/maintenance";

export default async function FullscreenPosPage() {
  const maintenance = await getPlatformMaintenanceState();

  return (
    <div className="mx-panel-shell min-h-screen p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] px-3 py-2">
        <p className="text-sm font-semibold text-[color:var(--mx-text)]">Tam Ekran POS</p>
        <div className="flex items-center gap-2">
          <FullscreenToggleButton />
          <ThemeToggle />
          <Link
            href="/panel"
            className="inline-flex h-9 items-center rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 text-sm font-semibold text-[color:var(--mx-text)]"
          >
            Panele Dön
          </Link>
        </div>
      </div>
      {maintenance.enabled ? (
        <section className="rounded-xl border border-rose-300 bg-rose-50 p-6 text-rose-900 shadow-sm">
          <h2 className="text-xl font-black">Bakım Modu Nedeniyle POS Kilitlendi</h2>
          <p className="mt-2 text-sm font-semibold">{maintenance.message}</p>
          <p className="mt-2 text-xs text-rose-700">
            Kurucu panelinden bakım modu kapatıldığında POS otomatik olarak tekrar açılacaktır.
          </p>
        </section>
      ) : (
        <PosClient />
      )}
    </div>
  );
}
