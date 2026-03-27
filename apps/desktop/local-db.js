const { spawn } = require("child_process");
const net = require("net");
const path = require("path");
const fs = require("fs");
const os = require("os");

const CONTAINER_NAME = "bey360-postgres";
const MANAGED_PORT = 55432;
const MANAGED_DB_NAME = "muhasebe_local";
const MANAGED_DB_URL = `postgresql://postgres@127.0.0.1:${MANAGED_PORT}/${MANAGED_DB_NAME}?schema=public`;
const LEGACY_DOCKER_URL = "postgresql://postgres:postgres@127.0.0.1:54329/muhasebe_local?schema=public";
const APP_DATA_ROOT = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "Bey360");
const MANAGED_PG_ROOT = path.join(APP_DATA_ROOT, "postgres-managed");
const MANAGED_PG_DATA = path.join(MANAGED_PG_ROOT, "data");
const MANAGED_PG_LOG = path.join(MANAGED_PG_ROOT, "postgres.log");
const DEFAULT_RUN_TIMEOUT_MS = 90000;
const FALLBACK_LOCAL_URLS = [
  () => process.env.LOCAL_DATABASE_URL,
  () => process.env.DATABASE_URL,
  () => MANAGED_DB_URL,
  () => LEGACY_DOCKER_URL,
  () => "postgresql://postgres:postgres@127.0.0.1:5432/muhasebe?schema=public",
  () => "postgresql://postgres:postgres@127.0.0.1:5432/muhasebe_local?schema=public",
];

let externalLogWriter = null;

function writeDesktopLog(message) {
  if (typeof externalLogWriter === "function") {
    try {
      externalLogWriter(message);
      return;
    } catch {
      // ignore delegated logging failures
    }
  }

  try {
    fs.mkdirSync(APP_DATA_ROOT, { recursive: true });
    fs.appendFileSync(path.join(APP_DATA_ROOT, "desktop-startup.log"), `[local-db] ${message}\n`, "utf8");
  } catch {
    // ignore fallback logging failures
  }
}

