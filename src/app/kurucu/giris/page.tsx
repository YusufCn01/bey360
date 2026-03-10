import { redirect } from "next/navigation";
import { FounderLoginForm } from "@/components/forms/founder-login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFounderSessionFromCookies } from "@/lib/auth/founder-session";

export default async function FounderLoginPage() {
  const session = await getFounderSessionFromCookies();
  if (session) {
    redirect("/kurucu");
  }

  return (
    <div className="mx-panel-shell flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-[color:var(--mx-border-strong)]">
        <CardHeader className="bg-[linear-gradient(110deg,var(--mx-topbar-from),var(--mx-topbar-mid),var(--mx-topbar-to))] text-white">
          <CardTitle className="text-xl text-white">Bey360 Kurucu Paneli</CardTitle>
          <p className="text-sm text-cyan-100">Bayilik, lisans ve duyuru yonetimi</p>
        </CardHeader>
        <CardContent>
          <FounderLoginForm />
        </CardContent>
      </Card>
    </div>
  );
}

