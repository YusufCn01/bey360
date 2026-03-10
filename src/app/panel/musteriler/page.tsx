import { CustomersClient } from "@/app/panel/musteriler/customers-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CustomersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Müşteri Kartları</CardTitle>
        <p className="text-sm text-[color:var(--mx-text-muted)]">
          Kayıtlı müşterileri listeleyin, yeni müşteri kartı açın ve cari bilgileri yönetin.
        </p>
      </CardHeader>
      <CardContent>
        <CustomersClient />
      </CardContent>
    </Card>
  );
}
