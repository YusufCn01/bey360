import { StockMovementsClient } from "@/app/panel/stok/stock-movements-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InventoryPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stok Hareketleri</CardTitle>
        <p className="text-sm text-slate-500">Satış, iade, açılış, sayım ve transfer kaynaklı stok hareketleri burada izlenir.</p>
      </CardHeader>
      <CardContent>
        <StockMovementsClient />
      </CardContent>
    </Card>
  );
}
