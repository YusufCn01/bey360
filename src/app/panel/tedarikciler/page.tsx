import { SuppliersClient } from "@/app/panel/tedarikciler/suppliers-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuppliersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tedarikçiler</CardTitle>
        <p className="text-sm text-slate-500">
          Tedarikçi kartları, risk limitleri ve alış cari başlangıç kayıtları bu ekrandan yönetilir.
        </p>
      </CardHeader>
      <CardContent>
        <SuppliersClient />
      </CardContent>
    </Card>
  );
}
