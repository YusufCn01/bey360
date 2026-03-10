import { SubscriptionClient } from "@/app/panel/abonelik/subscription-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SubscriptionPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Abonelik ve Paket Yönetimi</CardTitle>
        <p className="text-sm text-slate-500">
          Plan değişikliği, kullanım sayaçları, limitler ve faturalama dönemi yönetimi.
        </p>
      </CardHeader>
      <CardContent>
        <SubscriptionClient />
      </CardContent>
    </Card>
  );
}
