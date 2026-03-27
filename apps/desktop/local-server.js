const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { createRequire } = require("module");
const Module = require("module");
const { LOCAL_DB_URL, findPsqlExecutable } = require("./local-db");

const LOCAL_BASE_URL = "http://127.0.0.1:3015";
const DEMO_PASSWORD_HASH = "$2b$10$nAjWhrjU2hSdrQ14/Pkkd.BHd4P.EzQcK9lPk/0keAki7sG/JuJ7y";
let serverProcess = null;
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
}

function fileExists(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

function getRuntimeRoot() {
  const packagedRoot = path.join(process.resourcesPath || "", "app-bundle");
  if (fileExists(path.join(packagedRoot, "server.js"))) {
    return {
      kind: "bundle",
      root: packagedRoot,
    };
  }

  const localBundleRoot = path.join(__dirname, "app-bundle");
  if (fileExists(path.join(localBundleRoot, "server.js"))) {
    return {
      kind: "bundle",
      root: localBundleRoot,
    };
  }

  return {
    kind: "repo",
    root: path.resolve(__dirname, "../.."),
  };
}

function getRequireFromRuntime(runtimeRoot) {
  return createRequire(path.join(runtimeRoot, "package.json"));
}

function loadPrismaClient(runtimeRoot) {
  const vendorRoot = path.join(runtimeRoot, "prisma-runtime");
  const prismaEntry = path.join(vendorRoot, "@prisma", "client", "index.js");
  if (fileExists(prismaEntry)) {
    const queryEngineBinary = path.join(vendorRoot, ".prisma", "client", "query-engine-windows.exe");
    if (fileExists(queryEngineBinary)) {
      process.env.PRISMA_QUERY_ENGINE_BINARY = queryEngineBinary;
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = "";
    }
    const previousNodePath = process.env.NODE_PATH || "";
    process.env.NODE_PATH = previousNodePath
      ? `${vendorRoot}${path.delimiter}${previousNodePath}`
      : vendorRoot;
    Module._initPaths();
    return require(prismaEntry);
  }

  const requireFromRuntime = getRequireFromRuntime(runtimeRoot);
  return requireFromRuntime("@prisma/client");
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
  writeDesktopLog(`Yerel sunucu baslatiliyor: ${command} ${args.join(" ")}`);
  const child = spawn(command, args, {
    cwd: workdir,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    env,
  });

  child.stdout.on("data", (chunk) => {
    writeDesktopLog(`[local-web:stdout] ${chunk.toString().trim()}`);
  });

  child.stderr.on("data", (chunk) => {
    writeDesktopLog(`[local-web:stderr] ${chunk.toString().trim()}`);
  });

  child.on("close", (code) => {
    writeDesktopLog(`Yerel sunucu kapandi (code=${code ?? "null"})`);
  });

  return child;
}

function runCommand(command, args, workdir, env, options = {}) {
  const timeoutMs = Number(options.timeoutMs || 120000);
  return new Promise((resolve, reject) => {
    writeDesktopLog(`Komut baslatildi: ${command} ${args.join(" ")}`);
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

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Komut zaman asimina ugradi (${timeoutMs}ms): ${command} ${args.join(" ")}`));
    }, timeoutMs);

    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      if ((code ?? 1) === 0) {
        writeDesktopLog(`Komut tamamlandi: ${command} ${args.join(" ")}`);
        resolve({ stdout, stderr });
        return;
      }

      writeDesktopLog(`Komut basarisiz: ${command} ${args.join(" ")} | ${stderr || stdout}`);
      reject(new Error(stderr || stdout || `Komut basarisiz: ${command} ${args.join(" ")}`));
    });
  });
}

function parseDatabaseUrl(raw) {
  const url = new URL(raw || LOCAL_DB_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username || "postgres"),
    password: decodeURIComponent(url.password || "postgres"),
    database: url.pathname.replace(/^\//, "") || "muhasebe_local",
  };
}

function getMigrationFiles(runtimeRoot) {
  const migrationRoot = path.join(runtimeRoot, "prisma", "migrations");
  if (!fileExists(migrationRoot)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(migrationRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const sqlPath = path.join(migrationRoot, entry.name, "migration.sql");
    if (fileExists(sqlPath)) {
      files.push(sqlPath);
    }
  }

  return files.sort();
}

async function ensureDatabaseExists(psqlPath, connection, workdir, env) {
  writeDesktopLog("Bundled veritabani hazirlaniyor");
  const baseArgs = ["-h", connection.host, "-p", String(connection.port), "-U", connection.user];
  const envWithPassword = {
    ...env,
    PGPASSWORD: connection.password,
  };

  const dbCheck = await runCommand(
    psqlPath,
    [...baseArgs, "-d", "postgres", "-tAc", `SELECT 1 FROM pg_database WHERE datname='${connection.database.replace(/'/g, "''")}'`],
    workdir,
    envWithPassword,
  );

  if (dbCheck.stdout.trim() !== "1") {
    await runCommand(
      psqlPath,
      [...baseArgs, "-d", "postgres", "-c", `CREATE DATABASE "${connection.database}"`],
      workdir,
      envWithPassword,
    );
  }

  const schemaCheck = await runCommand(
    psqlPath,
    [...baseArgs, "-d", connection.database, "-tAc", "SELECT to_regclass('public.tenants') IS NOT NULL"],
    workdir,
    envWithPassword,
  );

  if (schemaCheck.stdout.trim().toLowerCase() === "t") {
    return {
      status: "ready",
      reason: "Yerel veritabani semasi zaten hazir",
    };
  }

  const migrationFiles = getMigrationFiles(workdir);
  if (migrationFiles.length === 0) {
    return {
      status: "error",
      reason: "Migration dosyalari bulunamadi",
    };
  }

  for (const sqlFile of migrationFiles) {
    await runCommand(
      psqlPath,
      [...baseArgs, "-d", connection.database, "-v", "ON_ERROR_STOP=1", "-f", sqlFile],
      workdir,
      envWithPassword,
    );
  }

  return {
    status: "ready",
    reason: "Migration SQL dosyalari uygulandi",
  };
}

