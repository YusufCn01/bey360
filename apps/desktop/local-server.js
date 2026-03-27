const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { createRequire } = require("module");
const { LOCAL_DB_URL } = require("./local-db");

const LOCAL_BASE_URL = "http://127.0.0.1:3015";
const requireFromRepo = createRequire(path.resolve(__dirname, "../../package.json"));
let serverProcess = null;

function fileExists(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

async function canReachLocalHealth() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);
    const response = await fetch(`${LOCAL_BASE_URL}/api/health`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForLocalHealth(timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await canReachLocalHealth()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

function spawnServer(command, args, workdir, env) {
  return spawn(command, args, {
    cwd: workdir,
    stdio: "ignore",
    windowsHide: true,
    env,
  });
}

function runCommand(command, args, workdir, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: workdir,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if ((code ?? 1) === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr || stdout || `Komut basarisiz: ${command} ${args.join(" ")}`));
    });
  });
}

async function prepareLocalDatabase(repoRoot, env) {
  const prismaRun = path.join(repoRoot, "scripts", "prisma-run.mjs");
  if (!fileExists(prismaRun)) {
    return {
      status: "unavailable",
      reason: "Prisma komut dosyalari bulunamadi",
    };
  }

  try {
    await runCommand(process.execPath, [prismaRun, "generate"], repoRoot, env);
    await runCommand(process.execPath, [prismaRun, "migrate", "deploy"], repoRoot, env);
    await runCommand(process.execPath, [prismaRun, "db", "seed"], repoRoot, env);

    return {
      status: "ready",
      reason: "Migration ve seed tamamlandi",
    };
  } catch (error) {
    return {
      status: "error",
      reason: error instanceof Error ? error.message : "Local veritabani hazirlanamadi",
    };
  }
}

async function ensureLocalWebServer() {
  const runMode = (process.env.B360_DESKTOP_RUN_MODE ?? "local").trim().toLowerCase();
  if (runMode === "cloud") {
    return {
      status: "skipped",
      url: null,
      reason: "B360_DESKTOP_RUN_MODE=cloud",
    };
  }

  if (await canReachLocalHealth()) {
    return {
      status: "ready",
      url: `${LOCAL_BASE_URL}/giris`,
      reason: "Yerel web sunucusu zaten calisiyor",
    };
  }

  const repoRoot = path.resolve(__dirname, "../..");
  const startScriptPath = path.join(repoRoot, "scripts", "start.mjs");
  const nodeModulesPath = path.join(repoRoot, "node_modules");
  const nextBuildPath = path.join(repoRoot, ".next", "BUILD_ID");

  if (!fileExists(startScriptPath) || !fileExists(nodeModulesPath)) {
    return {
      status: "unavailable",
      url: null,
      reason: "Yerel web sunucusu dosyalari bulunamadi",
    };
  }

  const env = {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || "development",
    HOST: "127.0.0.1",
    PORT: "3015",
    APP_URL: `${LOCAL_BASE_URL}`,
    APP_SECRET: process.env.APP_SECRET || "bey360-desktop-local-secret-please-change-1234567890",
    DEFAULT_TENANT_SLUG: process.env.DEFAULT_TENANT_SLUG || "demo-market",
    DATABASE_TARGET: "local",
    LOCAL_DATABASE_URL: process.env.LOCAL_DATABASE_URL || LOCAL_DB_URL,
    DATABASE_URL: process.env.DATABASE_URL || LOCAL_DB_URL,
  };

  const dbPreparation = await prepareLocalDatabase(repoRoot, env);
  if (dbPreparation.status !== "ready") {
    return {
      status: "error",
      url: null,
      reason: dbPreparation.reason,
    };
  }

  try {
    if (fileExists(nextBuildPath)) {
      serverProcess = spawnServer(process.execPath, [startScriptPath], repoRoot, env);
    } else {
      const nextBin = requireFromRepo.resolve("next/dist/bin/next");
      serverProcess = spawnServer(process.execPath, [nextBin, "dev", "--webpack", "--hostname", "127.0.0.1", "--port", "3015"], repoRoot, env);
    }

    const healthy = await waitForLocalHealth(fileExists(nextBuildPath) ? 25000 : 60000);
    if (!healthy) {
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill("SIGTERM");
      }
      serverProcess = null;
      return {
        status: "error",
        url: null,
        reason: "Yerel web sunucusu zamaninda hazir olmadi",
      };
    }

    return {
      status: "ready",
      url: `${LOCAL_BASE_URL}/giris`,
      reason: fileExists(nextBuildPath) ? "Yerel production sunucu baslatildi" : "Yerel gelistirme sunucusu baslatildi",
    };
  } catch (error) {
    return {
      status: "error",
      url: null,
      reason: error instanceof Error ? error.message : "Yerel web sunucusu baslatilamadi",
    };
  }
}

function stopLocalWebServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
  }
  serverProcess = null;
}

module.exports = {
  ensureLocalWebServer,
  stopLocalWebServer,
  LOCAL_BASE_URL,
};
