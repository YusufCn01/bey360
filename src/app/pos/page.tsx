import { PosClient } from "../panel/pos/pos-client";
import { getPlatformMaintenanceState } from "@/lib/platform/maintenance";

export const dynamic = "force-dynamic";

export default async function FullscreenPosPage() {
  const maintenance = await getPlatformMaintenanceState();

  if (maintenance.enabled) {
    return (
      <section className="m-3 rounded-xl border border-rose-300 bg-rose-50 p-6 text-rose-900 shadow-sm">
        <h2 className="text-xl font-black">Bakım Modu Nedeniyle POS Kilitlendi</h2>
        <p className="mt-2 text-sm font-semibold">{maintenance.message}</p>
        <p className="mt-2 text-xs text-rose-700">
          Kurucu panelinden bakım modu kapatıldığında POS otomatik olarak tekrar açılacaktır.
        </p>
      </section>
    );
  }

  return <PosClient />;
}
