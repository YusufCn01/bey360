"use client";

import * as React from "react";

type SettingsEnvelope = {
  success: boolean;
  data?: {
    payload?: Record<string, unknown>;
  };
  error?: { message?: string };
};

type Primitive = string | number | boolean;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function parseValue(template: Primitive, value: unknown): Primitive {
  if (typeof template === "boolean") {
    return typeof value === "boolean" ? value : template;
  }
  if (typeof template === "number") {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value.replace(",", "."));
      return Number.isFinite(parsed) ? parsed : template;
    }
    return template;
  }
  return typeof value === "string" ? value : template;
}

export function useTenantSettingsForm<T extends Record<string, Primitive>>(scope: string, defaults: T) {
  const [form, setForm] = React.useState<T>(defaults);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tenant/settings?scope=${encodeURIComponent(scope)}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as SettingsEnvelope;
      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Ayarlar yüklenemedi.");
      }

      const payload = asRecord(body.data?.payload);
      const next = Object.keys(defaults).reduce((acc, key) => {
        const typedKey = key as keyof T;
        acc[typedKey] = parseValue(defaults[typedKey], payload[key]) as T[keyof T];
        return acc;
      }, {} as T);
      setForm(next);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Ayarlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [defaults, scope]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const save = React.useCallback(
    async (next: T) => {
      setSaving(true);
      setError(null);
      setMessage(null);
      try {
        const response = await fetch("/api/tenant/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope,
            payload: next,
          }),
        });
        const body = (await response.json()) as SettingsEnvelope;
        if (!response.ok || !body.success) {
          throw new Error(body.error?.message ?? "Ayarlar kaydedilemedi.");
        }

        setForm(next);
        setMessage("Ayarlar kaydedildi.");
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Ayarlar kaydedilemedi.");
      } finally {
        setSaving(false);
      }
    },
    [scope],
  );

  function patch<K extends keyof T>(key: K, value: T[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return {
    form,
    setForm,
    patch,
    loading,
    saving,
    message,
    error,
    load,
    save,
    setMessage,
  };
}