function run(command, args, options = {}) {
  const timeoutMs = Number(options.timeoutMs || DEFAULT_RUN_TIMEOUT_MS);
  return new Promise((resolve, reject) => {
    writeDesktopLog(`Komut baslatildi: ${command} ${args.join(" ")}`);
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Komut zaman asimina ugradi (${timeoutMs}ms): ${command} ${args.join(" ")}`));
    }, timeoutMs);

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        writeDesktopLog(`Komut tamamlandi: ${command} ${args.join(" ")}`);
        resolve({ stdout, stderr });
        return;
      }
      writeDesktopLog(`Komut basarisiz: ${command} ${args.join(" ")} | ${stderr || stdout}`);
      reject(new Error(stderr || stdout || `Komut basarisiz: ${command} ${args.join(" ")}`));
    });
  });
}

function formatCliError(error) {
  const raw = error instanceof Error ? error.message : String(error);
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (lines.some((line) => /No available upgrade found/i.test(line))) {
    return "PostgreSQL paketi zaten kurulu. Bey360 icin yerel veritabani ortami hazirlaniyor.";
  }

  return lines.slice(-8).join("\n");
}

async function hasDocker() {
  try {
    await run("docker", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

async function hasWinget() {
  try {
    await run("winget", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

async function canReachTcp(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finalize = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(800);
    socket.once("connect", () => finalize(true));
    socket.once("timeout", () => finalize(false));
    socket.once("error", () => finalize(false));
    socket.connect(port, host);
  });
}

function getCommonPostgresPaths() {
  return [
    path.join(process.env.ProgramFiles || "C:\\Program Files", "PostgreSQL"),
    path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "PostgreSQL"),
    "C:\\laragon\\bin\\postgresql",
  ];
}

function findExecutable(executableName) {
  const directCandidates = [
    path.join("C:\\laragon\\bin\\postgresql\\postgresql\\bin", executableName),
  ];

  for (const candidate of directCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  for (const root of getCommonPostgresPaths()) {
    if (!fs.existsSync(root)) {
      continue;
    }

    const versions = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left, undefined, { numeric: true, sensitivity: "base" }));

    for (const version of versions) {
      const binPath = path.join(root, version, "bin", executableName);
      if (fs.existsSync(binPath)) {
        return binPath;
      }
    }
  }

  return null;
}

function findPsqlExecutable() {
  return findExecutable("psql.exe");
}

function findInitDbExecutable() {
  return findExecutable("initdb.exe");
}

function findPgCtlExecutable() {
  return findExecutable("pg_ctl.exe");
}

async function waitForPort(host, port, timeoutMs = 90000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await canReachTcp(host, port)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return false;
}

async function findExistingLocalDatabaseUrl() {
  for (const candidateFactory of FALLBACK_LOCAL_URLS) {
    const candidate = candidateFactory()?.trim();
    if (!candidate) {
      continue;
    }

    try {
      const parsed = new URL(candidate);
      const reachable = await canReachTcp(parsed.hostname, Number(parsed.port || 5432));
      if (reachable) {
        return candidate;
      }
    } catch {
      // ignore malformed candidate
    }
  }

  return null;
}

async function installPostgresWithWinget() {
  if (process.platform !== "win32") {
    return {
      status: "unsupported",
      reason: "Otomatik PostgreSQL kurulumu sadece Windows icin tanimli",
    };
  }

  const wingetOk = await hasWinget();
  if (!wingetOk) {
    return {
      status: "unavailable",
      reason: "winget bulunamadi",
    };
  }

  try {
    writeDesktopLog("winget ile PostgreSQL kurulumu deneniyor");
    await run("winget", [
      "install",
      "--id",
      "PostgreSQL.PostgreSQL.16",
      "-e",
      "--accept-package-agreements",
      "--accept-source-agreements",
      "--disable-interactivity",
      "--silent",
    ], { timeoutMs: 180000 });

    return {
      status: "ready",
      reason: "PostgreSQL binary paketleri hazirlandi",
    };
  } catch (error) {
    const psqlPath = findPsqlExecutable();
    if (psqlPath) {
      return {
        status: "ready",
        reason: "PostgreSQL zaten kurulu, mevcut binaryler kullanilacak",
      };
    }

    return {
      status: "error",
      reason: formatCliError(error) || "PostgreSQL otomatik kurulumu basarisiz",
    };
  }
}

async function ensureManagedPostgresInstance() {
  writeDesktopLog("Managed PostgreSQL instance kontrolu basladi");
  const initdbPath = findInitDbExecutable();
  const pgCtlPath = findPgCtlExecutable();
  const psqlPath = findPsqlExecutable();

  if (!initdbPath || !pgCtlPath || !psqlPath) {
    const install = await installPostgresWithWinget();
    if (install.status !== "ready") {
      return {
        status: "error",
        url: null,
        reason: install.reason,
      };
    }
  }

  const resolvedInitdbPath = findInitDbExecutable();
  const resolvedPgCtlPath = findPgCtlExecutable();
  const resolvedPsqlPath = findPsqlExecutable();

  if (!resolvedInitdbPath || !resolvedPgCtlPath || !resolvedPsqlPath) {
    return {
      status: "error",
      url: null,
      reason: "PostgreSQL araclari (initdb/pg_ctl/psql) bulunamadi",
    };
  }

  fs.mkdirSync(MANAGED_PG_ROOT, { recursive: true });

  if (!fs.existsSync(path.join(MANAGED_PG_DATA, "PG_VERSION"))) {
    writeDesktopLog("Managed PostgreSQL data klasoru hazirlaniyor");
    fs.rmSync(MANAGED_PG_DATA, { recursive: true, force: true });
    fs.mkdirSync(MANAGED_PG_DATA, { recursive: true });

    try {
      await run(resolvedInitdbPath, [
        "-D",
        MANAGED_PG_DATA,
        "-U",
        "postgres",
        "-A",
        "trust",
        "--encoding=UTF8",
        "--locale=C",
      ], { timeoutMs: 180000 });

      fs.appendFileSync(
        path.join(MANAGED_PG_DATA, "postgresql.conf"),
        `\nlisten_addresses = '127.0.0.1'\nport = ${MANAGED_PORT}\nshared_buffers = 128MB\nmax_connections = 100\n`,
        "utf8",
      );
    } catch (error) {
      return {
        status: "error",
        url: null,
        reason: formatCliError(error) || "Bey360 icin local PostgreSQL ortami hazirlanamadi",
      };
    }
  }

  const alreadyRunning = await canReachTcp("127.0.0.1", MANAGED_PORT);
  if (!alreadyRunning) {
    writeDesktopLog(`Managed PostgreSQL ${MANAGED_PORT} portunda baslatiliyor`);
    try {
      await run(resolvedPgCtlPath, [
        "-D",
        MANAGED_PG_DATA,
        "-l",
        MANAGED_PG_LOG,
        "-o",
        `-p ${MANAGED_PORT}`,
        "start",
      ], { timeoutMs: 60000 });
    } catch (error) {
      writeDesktopLog(`pg_ctl start ilk denemede hata verdi: ${formatCliError(error)}`);
      const reachable = await waitForPort("127.0.0.1", MANAGED_PORT, 20000);
      if (!reachable) {
        return {
          status: "error",
          url: null,
          reason: formatCliError(error) || "Bey360 local PostgreSQL instance baslatilamadi",
        };
      }
    }
  }

  const ready = await waitForPort("127.0.0.1", MANAGED_PORT, 30000);
  if (!ready) {
    return {
      status: "error",
      url: null,
      reason: `Bey360 local PostgreSQL instance ${MANAGED_PORT} portunda hazir olmadi`,
    };
  }

  process.env.LOCAL_DATABASE_URL = MANAGED_DB_URL;
  process.env.DATABASE_TARGET = "local";
  writeDesktopLog(`Managed PostgreSQL hazir: ${MANAGED_DB_URL}`);

  return {
    status: "ready",
    url: MANAGED_DB_URL,
    reason: "Bey360 icin izole local PostgreSQL instance baslatildi",
  };
}

async function ensureLocalDatabase() {
  writeDesktopLog("Yerel veritabani bootstrap basladi");
  const mode = (process.env.B360_DESKTOP_DB_MODE ?? "local").trim().toLowerCase();
  if (mode === "cloud") {
    return {
      status: "skipped",
      url: null,
      reason: "B360_DESKTOP_DB_MODE=cloud",
    };
  }

  const existingUrl = await findExistingLocalDatabaseUrl();
  if (existingUrl) {
    writeDesktopLog(`Mevcut local PostgreSQL bulundu: ${existingUrl}`);
    process.env.LOCAL_DATABASE_URL = existingUrl;
    process.env.DATABASE_TARGET = "local";
    return {
      status: "ready",
      url: existingUrl,
      reason: "Mevcut yerel PostgreSQL bulundu",
    };
  }

  const managed = await ensureManagedPostgresInstance();
  if (managed.status === "ready") {
    writeDesktopLog(`Managed local DB sonucu: ${managed.reason}`);
    return managed;
  }

  const dockerOk = await hasDocker();
  if (!dockerOk) {
    return {
      status: "unavailable",
      url: null,
      reason: managed.reason || "Ne Docker ne de PostgreSQL binaryleri kullanilabilir durumda",
    };
  }

  try {
    writeDesktopLog("Docker fallback ile local PostgreSQL deneniyor");
    const check = await run("docker", ["ps", "-a", "--filter", `name=^/${CONTAINER_NAME}$`, "--format", "{{.Names}}"]);
    const exists = check.stdout.trim() === CONTAINER_NAME;

    if (!exists) {
      await run("docker", [
        "run",
        "-d",
        "--name",
        CONTAINER_NAME,
        "-e",
        "POSTGRES_USER=postgres",
        "-e",
        "POSTGRES_PASSWORD=postgres",
        "-e",
        "POSTGRES_DB=muhasebe_local",
        "-p",
        "54329:5432",
        "postgres:16-alpine",
      ]);
    } else {
      await run("docker", ["start", CONTAINER_NAME]);
    }

    process.env.LOCAL_DATABASE_URL = LEGACY_DOCKER_URL;
    process.env.DATABASE_TARGET = "local";

    return {
      status: "ready",
      url: LEGACY_DOCKER_URL,
      reason: "Local PostgreSQL container hazir",
    };
  } catch (error) {
    return {
      status: "error",
      url: null,
      reason: managed.reason || (error instanceof Error ? error.message : "Local DB baslatilamadi"),
    };
  }
}

module.exports = {
  ensureLocalDatabase,
  LOCAL_DB_URL: MANAGED_DB_URL,
  findPsqlExecutable,
  setDesktopLogWriter(writer) {
    externalLogWriter = typeof writer === "function" ? writer : null;
  },
};
