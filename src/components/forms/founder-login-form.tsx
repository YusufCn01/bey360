"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Envelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

type FounderLoginResult = {
  id: string;
  email: string;
  fullName: string;
  bootstrapped: boolean;
};

export function FounderLoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("founder@tekmarka.local");
  const [password, setPassword] = React.useState("Founder123!");
  const [fullName, setFullName] = React.useState("Kurucu");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/founder/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
        }),
      });

      const body = (await response.json()) as Envelope<FounderLoginResult>;
      if (!response.ok || !body.success || !body.data) {
        throw new Error(body.error?.message ?? "Kurucu girisi basarisiz.");
      }

      if (body.data.bootstrapped) {
        setMessage("Ilk kurucu hesabi olusturuldu. Giris yapiliyor...");
      }

      router.push("/kurucu");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Kurucu girisi basarisiz.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold">E-posta</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="w-full"
          autoComplete="username"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold">Sifre</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          className="w-full"
          autoComplete="current-password"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold">Kurucu Adi (Ilk kurulum icin)</label>
        <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full" />
      </div>

      {message ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Giris yapiliyor..." : "Kurucu Paneline Gir"}
      </Button>
    </form>
  );
}
