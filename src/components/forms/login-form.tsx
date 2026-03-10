"use client";

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
  "Hızlı satış ve stok yönetimi",
  "Çoklu şube ve depo desteği",
  "Gerçek zamanlı raporlama",
  "Mobil ve masaüstü uyumluluk",
  "e-Fatura ve e-Arşiv entegrasyonu",
  "Çok kiracılı güvenli altyapı",
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
    router.refresh();
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

      setDemoSuccess("Demo hesabınız açıldı. Yönetim paneline yönlendiriliyorsunuz...");
      router.push("/panel");
      router.refresh();
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
      setForgotError("Önce SMS kodu almanız gerekiyor.");
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
      <div className="mx-auto w-full max-w-[980px] overflow-hidden rounded-[30px] border border-[#4e5ca5]/50 bg-[#26336f]/80 shadow-[0_30px_90px_rgba(8,16,52,0.55)] backdrop-blur-sm">
        <div className="grid min-h-[640px] grid-cols-1 md:grid-cols-[1.1fr_1fr]">
          <section className="relative p-6 md:p-8">
            <div className="mb-6">
              <p className="text-[36px] font-black uppercase tracking-[0.08em] text-white">Motus Bulut</p>
              <p className="text-sm font-semibold text-[#b8c1f0]">Yeni Nesil Satış Platformu</p>
            </div>

            <div className="mb-5 grid grid-cols-2 rounded-2xl border border-[#4f5fab] bg-[#2a3878] p-1">
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className={`h-11 rounded-xl text-sm font-bold transition ${
                  activeTab === "login" ? "bg-[#5c6aa8] text-white shadow-[0_8px_16px_rgba(15,22,61,0.4)]" : "text-[#aab3df]"
                }`}
              >
                Giriş Yap
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("demo")}
                className={`h-11 rounded-xl text-sm font-bold transition ${
                  activeTab === "demo" ? "bg-[#5c6aa8] text-white shadow-[0_8px_16px_rgba(15,22,61,0.4)]" : "text-[#aab3df]"
                }`}
              >
                Demo Hesap Aç
              </button>
            </div>

            {activeTab === "login" ? (
              <form onSubmit={submitLogin} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Şirket Alanı</label>
                  <input
                    className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-base font-semibold text-white placeholder:text-[#95a0d2]"
                    {...loginForm.register("tenantSlug")}
                    placeholder="ornek-bayi"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Kullanıcı</label>
                  <input
                    className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-base font-semibold text-white placeholder:text-[#95a0d2]"
                    {...loginForm.register("loginId")}
                    placeholder="E-posta veya kullanıcı adı"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Şifre</label>
                  <input
                    type="password"
                    className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-base font-semibold text-white placeholder:text-[#95a0d2]"
                    {...loginForm.register("password")}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={openForgotModal}
                    className="text-sm font-semibold text-[#cbd3ff] underline-offset-4 hover:text-white hover:underline"
                  >
                    Şifremi Unuttum
                  </button>
                </div>

                {loginError ? (
                  <p className="rounded-xl border border-rose-300/50 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100">
                    {loginError}
                  </p>
                ) : null}

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="h-12 w-full rounded-xl border border-emerald-300/30 bg-emerald-600 text-lg font-black text-white hover:bg-emerald-500"
                    disabled={loginBusy}
                  >
                    {loginBusy ? "Giriş yapılıyor..." : "Giriş Yap"}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={submitDemo} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">GSM Numarası</label>
                  <input
                    className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-base font-semibold text-white placeholder:text-[#95a0d2]"
                    placeholder="05xx xxx xx xx"
                    {...demoForm.register("gsmNumber")}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Şirket Yılı</label>
                    <input
                      type="number"
                      min={2000}
                      max={2100}
                      className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-base font-semibold text-white placeholder:text-[#95a0d2]"
                      {...demoForm.register("companyYear", { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Kullanıcı</label>
                    <input
                      className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-base font-semibold text-white placeholder:text-[#95a0d2]"
                      {...demoForm.register("username")}
                      placeholder="admin"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Şirket Adı</label>
                  <input
                    className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-base font-semibold text-white placeholder:text-[#95a0d2]"
                    placeholder="Örn: Tek Marka Market"
                    {...demoForm.register("companyName")}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Şifre</label>
                  <input
                    type="password"
                    className="h-12 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-base font-semibold text-white placeholder:text-[#95a0d2]"
                    {...demoForm.register("password")}
                  />
                </div>

                {demoSuccess ? (
                  <p className="rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100">
                    {demoSuccess}
                  </p>
                ) : null}
                {demoError ? (
                  <p className="rounded-xl border border-rose-300/50 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100">
                    {demoError}
                  </p>
                ) : null}

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="h-12 w-full rounded-xl border border-cyan-300/20 bg-cyan-600 text-lg font-black text-white hover:bg-cyan-500"
                    disabled={demoBusy}
                  >
                    {demoBusy ? "Demo hesap açılıyor..." : "Demo Hesap Aç"}
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-5 rounded-xl border border-[#4f5fab] bg-[#313f7a] px-4 py-3 text-sm">
              <p className="font-semibold text-[#c9d1fb]">Yeni bayi olmak ister misiniz?</p>
              <Link href="/bayi-basvuru" className="mt-1 inline-block font-black text-emerald-300 hover:text-emerald-200">
                Bayi Başvuru Formuna Git
              </Link>
            </div>
          </section>

          <aside className="relative border-t border-[#4e5ca5]/40 bg-[#1f2a66]/95 p-7 md:border-l md:border-t-0 md:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#4b5ca8]/20" />
            <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-[#4b5ca8]/20" />
            <div className="relative">
              <h2 className="text-4xl font-black leading-tight text-white">Bulutun Konforunu Keşfedin</h2>
              <p className="mt-3 text-base font-semibold text-[#adb7e8]">Tüm cihazlardan erişim, hızlı kullanım, canlı operasyon.</p>

              <ul className="mt-8 space-y-3">
                {features.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-base font-semibold text-[#d7ddff]">
                    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {forgotOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#4e5ca5] bg-[#24306a] p-5 shadow-[0_24px_60px_rgba(7,12,39,0.65)]">
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
                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Şirket Alanı</label>
                  <input
                    className="h-11 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
                    {...forgotSendForm.register("tenantSlug")}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Kullanıcı</label>
                  <input
                    className="h-11 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
                    {...forgotSendForm.register("loginId")}
                    placeholder="E-posta veya kullanıcı adı"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">GSM Numarası</label>
                  <input
                    className="h-11 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
                    {...forgotSendForm.register("gsmNumber")}
                    placeholder="05xx xxx xx xx"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-cyan-600 text-base font-black hover:bg-cyan-500"
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
                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">SMS Kodu</label>
                  <input
                    className="h-11 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold tracking-[0.25em] text-white placeholder:text-[#95a0d2]"
                    {...forgotResetForm.register("otpCode")}
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Yeni Şifre</label>
                  <input
                    type="password"
                    className="h-11 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
                    {...forgotResetForm.register("newPassword")}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[#aeb7e3]">Yeni Şifre Tekrar</label>
                  <input
                    type="password"
                    className="h-11 w-full rounded-xl border border-[#4f5fab] bg-[#3a467f] px-4 text-sm font-semibold text-white placeholder:text-[#95a0d2]"
                    {...forgotResetForm.register("confirmPassword")}
                  />
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
                    className="h-11 rounded-xl bg-emerald-600 text-base font-black hover:bg-emerald-500"
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
