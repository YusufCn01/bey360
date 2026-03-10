import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportTicketsClient } from "@/app/panel/destek/support-tickets-client";

export default function SupportTicketsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Destek Merkezi</CardTitle>
        <p className="text-sm text-slate-500">
          Teknik ve operasyonel taleplerinizi buradan iletip kurucu ekibin yanitlarini tek ekranda takip edebilirsiniz.
        </p>
      </CardHeader>
      <CardContent>
        <SupportTicketsClient />
      </CardContent>
    </Card>
  );
}
