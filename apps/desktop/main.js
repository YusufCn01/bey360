const path = require("path");
const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require("electron");
const { ensureLocalDatabase } = require("./local-db");
const { ensureLocalWebServer, stopLocalWebServer } = require("./local-server");

const DEFAULT_CLOUD_URL = "https://bey360.com/giris";
const DEFAULT_LOCAL_URL = "http://127.0.0.1:3015/giris";
const START_URL_OVERRIDE = process.env.ELECTRON_START_URL?.trim();
const RUN_MODE = (process.env.B360_DESKTOP_RUN_MODE ?? "local").trim().toLowerCase();

let mainWindow = null;
let activeStartUrl = START_URL_OVERRIDE || DEFAULT_CLOUD_URL;

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
    mainWindow.show();
  });

  mainWindow.webContents.on("did-fail-load", async () => {
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
    if (!mainWindow) {
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    const localDb = await ensureLocalDatabase();
    const localWeb = await ensureLocalWebServer();

    if (localWeb.status === "ready" && localWeb.url) {
      activeStartUrl = localWeb.url;
    } else if (RUN_MODE === "local") {
      activeStartUrl = createLocalFailurePage(`Local DB: ${localDb.reason}\nLocal Web: ${localWeb.reason}`);
    } else {
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
  });

  app.on("window-all-closed", () => {
    stopLocalWebServer();
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
