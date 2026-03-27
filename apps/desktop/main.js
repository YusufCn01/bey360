const fs = require("fs");
const path = require("path");
const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require("electron");
const { ensureLocalDatabase } = require("./local-db");
const { ensureLocalWebServer, stopLocalWebServer } = require("./local-server");

const DEFAULT_CLOUD_URL = "https://bey360.com/giris";
const DEFAULT_LOCAL_URL = "http://127.0.0.1:3015/giris";
const START_URL_OVERRIDE = process.env.ELECTRON_START_URL?.trim();
const RUN_MODE = (process.env.B360_DESKTOP_RUN_MODE ?? "local").trim().toLowerCase();
const ICON_PATH = path.join(__dirname, "icon.png");

let mainWindow = null;
let splashWindow = null;
let activeStartUrl = START_URL_OVERRIDE || DEFAULT_CLOUD_URL;
let logFilePath = "";

function fileExists(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

function writeStartupLog(message) {
  try {
    if (!logFilePath) {
      return;
    }

    fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] ${message}\n`, "utf8");
  } catch {
    // ignore logging errors
  }
}

function createLocalFailurePage(detail) {
  const safeDetail = String(detail || "Bilinmeyen hata")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Bey360 Masaustu</title>
    <style>
      body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:#081425;color:#e8eefc;display:flex;min-height:100vh;align-items:center;justify-content:center}
      .card{width:min(760px,92vw);background:#0f1d33;border:1px solid #223453;border-radius:20px;padding:32px;box-shadow:0 24px 60px rgba(0,0,0,.35)}
      h1{margin:0 0 12px;font-size:32px}
      p{font-size:16px;line-height:1.6;color:#c5d2ea}
      .code{margin-top:16px;padding:16px;border-radius:14px;background:#08111f;border:1px solid #1f304f;color:#9fd2ff;white-space:pre-wrap;word-break:break-word}
      .list{margin:20px 0 0;padding-left:18px;color:#dbe7ff}
      .list li{margin:8px 0}
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Yerel veritabani hazir degil</h1>
      <p>Bey360 masaustu uygulamasi yerel PostgreSQL baglantisini kuramadi. Bu nedenle uygulama local modda acilamadi.</p>
      <ul class="list">
        <li>Docker Desktop kullaniyorsan daemon'u baslat.</li>
        <li>Laragon/PostgreSQL kullaniyorsan veritabani servisinin calistigindan emin ol.</li>
        <li>Gerekirse <strong>LOCAL_DATABASE_URL</strong> ayarini local veritabanina gore tanimla.</li>
      </ul>
      <div class="code">${safeDetail}</div>
    </main>
  </body>
</html>`)}`;
}

function createFatalStartupPage(title, detail) {
  const safeTitle = String(title || "Bey360 acilis hatasi")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const safeDetail = String(detail || "Bilinmeyen hata")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Bey360 Hata</title>
    <style>
      body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:#081425;color:#e8eefc;display:flex;min-height:100vh;align-items:center;justify-content:center}
      .card{width:min(820px,92vw);background:#0f1d33;border:1px solid #223453;border-radius:20px;padding:32px;box-shadow:0 24px 60px rgba(0,0,0,.35)}
      h1{margin:0 0 12px;font-size:32px}
      p{font-size:16px;line-height:1.6;color:#c5d2ea}
      .code{margin-top:16px;padding:16px;border-radius:14px;background:#08111f;border:1px solid #1f304f;color:#9fd2ff;white-space:pre-wrap;word-break:break-word}
    </style>
  </head>
  <body>
    <main class="card">
      <h1>${safeTitle}</h1>
      <p>Bey360 masaustu uygulamasi baslatilirken kritik bir hata olustu.</p>
      <div class="code">${safeDetail}</div>
    </main>
  </body>
</html>`)}`;
}

function createMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [{ role: "about" }, { type: "separator" }, { role: "quit" }],
          },
        ]
      : []),
    {
      label: "Gorunum",
      submenu: [
        { role: "reload", label: "Yenile" },
        { role: "forceReload", label: "Zorla Yenile" },
        { role: "togglefullscreen", label: "Tam Ekran" },
        { role: "toggleDevTools", label: "Gelistirici Araclari" },
      ],
    },
    {
      label: "Pencere",
      submenu: [{ role: "minimize", label: "Kucult" }, { role: "close", label: "Kapat" }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createSplashMarkup(title, detail, progress) {
  const safeTitle = String(title || "Bey360 baslatiliyor")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const safeDetail = String(detail || "Lokal servisler hazirlaniyor")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const safeProgress = Math.max(4, Math.min(100, Number(progress || 0)));

  return `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Bey360</title>
    <style>
      :root{color-scheme:dark}
      *{box-sizing:border-box}
      body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at top,#18345f 0,#081323 54%,#040b15 100%);font-family:Segoe UI,Arial,sans-serif;color:#eef4ff}
      .shell{width:min(760px,92vw);padding:40px;border-radius:28px;background:linear-gradient(180deg,rgba(16,29,52,.96),rgba(9,17,31,.98));border:1px solid rgba(122,162,255,.18);box-shadow:0 30px 90px rgba(0,0,0,.4)}
      .brand{display:flex;align-items:center;gap:18px;margin-bottom:26px}
      .logo{width:74px;height:74px;border-radius:24px;background:linear-gradient(135deg,#2db4ff,#5a3bff);display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:800;box-shadow:0 18px 38px rgba(68,111,255,.4)}
      .eyebrow{font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#78b8ff}
      .name{font-size:34px;font-weight:800;line-height:1.1}
      .tag{font-size:15px;color:#c6d3ec;margin-top:6px}
      h1{margin:0 0 10px;font-size:26px}
      p{margin:0;color:#bfd0ee;font-size:16px;line-height:1.6}
      .progress-wrap{margin-top:26px;padding:18px;border-radius:18px;background:rgba(7,18,36,.82);border:1px solid rgba(88,125,196,.28)}
      .progress-head{display:flex;justify-content:space-between;gap:16px;margin-bottom:12px;font-size:14px;color:#d7e4ff}
      .bar{height:12px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}
      .bar>span{display:block;height:100%;width:${safeProgress}%;border-radius:999px;background:linear-gradient(90deg,#2dd4ff,#68ffb0)}
      .foot{display:flex;justify-content:space-between;gap:12px;margin-top:18px;font-size:13px;color:#7ea1cf}
    </style>
  </head>
  <body>
    <main class="shell">
      <div class="brand">
        <div class="logo">B</div>
        <div>
          <div class="eyebrow">ERP & POS Cozumleri</div>
          <div class="name">Bey360</div>
          <div class="tag">Yerel servisler ve veritabani kurulumu otomatik olarak hazirlaniyor.</div>
        </div>
      </div>
      <h1>${safeTitle}</h1>
      <p>${safeDetail}</p>
      <section class="progress-wrap">
        <div class="progress-head">
          <span>Kurulum ilerlemesi</span>
          <strong>%${safeProgress}</strong>
        </div>
        <div class="bar"><span></span></div>
        <div class="foot">
          <span>Veritabani • Migration • Seed • Uygulama Baslangici</span>
          <span>Bey360 Desktop</span>
        </div>
      </section>
    </main>
  </body>
</html>`)}`;
}

function updateSplash(title, detail, progress) {
  if (!splashWindow || splashWindow.isDestroyed()) {
    return;
  }

  splashWindow.loadURL(createSplashMarkup(title, detail, progress)).catch(() => undefined);
}

function createSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    updateSplash("Bey360 baslatiliyor", "Lokal servisler hazirlaniyor", 8);
    return splashWindow;
  }

  splashWindow = new BrowserWindow({
    width: 760,
    height: 460,
    frame: false,
    transparent: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    closable: false,
    alwaysOnTop: true,
    center: true,
    show: true,
    backgroundColor: "#071326",
    icon: fileExists(ICON_PATH) ? ICON_PATH : undefined,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  updateSplash("Bey360 baslatiliyor", "Lokal servisler hazirlaniyor", 8);
  writeStartupLog("Splash penceresi olusturuldu");
  return splashWindow;
}

function ensureVisibleErrorWindow(title, detail) {
  const failurePage = createFatalStartupPage(title, detail);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(failurePage).catch(() => undefined);
    mainWindow.show();
    return;
  }

  createWindow(failurePage);
}

async function canReach(url) {
  try {
    const target = new URL(url);
    target.pathname = "/api/health";
    target.search = "";
    target.hash = "";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    const response = await fetch(target.toString(), {
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

async function resolveStartUrl() {
  if (START_URL_OVERRIDE) {
    return START_URL_OVERRIDE;
  }

  if (RUN_MODE === "cloud") {
    return DEFAULT_CLOUD_URL;
  }

  if (RUN_MODE === "local") {
    return DEFAULT_LOCAL_URL;
  }

  const localAlive = await canReach(DEFAULT_LOCAL_URL);
  if (localAlive) {
    return DEFAULT_LOCAL_URL;
  }

  return DEFAULT_CLOUD_URL;
}

function createWindow(startUrl) {
  writeStartupLog(`Ana pencere olusturuluyor: ${startUrl}`);
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: "#071326",
    title: "Bey360 ERP & POS",
    autoHideMenuBar: false,
    fullscreen: true,
    show: false,
    icon: fileExists(ICON_PATH) ? ICON_PATH : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return { action: "deny" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.maximize();
    mainWindow.setFullScreen(true);
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.on("did-fail-load", async () => {
    writeStartupLog(`did-fail-load: ${startUrl}`);
    const result = await dialog.showMessageBox(mainWindow, {
      type: "error",
      title: "Bey360 baglanti hatasi",
      message: "Uygulama acilirken servis baglantisi kurulamadi.",
      detail: `Acilmaya calisilan adres: ${startUrl}`,
      buttons: ["Tekrar Dene", "Kapat"],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      mainWindow.loadURL(startUrl);
      return;
    }

    app.quit();
  });

  mainWindow.loadURL(startUrl);
}

ipcMain.handle("desktop:toggle-fullscreen", () => {
  if (!mainWindow) {
    return false;
  }
  const next = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(next);
  return next;
});

ipcMain.handle("desktop:get-version", () => app.getVersion());
ipcMain.handle("desktop:get-start-url", () => activeStartUrl);
ipcMain.handle("desktop:close-app", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  } else {
    app.quit();
  }
  return true;
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    writeStartupLog("Ikinci instance algilandi");
    if (!mainWindow) {
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  });

  process.on("uncaughtException", (error) => {
    const detail = error instanceof Error ? `${error.message}\n\n${error.stack || ""}` : String(error);
    writeStartupLog(`uncaughtException: ${detail}`);
    ensureVisibleErrorWindow("Beklenmeyen masaustu hatasi", detail);
  });

  process.on("unhandledRejection", (reason) => {
    const detail = reason instanceof Error ? `${reason.message}\n\n${reason.stack || ""}` : String(reason);
    writeStartupLog(`unhandledRejection: ${detail}`);
    ensureVisibleErrorWindow("Masaustu baslatma hatasi", detail);
  });

  app.whenReady().then(async () => {
    try {
      const userDataPath = app.getPath("userData");
      fs.mkdirSync(userDataPath, { recursive: true });
      logFilePath = path.join(userDataPath, "desktop-startup.log");
      writeStartupLog("Uygulama baslatildi");
      writeStartupLog(`Run mode: ${RUN_MODE}`);

      createSplashWindow();
      updateSplash("Yerel veritabani kontrol ediliyor", "PostgreSQL kurulumu ve baglanti dogrulamasi yapiliyor", 18);
      const localDb = await ensureLocalDatabase();
      writeStartupLog(`Local DB sonucu: ${JSON.stringify(localDb)}`);

      updateSplash("Yerel uygulama hazirlaniyor", "Migration, seed ve lokal web sunucusu baslatiliyor", 56);
      const localWeb = await ensureLocalWebServer();
      writeStartupLog(`Local web sonucu: ${JSON.stringify(localWeb)}`);

      if (localWeb.status === "ready" && localWeb.url) {
        activeStartUrl = localWeb.url;
      } else if (RUN_MODE === "local") {
        updateSplash("Bey360 yerel modda acilamadi", "Detaylar hata ekranina aktariliyor", 96);
        activeStartUrl = createLocalFailurePage(`Local DB: ${localDb.reason}\nLocal Web: ${localWeb.reason}`);
      } else {
        updateSplash("Bulut moda geciliyor", "Yerel servisler hazir degil, yedek acilis adresi kullaniliyor", 80);
        activeStartUrl = await resolveStartUrl();
      }

      createMenu();
      createWindow(activeStartUrl);

      if (localWeb.status !== "ready" && RUN_MODE !== "cloud") {
        dialog
          .showMessageBox({
            type: "warning",
            title: "Yerel mod hazir degil",
            message: "Masaustu uygulama yerel servisi baslatamadi, bulut moda gecildi.",
            detail: `Local DB: ${localDb.reason}\nLocal Web: ${localWeb.reason}`,
          })
          .catch(() => undefined);
      }

      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow(activeStartUrl);
        }
      });
    } catch (error) {
      const detail = error instanceof Error ? `${error.message}\n\n${error.stack || ""}` : String(error);
      writeStartupLog(`Startup catch: ${detail}`);
      ensureVisibleErrorWindow("Bey360 acilis hatasi", detail);
    }
  });

  app.on("window-all-closed", () => {
    writeStartupLog("Tum pencereler kapandi");
    stopLocalWebServer();
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
      splashWindow = null;
    }
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
