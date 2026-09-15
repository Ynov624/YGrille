const { app, BrowserWindow, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const config = require("./config.js");

const PORT = 17321;

/** Génère un secret une seule fois et le persiste dans userData (~/AppData sur Windows). */
function ensureSecret(userDataDir, filename) {
  const secretPath = path.join(userDataDir, filename);
  if (!fs.existsSync(secretPath)) {
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.writeFileSync(secretPath, crypto.randomBytes(32).toString("hex"), "utf-8");
  }
  return fs.readFileSync(secretPath, "utf-8").trim();
}

/**
 * Démarre le serveur Express (API + fichiers statiques du client) sur un port local fixe.
 * Le code serveur est en ESM (`import`/`export`), donc chargé via `import()` dynamique
 * depuis ce process principal en CommonJS.
 *
 * La base de données est la base Turso partagée par toutes les installations
 * desktop (voir electron/config.js) — chaque install ne fait tourner que le
 * serveur Express en local, les données vivent côté hébergeur.
 */
async function startServer() {
  const userDataDir = app.getPath("userData");
  process.env.JWT_SECRET = ensureSecret(userDataDir, "jwt-secret.txt");
  process.env.CLIENT_DIST = path.join(__dirname, "..", "client", "dist");

  process.env.TURSO_DATABASE_URL = config.TURSO_DATABASE_URL;
  process.env.TURSO_AUTH_TOKEN = config.TURSO_AUTH_TOKEN;
  process.env.RESEND_API_KEY = config.RESEND_API_KEY;
  process.env.MAIL_FROM = config.MAIL_FROM;

  const serverDir = path.join(__dirname, "..", "server", "src");
  const { createApp } = await import(pathToFileURL(path.join(serverDir, "app.js")).href);
  const { initDatabase } = await import(pathToFileURL(path.join(serverDir, "db", "connection.js")).href);

  await initDatabase();
  const expressApp = createApp();

  return new Promise((resolve, reject) => {
    const server = expressApp.listen(PORT, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 960,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error(`[main] did-fail-load: ${code} ${desc}`);
  });
  win.on("closed", () => console.log("[main] window closed"));
  win.loadURL(`http://localhost:${PORT}/`);
}

process.on("uncaughtException", (err) => {
  console.error("[main] uncaughtException:", err);
});

app.setName("YGrid");

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    console.log("[main] app ready, starting server…");
    try {
      await startServer();
      console.log(`[main] server listening on http://localhost:${PORT}`);
    } catch (err) {
      console.error("[main] server failed to start:", err);
      dialog.showErrorBox(
        "Erreur au démarrage",
        `Le serveur local n'a pas pu démarrer sur le port ${PORT}.\n\n${err.message}`
      );
      app.quit();
      return;
    }

    createWindow();
    console.log("[main] window created");

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    console.log("[main] all windows closed");
    if (process.platform !== "darwin") app.quit();
  });
}
