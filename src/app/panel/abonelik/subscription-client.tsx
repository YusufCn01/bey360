"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const plans = ["starter", "standard", "professional", "enterprise", "custom"] as const;

type SubscriptionSummary = {
  subscription: {
    code: string | null;
    status: string;
    payload: {
      billingCycle: string;
      startsAt: string;
      endsAt: string;
    };
  } | null;
  usage: Array<{
    key: string;
    value: number;
  }>;
  entitlements: Array<{
    key: string;
    value: string;
  }>;
};

export function SubscriptionClient() {
  const [summary, setSummary] = React.useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tenant/subscription/current");
      const body = (await response.json()) as {
        success: boolean;
        data: SubscriptionSummary;
        error: { message: string };
      };
      if (!response.ok || !body.success || !body.data) {
        throw new Error(body.error.message ?? "Abonelik özeti alınamadı.");
      }
      setSummary(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Abonelik özeti alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function changePlan(planCode: (typeof plans)[number], billingCycle: "monthly" | "yearly") {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/tenant/subscription/change-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planCode,
          billingCycle,
        }),
      });
      const body = (await response.json()) as { success: boolean; error: { message: string } };
      if (!response.ok || !body.success) {
        throw new Error(body.error.message ?? "Plan değiştirilemedi.");
      }

      setMessage(`Plan güncellendi: ${planCode.toUpperCase()} (${billingCycle})`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan değiştirilemedi.");
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Abonelik bilgileri yükleniyor...</p>;
  }

  if (!summary) {
    return <p className="text-sm text-rose-700">{error ?? "Abonelik bilgisi bulunamadı."}</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Mevcut Paket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-slate-700">
          <p>Plan: {(summary.subscription?.code ?? "tanımsız").toUpperCase()}</p>
          <p>Durum: {summary.subscription?.status ?? "yok"}</p>
          <p>Dönem: {summary.subscription?.payload?.billingCycle ?? "-"}</p>
          <p>Başlangıç: {summary.subscription?.payload?.startsAt ?? "-"}</p>
          <p>Bitiş: {summary.subscription?.payload?.endsAt ?? "-"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan Değiştir</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {plans.map((plan) => (
              <div key={plan} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold uppercase">{plan}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => changePlan(plan, "monthly")}>
                    Aylık
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => changePlan(plan, "yearly")}>
                    Yıllık
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kullanım ve Limitler</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-sm font-semibold">Kullanım Sayaçları</p>
            <ul className="space-y-1 text-sm text-slate-700">
              {summary.usage.length === 0 ? <li>Kayıt yok.</li> : null}
              {summary.usage.map((row) => (
                <li key={row.key}>
                  {row.key}: {row.value}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-sm font-semibold">Entitlement Limitleri</p>
            <ul className="space-y-1 text-sm text-slate-700">
              {summary.entitlements.length === 0 ? <li>Kayıt yok.</li> : null}
              {summary.entitlements.map((row) => (
                <li key={row.key}>
                  {row.key}: {row.value}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
