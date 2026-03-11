import { ReportsClient } from "@/app/panel/raporlar/reports-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <Card className="border-[color:var(--mx-border-strong)]">
      <CardHeader>
        <CardTitle>Raporlar ve Canli Patron Ekrani</CardTitle>
        <p className="text-sm text-[color:var(--mx-text-muted)]">
          Satis, tahsilat, odeme, risk, sube ve kasiyer performansini tek ekranda anlik takip edin.
        </p>
      </CardHeader>
      <CardContent>
        <ReportsClient />
      </CardContent>
    </Card>
  );
}

