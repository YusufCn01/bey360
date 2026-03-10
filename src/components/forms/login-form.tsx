"use client";

import type { InputHTMLAttributes } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  tenantSlug: z.string().min(2, "Şirket alanı zorunludur."),
  loginId: z.string().min(2, "Kullanıcı bilgisi zorunludur."),
  password: z.string().min(8, "Şifre en az 8 karakter olmalıdır."),
});

const demoSchema = z.object({
  gsmNumber: z.string().min(10, "GSM numarası zorunludur."),
  companyYear: z.number().int().min(2000).max(2100),
  companyName: z.string().min(2, "Şirket adı zorunludur."),
  username: z
    .string()
    .min(2, "Kullanıcı adı zorunludur.")
    .regex(/^[a-zA-Z0-9._-]+$/, "Kullanıcı adı yalnızca harf, rakam, nokta, alt çizgi ve tire içerebilir."),
  password: z.string().min(8, "Şifre en az 8 karakter olmalıdır."),
});

const forgotSendSchema = z.object({
  tenantSlug: z.string().min(2, "Şirket alanı zorunludur."),
  loginId: z.string().min(2, "Kullanıcı bilgisi zorunludur."),
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
type DemoValues = z.infer<typeof demoSchema>;
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

const features = [
  "Hızlı satış, ön muhasebe ve stok yönetimi tek panelde",
  "Çoklu şube ve depo yapısı ile ölçeklenebilir kullanım",
  "Dokunmatik kasalara uygun modern POS altyapısı",
  "e-Fatura, e-Arşiv ve raporlama süreçlerinde hazır akışlar",
  "Rol bazlı yetki ve güvenli audit altyapısı",
];

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

function FieldLabel({ children }: { children: string }) {
  return <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-[0.08em] text-[#91a4e6]">{children}</label>;
}

function FieldInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-xl border border-[#3b4e95] bg-[#1f2c66] px-4 text-sm font-semibold text-[#eaf0ff] placeholder:text-[#7f92d1] outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 ${props.className ?? ""}`}
    />
  );
}

export function LoginForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "demo">("login");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoSuccess, setDemoSuccess] = useState<string | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);

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

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      tenantSlug: "demo-market",
      loginId: "owner@demo.local",
      password: "Demo1234!",
    },
  });

  const demoForm = useForm<DemoValues>({
    resolver: zodResolver(demoSchema),
    defaultValues: {
      gsmNumber: "",
      companyYear: currentYear,
      companyName: "",
      username: "admin",
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
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const raw = (await response.json().catch(() => null)) as unknown;
      setLoginError(readApiErrorMessage(raw, "Giriş yapılamadı. Bilgileri kontrol edin."));
      return;
    }

    router.push("/panel");
  });

  const submitDemo = demoForm.handleSubmit(async (values) => {
    setDemoBusy(true);
    setDemoError(null);
    setDemoSuccess(null);

    try {
      const response = await fetch("/api/auth/demo-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const raw = (await response.json().catch(() => null)) as unknown;
        throw new Error(readApiErrorMessage(raw, "Demo hesap açılamadı."));
      }

      setDemoSuccess("Demo hesabınız açıldı. Yönlendiriliyorsunuz...");
      router.push("/panel");
    } catch (requestError) {
      setDemoError(requestError instanceof Error ? requestError.message : "Demo hesap açılamadı.");
    } finally {
      setDemoBusy(false);
    }
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
      setActiveTab("login");

      setTimeout(() => {
        closeForgotModal();
      }, 900);
    } catch (requestError) {
      setForgotError(requestError instanceof Error ? requestError.message : "Şifre güncellenemedi.");
    } finally {
      setForgotBusy(false);
    }
  });

  return (
    <>
      <div className="mx-auto w-full max-w-[1120px] overflow-hidden rounded-[30px] border border-[#4156a6]/60 bg-[#121d4b]/75 shadow-[0_30px_100px_rgba(3,10,35,0.6)] backdrop-blur-sm">
        <div className="grid min-h-[680px] grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
          <aside className="relative overflow-hidden border-b border-[#33478f] bg-gradient-to-br from-[#152058] via-[#141f4d] to-[#0f173e] p-7 lg:border-b-0 lg:border-r lg:p-10">
            <div className="pointer-events-none absolute -right-20 top-4 h-72 w-72 rounded-full bg-cyan-300/10 blur-2xl" />
            <div className="pointer-events-none absolute -left-16 bottom-8 h-64 w-64 rounded-full bg-emerald-300/10 blur-2xl" />

            <div className="relative">
              <div className="mb-7 flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl border border-cyan-300/40 bg-cyan-300/15 text-sm font-black tracking-widest text-cyan-100">
                  B360
                </div>
                <div>
                  <p className="text-3xl font-black tracking-tight text-white">Bey360</p>
                  <p className="text-sm font-semibold text-[#9fb4ff]">Ticari Yönetim Platformu</p>
                </div>
              </div>

              <h2 className="max-w-md text-4xl font-black leading-tight text-white">Hızlı, güvenli ve profesyonel ticari operasyon</h2>
              <p className="mt-4 max-w-md text-sm font-semibold leading-6 text-[#aec0ff]">
                Perakende, market ve ön muhasebe süreçlerinizi tek panelde yönetin. Bey360 ile satıştan raporlamaya kadar tüm
                operasyonlarınız gerçek zamanlı kontrol altında.
              </p>

              <ul className="mt-8 space-y-3">
                {features.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 rounded-xl border border-[#3a4d97] bg-[#101947]/55 px-3 py-2 text-sm text-[#e4ebff]"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                      ✓
                    </span>
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <section className="bg-[#1a275f]/90 p-6 sm:p-8">
            <div className="rounded-2xl border border-[#3e53a1] bg-[#151f52]/80 p-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("login")}
                  className={`h-11 rounded-xl text-sm font-black transition ${
                    activeTab === "login" ? "bg-[#5a6db4] text-white shadow-[0_10px_20px_rgba(0,0,0,0.25)]" : "text-[#9bb0ef]"
                  }`}
                >
                  Giriş Yap
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("demo")}
                  className={`h-11 rounded-xl text-sm font-black transition ${
                    activeTab === "demo" ? "bg-[#5a6db4] text-white shadow-[0_10px_20px_rgba(0,0,0,0.25)]" : "text-[#9bb0ef]"
                  }`}
                >
                  Demo Hesap Aç
                </button>
              </div>
            </div>

            <div className="mt-5">
              {activeTab === "login" ? (
                <form onSubmit={submitLogin} className="space-y-3">
                  <div>
                    <FieldLabel>Şirket Alanı</FieldLabel>
                    <FieldInput {...loginForm.register("tenantSlug")} placeholder="ornek-bayi" />
                  </div>

                  <div>
                    <FieldLabel>Kullanıcı</FieldLabel>
                    <FieldInput {...loginForm.register("loginId")} placeholder="E-posta veya kullanıcı adı" />
                  </div>

                  <div>
                    <FieldLabel>Şifre</FieldLabel>
                    <FieldInput type="password" {...loginForm.register("password")} />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={openForgotModal}
                      className="text-sm font-semibold text-[#c7d4ff] underline-offset-4 hover:text-white hover:underline"
                    >
                      Şifremi Unuttum
                    </button>
                  </div>

                  {loginError ? (
                    <p className="rounded-xl border border-rose-300/50 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100">{loginError}</p>
                  ) : null}

                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="h-12 w-full rounded-xl border border-emerald-300/30 bg-emerald-600 text-base font-black text-white hover:bg-emerald-500"
                      disabled={loginBusy}
                    >
                      {loginBusy ? "Giriş yapılıyor..." : "Giriş Yap"}
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={submitDemo} className="space-y-3">
                  <div>
                    <FieldLabel>GSM Numarası</FieldLabel>
                    <FieldInput placeholder="05xx xxx xx xx" {...demoForm.register("gsmNumber")} />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Şirket Yılı</FieldLabel>
                      <FieldInput type="number" min={2000} max={2100} {...demoForm.register("companyYear", { valueAsNumber: true })} />
                    </div>
                    <div>
                      <FieldLabel>Kullanıcı</FieldLabel>
                      <FieldInput placeholder="admin" {...demoForm.register("username")} />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Şirket Adı</FieldLabel>
                    <FieldInput placeholder="Örn: Bey360 Market" {...demoForm.register("companyName")} />
                  </div>

                  <div>
                    <FieldLabel>Şifre</FieldLabel>
                    <FieldInput type="password" {...demoForm.register("password")} />
                  </div>

                  {demoSuccess ? (
                    <p className="rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100">
                      {demoSuccess}
                    </p>
                  ) : null}
                  {demoError ? (
                    <p className="rounded-xl border border-rose-300/50 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100">{demoError}</p>
                  ) : null}

                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="h-12 w-full rounded-xl border border-cyan-300/20 bg-cyan-600 text-base font-black text-white hover:bg-cyan-500"
                      disabled={demoBusy}
                    >
                      {demoBusy ? "Demo hesap açılıyor..." : "Demo Hesap Aç"}
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-[#3a4f9a] bg-[#121c4b] px-4 py-3 text-sm">
              <p className="font-semibold text-[#c8d5ff]">Yeni bayi olmak ister misiniz?</p>
              <Link href="/bayi-basvuru" className="mt-1 inline-block font-black text-emerald-300 hover:text-emerald-200">
                Bayi Başvuru Formuna Git
              </Link>
            </div>
          </section>
        </div>
      </div>

      {forgotOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#3f539d] bg-[#162259] p-5 shadow-[0_24px_60px_rgba(7,12,39,0.65)]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-black text-white">Şifremi Unuttum</p>
              <button
                type="button"
                onClick={closeForgotModal}
                className="rounded-md border border-white/20 px-2 py-1 text-sm font-semibold text-white/80 hover:bg-white/10"
              >
                Kapat
              </button>
            </div>

            {forgotStep === "send" ? (
              <form onSubmit={submitForgotSend} className="space-y-3">
                <div>
                  <FieldLabel>Şirket Alanı</FieldLabel>
                  <FieldInput {...forgotSendForm.register("tenantSlug")} />
                </div>
                <div>
                  <FieldLabel>Kullanıcı</FieldLabel>
                  <FieldInput {...forgotSendForm.register("loginId")} placeholder="E-posta veya kullanıcı adı" />
                </div>
                <div>
                  <FieldLabel>GSM Numarası</FieldLabel>
                  <FieldInput {...forgotSendForm.register("gsmNumber")} placeholder="05xx xxx xx xx" />
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-cyan-600 text-base font-black text-white hover:bg-cyan-500"
                  disabled={forgotBusy}
                >
                  {forgotBusy ? "Kod gönderiliyor..." : "SMS Kod Gönder"}
                </Button>
              </form>
            ) : (
              <form onSubmit={submitForgotReset} className="space-y-3">
                <div className="rounded-xl border border-cyan-300/30 bg-cyan-600/10 px-3 py-2 text-sm font-semibold text-cyan-100">
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
                  <FieldLabel>SMS Kodu</FieldLabel>
                  <FieldInput {...forgotResetForm.register("otpCode")} placeholder="000000" maxLength={6} className="tracking-[0.25em]" />
                </div>
                <div>
                  <FieldLabel>Yeni Şifre</FieldLabel>
                  <FieldInput type="password" {...forgotResetForm.register("newPassword")} />
                </div>
                <div>
                  <FieldLabel>Yeni Şifre Tekrar</FieldLabel>
                  <FieldInput type="password" {...forgotResetForm.register("confirmPassword")} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20"
                    disabled={forgotBusy}
                    onClick={() => {
                      setForgotStep("send");
                      setForgotError(null);
                      setForgotMessage(null);
                    }}
                  >
                    Kodu Yeniden Al
                  </Button>
                  <Button
                    type="submit"
                    className="h-11 rounded-xl bg-emerald-600 text-base font-black text-white hover:bg-emerald-500"
                    disabled={forgotBusy}
                  >
                    {forgotBusy ? "Şifre güncelleniyor..." : "Şifreyi Yenile"}
                  </Button>
                </div>
              </form>
            )}

            {forgotMessage ? (
              <p className="mt-3 rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100">
                {forgotMessage}
              </p>
            ) : null}
            {forgotError ? (
              <p className="mt-3 rounded-xl border border-rose-300/50 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100">
                {forgotError}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
