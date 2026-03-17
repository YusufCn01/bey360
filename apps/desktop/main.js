const path = require("path");
const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require("electron");
const { ensureLocalDatabase } = require("./local-db");

const DEFAULT_CLOUD_URL = "https://bey360.com/giris";
const DEFAULT_LOCAL_URL = "http://127.0.0.1:3015/giris";
const START_URL_OVERRIDE = process.env.ELECTRON_START_URL?.trim();
const RUN_MODE = (process.env.B360_DESKTOP_RUN_MODE ?? "hybrid").trim().toLowerCase();

let mainWindow = null;
let activeStartUrl = START_URL_OVERRIDE || DEFAULT_CLOUD_URL;

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
    await ensureLocalDatabase();
    activeStartUrl = await resolveStartUrl();
    createMenu();
    createWindow(activeStartUrl);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(activeStartUrl);
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
