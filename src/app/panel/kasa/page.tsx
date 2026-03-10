import { FinanceClient } from "@/app/panel/kasa/finance-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CashPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kasa / Banka / Tahsilat</CardTitle>
        <p className="text-sm text-slate-500">
          Günlük tahsilat, tedarikçi ödeme, kasalar arası transfer ve hareket bazlı finans takibi.
        </p>
      </CardHeader>
      <CardContent>
        <FinanceClient />
      </CardContent>
    </Card>
  );
}
