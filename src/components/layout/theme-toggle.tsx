"use client";

import * as React from "react";

type ThemeKey = "corporate" | "dark" | "emerald";

type ThemeOption = {
  key: ThemeKey;
  label: string;
};

const THEME_STORAGE_KEY = "mx-theme";

const themeOptions: ThemeOption[] = [
  { key: "corporate", label: "Kurumsal" },
  { key: "dark", label: "Gece" },
  { key: "emerald", label: "Zümrüt" },
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
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as ThemeKey;
    setTheme(next);
    applyTheme(next);
  }

  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white">
      <span>Tema</span>
      <select
        value={theme}
        onChange={handleChange}
        className="rounded-md border border-white/30 bg-slate-900/35 px-2 py-1 text-xs font-semibold text-white outline-none"
        aria-label="Renk teması seç"
      >
        {themeOptions.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
