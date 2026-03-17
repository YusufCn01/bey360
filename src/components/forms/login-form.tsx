"use client";

import type { InputHTMLAttributes } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  tenantSlug: z.string().min(2, "Firma kodu zorunludur."),
  loginId: z.string().min(2, "Kullanıcı adı zorunludur."),
  password: z.string().min(8, "Şifre en az 8 karakter olmalıdır."),
});

const forgotSendSchema = z.object({
  tenantSlug: z.string().min(2, "Firma kodu zorunludur."),
  loginId: z.string().min(2, "Kullanıcı adı zorunludur."),
  gsmNumber: z.string().min(10, "GSM numarası zorunludur."),
});

const forgotResetSchema = z
  .object({
    otpCode: z.string().length(6, "SMS kodu 6 haneli olmalıdır."),
    newPassword: z.string().min(8, "Yeni şifre en az 8 karakter olmalıdır."),
    confirmPassword: z.string().min(8, "Şifre tekrarı zorunludur."),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Şifre tekrarı eşleşmiyor.",
      });
    }
  });

type LoginValues = z.infer<typeof loginSchema>;
type ForgotSendValues = z.infer<typeof forgotSendSchema>;
type ForgotResetValues = z.infer<typeof forgotResetSchema>;

type ApiErrorEnvelope = {
  success: false;
  error?: { message?: string };
};

type ForgotOtpResponse = {
  resetTokenId: string;
  expiresAt: string;
  maskedPhone: string;
  otpPreview?: string;
};

export type LoginAnnouncementItem = {
  id: string;
  title: string;
  message: string;
  tone: "info" | "success" | "warning" | "danger";
  isPinned?: boolean;
  publishAt?: string | null;
};

type LoginFormProps = {
  announcements: LoginAnnouncementItem[];
  appVersion: string;
};

