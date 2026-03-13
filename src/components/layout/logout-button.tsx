"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  endpoint?: string;
  redirectTo?: string;
  label?: string;
  className?: string;
};

type LogoutResult = {
  success?: boolean;
  data?: {
    message?: string;
  };
  error?: {
    message?: string;
  };
};

export function LogoutButton({
  endpoint = "/api/auth/logout",
  redirectTo = "/giris",
  label = "Çıkış",
  className,
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalTitle, setModalTitle] = React.useState("İşlem");
  const [modalMessage, setModalMessage] = React.useState("");
  const [successState, setSuccessState] = React.useState(false);

  async function handleLogout() {
    if (loading) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      let payload: LogoutResult | null = null;
      try {
        payload = (await response.json()) as LogoutResult;
      } catch {
        payload = null;
      }

      if (!response.ok || payload?.success === false) {
        const failMessage = payload?.error?.message || "Çıkış sırasında beklenmeyen bir hata oluştu.";
        throw new Error(failMessage);
      }

      const successMessage =
        payload?.data?.message || "Başarıyla çıkış yapıldı. Giriş ekranına yönlendiriliyorsunuz.";

      setModalTitle("Çıkış Başarılı");
      setModalMessage(successMessage);
      setSuccessState(true);
      setModalOpen(true);

      window.setTimeout(() => {
        router.replace(redirectTo);
        router.refresh();
      }, 900);
    } catch (error) {
      const failMessage =
        error instanceof Error ? error.message : "Çıkış sırasında beklenmeyen bir hata oluştu.";
      setModalTitle("Çıkış Hatası");
      setModalMessage(failMessage);
      setSuccessState(false);
      setModalOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={loading}
        className={cn(className, loading ? "cursor-not-allowed opacity-70" : "")}
      >
        {loading ? "Çıkış Yapılıyor..." : label}
      </button>

      {modalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3">
          <div className="w-full max-w-sm rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] p-4 shadow-2xl">
            <h3
              className={cn(
                "text-base font-black",
                successState ? "text-emerald-700" : "text-rose-700",
              )}
            >
              {modalTitle}
            </h3>
            <p className="mt-2 text-sm text-[color:var(--mx-text)]">{modalMessage}</p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md border border-[color:var(--mx-border)] px-3 py-2 text-sm font-semibold text-[color:var(--mx-text)] hover:bg-[color:var(--mx-surface-soft)]"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

