const { spawn } = require("child_process");
const net = require("net");
const path = require("path");
const fs = require("fs");

const CONTAINER_NAME = "bey360-postgres";
const LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54329/muhasebe_local?schema=public";
const FALLBACK_LOCAL_URLS = [
  () => process.env.LOCAL_DATABASE_URL,
  () => process.env.DATABASE_URL,
  () => LOCAL_DB_URL,
  () => "postgresql://postgres:postgres@127.0.0.1:5432/muhasebe?schema=public",
  () => "postgresql://postgres:postgres@127.0.0.1:5432/muhasebe_local?schema=public",
];

function run(command, args) {
  return new Promise((resolve, reject) => {
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

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(stderr || stdout || `Komut basarisiz: ${command} ${args.join(" ")}`));
    });
  });
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

function getCommonPostgresPaths() {
  return [
    path.join(process.env.ProgramFiles || "C:\\Program Files", "PostgreSQL"),
    path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "PostgreSQL"),
    "C:\\laragon\\bin\\postgresql",
  ];
}

function findPsqlExecutable() {
  const directCandidates = [
    path.join("C:\\laragon\\bin\\postgresql\\postgresql\\bin", "psql.exe"),
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
      const binPath = path.join(root, version, "bin", "psql.exe");
      if (fs.existsSync(binPath)) {
        return binPath;
      }
    }
  }

  return null;
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
    await run("winget", [
      "install",
      "--id",
      "PostgreSQL.PostgreSQL.16",
      "-e",
      "--accept-package-agreements",
      "--accept-source-agreements",
      "--disable-interactivity",
      "--silent",
      "--override",
      "--mode unattended --unattendedmodeui none --serverport 54329 --superpassword postgres --servicepassword postgres",
    ]);

    const reachable = await waitForPort("127.0.0.1", 54329, 120000);
    if (!reachable) {
      return {
        status: "error",
        reason: "PostgreSQL kuruldu ancak servis 54329 portunda hazir olmadi",
      };
    }

    process.env.LOCAL_DATABASE_URL = LOCAL_DB_URL;
    process.env.DATABASE_TARGET = "local";
    return {
      status: "ready",
      reason: "PostgreSQL otomatik olarak kuruldu",
      url: LOCAL_DB_URL,
      psqlPath: findPsqlExecutable(),
    };
  } catch (error) {
    return {
      status: "error",
      reason: error instanceof Error ? error.message : "PostgreSQL otomatik kurulumu basarisiz",
    };
  }
}

async function ensureLocalDatabase() {
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
    process.env.LOCAL_DATABASE_URL = existingUrl;
    process.env.DATABASE_TARGET = "local";
    return {
      status: "ready",
      url: existingUrl,
      reason: "Mevcut yerel PostgreSQL bulundu",
    };
  }

  const dockerOk = await hasDocker();
  if (!dockerOk) {
    const autoInstall = await installPostgresWithWinget();
    if (autoInstall.status === "ready") {
      return {
        status: "ready",
        url: autoInstall.url,
        reason: autoInstall.reason,
      };
    }

    return {
      status: "unavailable",
      url: null,
      reason: autoInstall.reason || "Docker bulunamadi",
    };
  }

  try {
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

    process.env.LOCAL_DATABASE_URL = LOCAL_DB_URL;
    process.env.DATABASE_TARGET = "local";

    return {
      status: "ready",
      url: LOCAL_DB_URL,
      reason: "Local PostgreSQL container hazir",
    };
  } catch (error) {
    const autoInstall = await installPostgresWithWinget();
    if (autoInstall.status === "ready") {
      return {
        status: "ready",
        url: autoInstall.url,
        reason: autoInstall.reason,
      };
    }

    return {
      status: "error",
      url: null,
      reason:
        autoInstall.reason ||
        (error instanceof Error
          ? error.message
          : "Local DB baslatilamadi"),
    };
  }
}

module.exports = {
  ensureLocalDatabase,
  LOCAL_DB_URL,
  findPsqlExecutable,
};