async function seedDatabase(runtimeRoot, env) {
  writeDesktopLog("Demo tenant seed islemi basladi");
  const { PrismaClient, RoleScope, TenantStatus, UserStatus } = loadPrismaClient(runtimeRoot);
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
  });

  async function ensureDemoProduct(params) {
    let product = await prisma.products.findFirst({
      where: {
        tenantId: params.tenantId,
        code: params.code,
        deletedAt: null,
      },
    });

    if (!product) {
      product = await prisma.products.create({
        data: {
          tenantId: params.tenantId,
          code: params.code,
          name: params.name,
          status: "active",
          payload: {
            salePrice: params.salePrice,
            purchasePrice: params.purchasePrice,
            minStockLevel: params.minStockLevel,
            maxStockLevel: params.minStockLevel * 10,
            defaultUnit: "ADET",
            vatRate: 20,
          },
          occurredAt: new Date(),
        },
      });
    }

    const balanceCode = `${product.id}:main`;
    const existingBalance = await prisma.stockBalances.findFirst({
      where: {
        tenantId: params.tenantId,
        code: balanceCode,
        deletedAt: null,
      },
    });

    if (!existingBalance) {
      await prisma.stockBalances.create({
        data: {
          tenantId: params.tenantId,
          code: balanceCode,
          name: product.name,
          status: "active",
          payload: {
            productId: product.id,
            warehouseId: "main",
            quantity: params.quantity,
            reserved: 0,
            available: params.quantity,
          },
          occurredAt: new Date(),
        },
      });
    }

    return product;
  }

  try {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const tenant = await prisma.tenant.upsert({
      where: { slug: "demo-market" },
      update: {
        legalName: "Beyoglu Ticaret A.S.",
        tradeName: "Bey360 Demo",
        locale: "tr-TR",
        timezone: "Europe/Istanbul",
        currency: "TRY",
        status: TenantStatus.TRIALING,
        trialEndsAt,
        activeUntil: null,
      },
      create: {
        slug: "demo-market",
        legalName: "Beyoglu Ticaret A.S.",
        tradeName: "Bey360 Demo",
        taxNumber: "1234567890",
        locale: "tr-TR",
        timezone: "Europe/Istanbul",
        currency: "TRY",
        status: TenantStatus.TRIALING,
        trialEndsAt,
        activeUntil: null,
      },
    });

    const defaultPermissions = [
      { key: "dashboard:view", module: "dashboard", action: "view" },
      { key: "product:view", module: "product", action: "view" },
      { key: "product:create", module: "product", action: "create" },
      { key: "sale:pos", module: "sale", action: "pos" },
      { key: "sale:return", module: "sale", action: "return" },
      { key: "sale:discount", module: "sale", action: "discount" },
      { key: "report:view", module: "report", action: "view" },
      { key: "tenant:user.manage", module: "tenant", action: "user.manage" },
      { key: "einvoice:view", module: "einvoice", action: "view" },
      { key: "einvoice:manage", module: "einvoice", action: "manage" },
    ];

    for (const permission of defaultPermissions) {
      await prisma.permission.upsert({
        where: { key: permission.key },
        update: permission,
        create: permission,
      });
    }

    const ownerRole = await prisma.role.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: "tenant-owner",
        },
      },
      update: {
        name: "Tenant Owner",
        scope: RoleScope.TENANT,
        isSystem: true,
      },
      create: {
        tenantId: tenant.id,
        code: "tenant-owner",
        name: "Tenant Owner",
        scope: RoleScope.TENANT,
        isSystem: true,
      },
    });

    const permissions = await prisma.permission.findMany();
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId_contextKey: {
            roleId: ownerRole.id,
            permissionId: permission.id,
            contextKey: "global",
          },
        },
        update: {},
        create: {
          roleId: ownerRole.id,
          permissionId: permission.id,
        },
      });
    }

    const owner = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: "owner@demo.local",
        },
      },
      update: {
        username: "owner",
        firstName: "Sistem",
        lastName: "Yoneticisi",
        passwordHash: DEMO_PASSWORD_HASH,
        status: UserStatus.ACTIVE,
      },
      create: {
        tenantId: tenant.id,
        email: "owner@demo.local",
        username: "owner",
        firstName: "Sistem",
        lastName: "Yoneticisi",
        passwordHash: DEMO_PASSWORD_HASH,
        status: UserStatus.ACTIVE,
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: owner.id,
          roleId: ownerRole.id,
        },
      },
      update: {},
      create: {
        userId: owner.id,
        roleId: ownerRole.id,
        assignedBy: "desktop-seed",
      },
    });

    await prisma.tenantModule.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: "pos",
        },
      },
      update: { isEnabled: true, name: "POS" },
      create: {
        tenantId: tenant.id,
        code: "pos",
        name: "POS",
        isEnabled: true,
      },
    });

    await ensureDemoProduct({
      tenantId: tenant.id,
      code: "URUN-DEMO-001",
      name: "Espresso Cekirdegi 1kg",
      salePrice: 420,
      purchasePrice: 300,
      minStockLevel: 8,
      quantity: 6,
    });
    await ensureDemoProduct({
      tenantId: tenant.id,
      code: "URUN-DEMO-002",
      name: "Filtre Kahve 500gr",
      salePrice: 260,
      purchasePrice: 180,
      minStockLevel: 10,
      quantity: 17,
    });
    await ensureDemoProduct({
      tenantId: tenant.id,
      code: "URUN-DEMO-003",
      name: "Bardak Kapak Seti",
      salePrice: 80,
      purchasePrice: 40,
      minStockLevel: 15,
      quantity: 9,
    });

    return {
      status: "ready",
      reason: "Demo tenant ve yonetici kullanici hazirlandi",
    };
  } catch (error) {
    writeDesktopLog(`Seed hatasi: ${error instanceof Error ? `${error.message}\n${error.stack || ""}` : String(error)}`);
    return {
      status: "error",
      reason: error instanceof Error ? error.message : "Seed basarisiz",
    };
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

async function prepareRepoDatabase(repoRoot, env) {
  writeDesktopLog("Repo veritabani hazirlaniyor");
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

async function prepareBundledDatabase(runtimeRoot, env) {
  writeDesktopLog("Paketlenmis veritabani hazirlaniyor");
  const psqlPath = findPsqlExecutable();
  if (!psqlPath) {
    return {
      status: "error",
      reason: "psql.exe bulunamadi. PostgreSQL kurulumu tamamlanmamis olabilir.",
    };
  }

  try {
    const connection = parseDatabaseUrl(env.DATABASE_URL);
    const migrationResult = await ensureDatabaseExists(psqlPath, connection, runtimeRoot, env);
    if (migrationResult.status !== "ready") {
      return migrationResult;
    }

    const seedResult = await seedDatabase(runtimeRoot, env);
    if (seedResult.status !== "ready") {
      return seedResult;
    }

    return {
      status: "ready",
      reason: `${migrationResult.reason}; ${seedResult.reason}`,
    };
  } catch (error) {
    return {
      status: "error",
      reason: error instanceof Error ? error.message : "Bundled veritabani hazirlanamadi",
    };
  }
}

async function ensureLocalWebServer() {
  writeDesktopLog("Yerel web sunucusu bootstrap basladi");
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

  const runtime = getRuntimeRoot();
  const startScriptPath = path.join(runtime.root, "scripts", "start.mjs");
  const nextBuildPath = path.join(runtime.root, ".next", "BUILD_ID");
  const bundledServerPath = path.join(runtime.root, "server.js");

  if (
    runtime.kind === "repo" &&
    (!fileExists(startScriptPath) || !fileExists(path.join(runtime.root, "node_modules")))
  ) {
    return {
      status: "unavailable",
      url: null,
      reason: "Yerel web sunucusu dosyalari bulunamadi",
    };
  }

  if (runtime.kind === "bundle" && !fileExists(bundledServerPath)) {
    return {
      status: "unavailable",
      url: null,
      reason: "Paketlenmis web sunucusu bulunamadi",
    };
  }

  const env = {
    ...process.env,
    NODE_ENV: runtime.kind === "bundle" ? "production" : process.env.NODE_ENV || "development",
    HOST: "127.0.0.1",
    PORT: "3015",
    APP_URL: `${LOCAL_BASE_URL}`,
    APP_SECRET: process.env.APP_SECRET || "bey360-desktop-local-secret-please-change-1234567890",
    DEFAULT_TENANT_SLUG: process.env.DEFAULT_TENANT_SLUG || "demo-market",
    DATABASE_TARGET: "local",
    LOCAL_DATABASE_URL: process.env.LOCAL_DATABASE_URL || LOCAL_DB_URL,
    DATABASE_URL: process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL || LOCAL_DB_URL,
  };

  const dbPreparation =
    runtime.kind === "bundle"
      ? await prepareBundledDatabase(runtime.root, env)
      : await prepareRepoDatabase(runtime.root, env);

  if (dbPreparation.status !== "ready") {
    writeDesktopLog(`DB hazirlama basarisiz: ${dbPreparation.reason}`);
    return {
      status: "error",
      url: null,
      reason: dbPreparation.reason,
    };
  }

  try {
    if (runtime.kind === "bundle") {
      serverProcess = spawnServer(process.execPath, [bundledServerPath], runtime.root, env);
    } else if (fileExists(nextBuildPath)) {
      serverProcess = spawnServer(process.execPath, [startScriptPath], runtime.root, env);
    } else {
      const requireFromRepo = getRequireFromRuntime(runtime.root);
      const nextBin = requireFromRepo.resolve("next/dist/bin/next");
      serverProcess = spawnServer(
        process.execPath,
        [nextBin, "dev", "--webpack", "--hostname", "127.0.0.1", "--port", "3015"],
        runtime.root,
        env,
      );
    }

    const healthy = await waitForLocalHealth(runtime.kind === "bundle" || fileExists(nextBuildPath) ? 25000 : 60000);
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

    writeDesktopLog("Yerel web sunucusu saglik kontrolunu gecti");
    return {
      status: "ready",
      url: `${LOCAL_BASE_URL}/giris`,
      reason: runtime.kind === "bundle" ? "Paketlenmis yerel sunucu baslatildi" : "Yerel sunucu baslatildi",
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
  setDesktopLogWriter(writer) {
    externalLogWriter = typeof writer === "function" ? writer : null;
  },
};
