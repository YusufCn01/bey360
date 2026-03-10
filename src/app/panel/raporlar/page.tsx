import { ReportsClient } from "@/app/panel/raporlar/reports-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Raporlar ve KPI</CardTitle>
        <p className="text-sm text-slate-500">Satış, tahsilat, ödeme, stok ve kasa metriklerini anlık izleyin.</p>
      </CardHeader>
      <CardContent>
        <ReportsClient />
      </CardContent>
    </Card>
  );
}
