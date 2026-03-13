import { PosClient } from "../panel/pos/pos-client";
import { getPlatformMaintenanceState } from "@/lib/platform/maintenance";
import { PANEL_MODULE_LABELS } from "@/lib/subscription/module-access";
import { getTenantContext } from "@/lib/tenant/context";
import { getCurrentSubscription, getTenantModuleAccess } from "@/modules/subscription/application/subscription-service";

export const dynamic = "force-dynamic";

export default async function FullscreenPosPage() {
  const [maintenance, tenant] = await Promise.all([getPlatformMaintenanceState(), getTenantContext()]);

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

  const subscription = await getCurrentSubscription(tenant.tenantId);
  const moduleAccess = await getTenantModuleAccess(tenant.tenantId, subscription?.code ?? null);
  if (!moduleAccess.pos) {
    return (
      <section className="m-3 rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900 shadow-sm">
        <h2 className="text-xl font-black">Bu Modül Lisans Paketinde Kapalı</h2>
        <p className="mt-2 text-sm font-semibold">{PANEL_MODULE_LABELS.pos} modülü firma lisansında açık değil.</p>
        <p className="mt-2 text-xs text-amber-700">
          Kurucu panelinden modül yetkisini açtıktan sonra POS ekranı otomatik olarak erişilebilir olur.
        </p>
      </section>
    );
  }

  return <PosClient />;
}
