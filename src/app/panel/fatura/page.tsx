import { InvoiceClient } from "@/app/panel/fatura/invoice-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvoicePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fatura ve e-Belge İşlemleri</CardTitle>
        <p className="text-sm text-slate-500">
          Satış/alış faturası, numara serisi, e-Arşiv/e-Fatura taslakları ve belge yaşam döngüsü.
        </p>
      </CardHeader>
      <CardContent>
        <InvoiceClient />
      </CardContent>
    </Card>
  );
}
