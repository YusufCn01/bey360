"use client";

import * as React from "react";

type ThemeKey = "corporate" | "dark" | "emerald" | "graphite";

type ThemeOption = {
  key: ThemeKey;
  label: string;
  shortLabel: string;
};

const THEME_STORAGE_KEY = "mx-theme";

const themeOptions: ThemeOption[] = [
  { key: "corporate", label: "Kurumsal", shortLabel: "K" },
  { key: "dark", label: "Gece", shortLabel: "G" },
  { key: "emerald", label: "Zümrüt", shortLabel: "Z" },
  { key: "graphite", label: "Grafit", shortLabel: "F" },
];

function applyTheme(theme: ThemeKey) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<ThemeKey>("corporate");

  React.useEffect(() => {
    const saved = (window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeKey | null) ?? "corporate";
    const fallback = themeOptions.some((option) => option.key === saved) ? saved : "corporate";
    setTheme(fallback);
    applyTheme(fallback);
  }, []);

  function handleSelect(next: ThemeKey) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl border p-1"
      style={{
        borderColor: "color-mix(in srgb, var(--mx-text-muted) 30%, transparent)",
        backgroundColor: "color-mix(in srgb, var(--mx-surface-soft) 72%, transparent)",
      }}
      role="group"
      aria-label="Tema seçici"
    >
      <span className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--mx-text-muted)]">
        Tema
      </span>
      {themeOptions.map((option) => {
        const active = theme === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => handleSelect(option.key)}
            className="inline-flex h-8 items-center rounded-lg px-2 text-xs font-bold transition"
            style={{
              minWidth: 38,
              justifyContent: "center",
              backgroundColor: active
                ? "color-mix(in srgb, var(--mx-brand-500) 36%, var(--mx-surface) 64%)"
                : "transparent",
              color: active
                ? "color-mix(in srgb, var(--mx-text) 84%, white 16%)"
                : "color-mix(in srgb, var(--mx-text-muted) 92%, transparent)",
              border: active
                ? "1px solid color-mix(in srgb, var(--mx-brand-500) 50%, transparent)"
                : "1px solid transparent",
            }}
            title={option.label}
            aria-label={option.label}
          >
            {option.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
