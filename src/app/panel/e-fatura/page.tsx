import { EInvoiceClient } from "@/app/panel/e-fatura/einvoice-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EInvoicePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>e-Fatura Operasyon Merkezi</CardTitle>
        <p className="text-sm text-slate-500">
          e-Fatura ve e-Arşiv belgelerini tenant bazlı listeleyin, kuyruğa alın ve durum senkronizasyonu yapın.
        </p>
      </CardHeader>
      <CardContent>
        <EInvoiceClient />
      </CardContent>
    </Card>
  );
}
