import { PaymentLinksClient } from "@/app/panel/odeme/payment-links-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentLinksPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ödeme Linkleri</CardTitle>
        <p className="text-sm text-slate-500">
          Tenant bazlı ödeme linki oluşturma, durum takibi, webhook güncellemesi ve cari/kasa bağlantısı.
        </p>
      </CardHeader>
      <CardContent>
        <PaymentLinksClient />
      </CardContent>
    </Card>
  );
}
