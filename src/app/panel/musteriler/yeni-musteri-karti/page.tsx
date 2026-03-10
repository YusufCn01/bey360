import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewCustomerForm } from "@/app/panel/musteriler/new-customer-form";

export default function NewCustomerPage() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Yeni Müşteri Kartı</CardTitle>
          <Link
            href="/panel/musteriler"
            className="rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-3 py-2 text-sm font-semibold"
          >
            Müşteri Listesine Dön
          </Link>
        </div>
        <p className="text-sm text-[color:var(--mx-text-muted)]">
          Cari müşteri kaydı, risk limiti, vade ve iletişim bilgilerini tek ekranda yönetin.
        </p>
      </CardHeader>
      <CardContent>
        <NewCustomerForm />
      </CardContent>
    </Card>
  );
}
