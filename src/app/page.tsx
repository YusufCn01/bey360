import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-panel-shell min-h-screen p-6">
      <div className="mx-auto mt-16 max-w-2xl rounded-xl border border-[color:var(--mx-border)] bg-[color:var(--mx-surface)] p-6">
        <h1 className="text-2xl font-black text-[color:var(--mx-text)]">Bey360 Platform</h1>
        <p className="mt-2 text-sm font-semibold text-[color:var(--mx-text-muted)]">
          Sistem aktif. Giris yapmak icin asagidaki baglantiyi kullanin.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/giris"
            className="inline-flex h-10 items-center rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-brand-500)] px-4 text-sm font-bold text-white"
          >
            Giris Ekrani
          </Link>
          <Link
            href="/api/health"
            className="inline-flex h-10 items-center rounded-md border border-[color:var(--mx-border)] bg-[color:var(--mx-surface-soft)] px-4 text-sm font-bold text-[color:var(--mx-text)]"
          >
            Saglik Kontrolu
          </Link>
        </div>
      </div>
    </main>
  );
}
