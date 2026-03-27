import process from "node:process";

function trimEnv(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : "";
}

function pickDatabaseTarget() {
  return (trimEnv("DATABASE_TARGET") || "auto").toLowerCase();
}

function pickCandidateUrls() {
  const target = pickDatabaseTarget();
  const local = trimEnv("LOCAL_DATABASE_URL");
  const cloud = trimEnv("CLOUD_DATABASE_URL");
  const database = trimEnv("DATABASE_URL");
  const neon = trimEnv("NEON_DATABASE_URL");
  const direct = trimEnv("DIRECT_URL");

  if (target === "local") {
    return [local, database, cloud, neon, direct].filter(Boolean);
  }

  if (target === "cloud") {
    return [database, cloud, neon, direct, local].filter(Boolean);
  }

  return [database, local, cloud, neon, direct].filter(Boolean);
}

function maybeDeriveNeonDirectUrl(raw) {
  try {
    const url = new URL(raw);
    if (!url.hostname.includes("-pooler")) {
      return raw;
    }

    url.hostname = url.hostname
      .replace("-pooler.c-3.", ".")
      .replace("-pooler.c-2.", ".")
      .replace("-pooler.c-1.", ".")
      .replace("-pooler.", ".");
    url.searchParams.delete("pgbouncer");
    url.searchParams.delete("channel_binding");
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "15");
    }

    return url.toString();
  } catch {
    return raw;
  }
}

function normalizeRuntimeUrl(raw) {
  if (!raw) return "";

  try {
    const url = new URL(raw);
    url.searchParams.delete("channel_binding");

    if (url.hostname.includes("-pooler.") && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "15");
    }

    return url.toString();
  } catch {
    return raw;
  }
}

export function prepareDatabaseEnv() {
  const runtimeUrl = normalizeRuntimeUrl(pickCandidateUrls()[0] || "");
  if (!runtimeUrl) {
    throw new Error("DATABASE_URL bulunamadi. DATABASE_URL veya CLOUD_DATABASE_URL / NEON_DATABASE_URL tanimlayin.");
  }

  const explicitDirect = trimEnv("DIRECT_URL");
  const directUrl = explicitDirect ? normalizeRuntimeUrl(explicitDirect) : maybeDeriveNeonDirectUrl(runtimeUrl);

  return {
    ...process.env,
    DATABASE_URL: runtimeUrl,
    DIRECT_URL: directUrl || runtimeUrl,
  };
}
