import { AuditClient } from "@/app/panel/islem-gecmisi/audit-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuditHistoryPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>İşlem Geçmişi</CardTitle>
        <p className="text-sm text-slate-500">Kritik işlemler, kullanıcı hareketleri ve güvenlik olaylarının denetim kaydı.</p>
      </CardHeader>
      <CardContent>
        <AuditClient />
      </CardContent>
    </Card>
  );
}
