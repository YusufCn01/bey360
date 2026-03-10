import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Bey360 ERP / POS",
  description: "Türkiye odaklı çok kiracılı SaaS ERP, POS ve ticari otomasyon platformu",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const key = "mx-theme";
                const fallback = "corporate";
                const saved = window.localStorage.getItem(key) || fallback;
                document.documentElement.setAttribute("data-theme", saved);
                document.documentElement.classList.toggle("dark", saved === "dark");
              } catch (_) {}
            })();`,
          }}
        />
      </head>
      <body className={`${manrope.variable} ${jetbrainsMono.variable} antialiased`}>{children}</body>
    </html>
  );
}

