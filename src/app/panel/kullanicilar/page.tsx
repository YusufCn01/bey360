import { UsersRolesClient } from "@/app/panel/kullanicilar/users-roles-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UsersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kullanıcılar ve Yetkiler</CardTitle>
        <p className="text-sm text-slate-500">
          Tenant kullanıcı yönetimi, özel rol tanımı ve rol bazlı erişim kontrolü.
        </p>
      </CardHeader>
      <CardContent>
        <UsersRolesClient />
      </CardContent>
    </Card>
  );
}