function readApiErrorMessage(raw: unknown, fallback: string): string {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }
  const envelope = raw as ApiErrorEnvelope;
  const message = envelope.error?.message;
  return typeof message === "string" && message.trim().length > 0 ? message : fallback;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function Label({ children }: { children: string }) {
  return <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.08em] text-slate-700">{children}</label>;
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${props.className ?? ""}`}
    />
  );
}

function toneClass(tone: LoginAnnouncementItem["tone"]) {
  switch (tone) {
    case "success":
      return "border-emerald-400/45 bg-emerald-500/10 text-emerald-300";
    case "warning":
      return "border-amber-400/45 bg-amber-500/10 text-amber-300";
    case "danger":
      return "border-rose-400/45 bg-rose-500/10 text-rose-300";
    default:
      return "border-sky-400/40 bg-sky-500/10 text-sky-300";
  }
}

export function LoginForm({ announcements, appVersion }: LoginFormProps) {
  const router = useRouter();
  const desktopBridge =
    typeof window !== "undefined"
      ? (window as Window & {
          bey360Desktop?: {
            closeApp?: () => Promise<boolean>;
          };
        }).bey360Desktop
      : undefined;
  const [loginError, setLoginError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<"send" | "reset">("send");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotContext, setForgotContext] = useState<{
    tenantSlug: string;
    loginId: string;
    resetTokenId: string;
    expiresAt: string;
    maskedPhone: string;
    otpPreview?: string;
  } | null>(null);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      tenantSlug: "demo-market",
      loginId: "owner@demo.local",
      password: "Demo1234!",
    },
  });

  const forgotSendForm = useForm<ForgotSendValues>({
    resolver: zodResolver(forgotSendSchema),
    defaultValues: {
      tenantSlug: "demo-market",
      loginId: "",
      gsmNumber: "",
    },
  });

  const forgotResetForm = useForm<ForgotResetValues>({
    resolver: zodResolver(forgotResetSchema),
    defaultValues: {
      otpCode: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const loginBusy = loginForm.formState.isSubmitting;

  function openForgotModal() {
    setForgotOpen(true);
    setForgotStep("send");
    setForgotError(null);
    setForgotMessage(null);
    setForgotContext(null);
    forgotSendForm.reset({
      tenantSlug: loginForm.getValues("tenantSlug"),
      loginId: loginForm.getValues("loginId"),
      gsmNumber: "",
    });
    forgotResetForm.reset({
      otpCode: "",
      newPassword: "",
      confirmPassword: "",
    });
  }

  function closeForgotModal() {
    setForgotOpen(false);
    setForgotStep("send");
    setForgotError(null);
    setForgotMessage(null);
    setForgotBusy(false);
  }

  const submitLogin = loginForm.handleSubmit(async (values) => {
    setLoginError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...values,
        rememberMe,
      }),
    });

    if (!response.ok) {
      const raw = (await response.json().catch(() => null)) as unknown;
      setLoginError(readApiErrorMessage(raw, "Giriş yapılamadı. Bilgileri kontrol edin."));
      return;
    }

    router.push("/panel");
  });

  const submitForgotSend = forgotSendForm.handleSubmit(async (values) => {
    setForgotBusy(true);
    setForgotError(null);
    setForgotMessage(null);

    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const raw = (await response.json().catch(() => null)) as
        | { success: true; data: ForgotOtpResponse }
        | ApiErrorEnvelope
        | null;

      if (!response.ok || !raw || !("success" in raw) || raw.success !== true) {
        throw new Error(readApiErrorMessage(raw, "SMS kodu gönderilemedi."));
      }

      setForgotContext({
        tenantSlug: values.tenantSlug,
        loginId: values.loginId,
        resetTokenId: raw.data.resetTokenId,
        expiresAt: raw.data.expiresAt,
        maskedPhone: raw.data.maskedPhone,
        otpPreview: raw.data.otpPreview,
      });
      setForgotStep("reset");
      setForgotMessage("SMS doğrulama kodu gönderildi.");
    } catch (requestError) {
      setForgotError(requestError instanceof Error ? requestError.message : "SMS kodu gönderilemedi.");
    } finally {
      setForgotBusy(false);
    }
  });

  const submitForgotReset = forgotResetForm.handleSubmit(async (values) => {
    if (!forgotContext) {
      setForgotError("Önce SMS kodu almalısınız.");
      return;
    }

    setForgotBusy(true);
    setForgotError(null);
    setForgotMessage(null);

    try {
      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantSlug: forgotContext.tenantSlug,
          resetTokenId: forgotContext.resetTokenId,
          otpCode: values.otpCode,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
        }),
      });

      const raw = (await response.json().catch(() => null)) as
        | { success: true; data: { message: string } }
        | ApiErrorEnvelope
        | null;

      if (!response.ok || !raw || !("success" in raw) || raw.success !== true) {
        throw new Error(readApiErrorMessage(raw, "Şifre güncellenemedi."));
      }

      setForgotMessage(raw.data.message);
      loginForm.setValue("tenantSlug", forgotContext.tenantSlug);
      loginForm.setValue("loginId", forgotContext.loginId);

      setTimeout(() => {
        closeForgotModal();
      }, 900);
    } catch (requestError) {
      setForgotError(requestError instanceof Error ? requestError.message : "Şifre güncellenemedi.");
    } finally {
      setForgotBusy(false);
    }
  });

  async function handleCloseApp() {
    try {
      if (desktopBridge?.closeApp) {
        await desktopBridge.closeApp();
        return;
      }

      window.close();
      setTimeout(() => {
        window.location.href = "about:blank";
      }, 150);
    } catch {
      window.location.href = "about:blank";
    }
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[980px] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-[0_20px_70px_rgba(12,18,38,0.22)]">
        <div className="grid min-h-[620px] grid-cols-1 md:grid-cols-[360px_1fr]">
          <aside
            className="relative border-b border-slate-800 bg-[#102b47] p-6 text-white md:border-b-0 md:border-r"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(180deg, #113254 0%, #0e2a47 100%)",
              backgroundSize: "24px 24px, 24px 24px, cover",
            }}
          >
            <div className="mb-8 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded bg-white text-xl font-black text-[#12345a]">B</div>
              <div>
                <p className="text-4xl font-black leading-none">Bey360</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">ERP & POS COZUMLERI</p>
              </div>
            </div>

            <h2 className="text-3xl font-black text-white">Sistem Duyuruları</h2>
            <div className="mt-5 space-y-3">
              {announcements.map((item) => (
                <article key={item.id} className={`rounded-md border px-3 py-3 ${toneClass(item.tone)}`}>
                  <p className="text-sm font-black">
                    {item.tone === "success" ? "✓" : "ⓘ"} {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-200">{item.message}</p>
                </article>
              ))}
            </div>

            <div className="absolute bottom-6 left-6 right-6 border-t border-white/15 pt-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <p>
                  <span className="mr-1 text-emerald-400">●</span>
                  Sistem Durumu: Çevrimiçi
                </p>
                <p>Sürüm {appVersion}</p>
              </div>
            </div>
          </aside>

          <section className="bg-[#f8fafc] p-6 sm:p-8 md:p-10">
            <div className="mb-6 flex items-center justify-end gap-4 text-sm font-semibold text-slate-600">
              <button type="button" className="hover:text-slate-900">
                Türkçe
              </button>
              <button type="button" className="hover:text-slate-900">
                Destek
              </button>
              <button
                type="button"
                onClick={() => void handleCloseApp()}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Kapat
              </button>
            </div>

            <div className="mx-auto w-full max-w-[460px]">
              <h1 className="text-4xl font-black text-slate-900">Kullanıcı Girişi</h1>
              <p className="mt-2 text-sm font-medium text-slate-500">Lütfen firma kodu ve kullanıcı bilgilerinizi giriniz.</p>

              <form onSubmit={submitLogin} className="mt-6 space-y-4">
                <div>
                  <Label>Firma Kodu</Label>
                  <TextInput
                    {...loginForm.register("tenantSlug")}
                    placeholder="ORN: BEY360_MERKEZ"
                    autoComplete="organization"
                  />
                </div>

                <div>
                  <Label>Kullanıcı Adı</Label>
                  <TextInput
                    {...loginForm.register("loginId")}
                    placeholder="Kullanıcı adınızı girin"
                    autoComplete="username"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <Label>Şifre</Label>
                    <button
                      type="button"
                      onClick={openForgotModal}
                      className="text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                    >
                      Şifremi Unuttum
                    </button>
                  </div>
                  <div className="relative">
                    <TextInput
                      type={showPassword ? "text" : "password"}
                      {...loginForm.register("password")}
                      className="pr-16"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                      aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                    >
                      {showPassword ? "Gizle" : "Göster"}
                    </button>
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  Oturumu açık tut
                </label>

                {loginError ? (
                  <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{loginError}</p>
                ) : null}

                <Button
                  type="submit"
                  className="h-12 w-full rounded-md bg-[#1658d0] text-base font-black text-white hover:bg-[#1149af]"
                  disabled={loginBusy}
                >
                  {loginBusy ? "Giriş Yapılıyor..." : "Giriş Yap"}
                </Button>

                <div className="relative py-2 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  <span className="bg-[#f8fafc] px-3">Bey360 Ailesine Katılın</span>
                  <div className="absolute left-0 right-0 top-1/2 -z-10 border-t border-slate-200" />
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Link
                    href="/bayi-basvuru?tip=hesap"
                    className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-100"
                  >
                    Hesap Oluştur
                  </Link>
                  <Link
                    href="/bayi-basvuru"
                    className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-100"
                  >
                    Bayilik Başvurusu
                  </Link>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>

      {forgotOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-300 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-black text-slate-900">Şifremi Unuttum</p>
              <button
                type="button"
                onClick={closeForgotModal}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Kapat
              </button>
            </div>

            {forgotStep === "send" ? (
              <form onSubmit={submitForgotSend} className="space-y-3">
                <div>
                  <Label>Firma Kodu</Label>
                  <TextInput {...forgotSendForm.register("tenantSlug")} />
                </div>
                <div>
                  <Label>Kullanıcı Adı</Label>
                  <TextInput {...forgotSendForm.register("loginId")} placeholder="E-posta veya kullanıcı adı" />
                </div>
                <div>
                  <Label>GSM Numarası</Label>
                  <TextInput {...forgotSendForm.register("gsmNumber")} placeholder="05xx xxx xx xx" />
                </div>
                <Button type="submit" className="h-11 w-full text-base font-black" disabled={forgotBusy}>
                  {forgotBusy ? "Kod Gönderiliyor..." : "SMS Kod Gönder"}
                </Button>
              </form>
            ) : (
              <form onSubmit={submitForgotReset} className="space-y-3">
                <div className="rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900">
                  Kod gönderildi: {forgotContext?.maskedPhone}
                  <br />
                  Son geçerlilik: {forgotContext?.expiresAt ? formatDateTime(forgotContext.expiresAt) : "-"}
                  {forgotContext?.otpPreview ? (
                    <>
                      <br />
                      <span className="font-black">Geliştirme OTP: {forgotContext.otpPreview}</span>
                    </>
                  ) : null}
                </div>

                <div>
                  <Label>SMS Kodu</Label>
                  <TextInput {...forgotResetForm.register("otpCode")} placeholder="000000" maxLength={6} className="tracking-[0.25em]" />
                </div>
                <div>
                  <Label>Yeni Şifre</Label>
                  <TextInput type="password" {...forgotResetForm.register("newPassword")} />
                </div>
                <div>
                  <Label>Yeni Şifre Tekrar</Label>
                  <TextInput type="password" {...forgotResetForm.register("confirmPassword")} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11"
                    disabled={forgotBusy}
                    onClick={() => {
                      setForgotStep("send");
                      setForgotError(null);
                      setForgotMessage(null);
                    }}
                  >
                    Kodu Yeniden Al
                  </Button>
                  <Button type="submit" className="h-11" disabled={forgotBusy}>
                    {forgotBusy ? "Güncelleniyor..." : "Şifreyi Yenile"}
                  </Button>
                </div>
              </form>
            )}

            {forgotMessage ? (
              <p className="mt-3 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                {forgotMessage}
              </p>
            ) : null}
            {forgotError ? (
              <p className="mt-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{forgotError}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
