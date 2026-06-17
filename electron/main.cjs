// SourceDeck desktop shell (Electron). Serves the built SPA (../dist) over an internal
// ephemeral-port http server so the renderer's absolute fetches (/casedeck.json, /assets/*)
// work exactly as in the browser - but inside a native window, with no port to collide with.
const { app, BrowserWindow, shell } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST = path.join(__dirname, "..", "dist");
const ICON = path.join(__dirname, "..", "..", "sourcedeck.ico");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".wasm": "application/wasm",
};

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        if (urlPath === "/") urlPath = "/index.html";
        // Resolve safely inside DIST.
        let filePath = path.normalize(path.join(DIST, urlPath));
        if (!filePath.startsWith(DIST)) {
          res.statusCode = 403;
          res.end("Forbidden");
          return;
        }
        // SPA fallback: unknown path with no file extension -> index.html.
        if (!fs.existsSync(filePath) && !path.extname(filePath)) {
          filePath = path.join(DIST, "index.html");
        }
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.statusCode = 404;
            res.end("Not found");
            return;
          }
          res.setHeader("Content-Type", MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.end(data);
        });
      } catch (e) {
        res.statusCode = 500;
        res.end("Server error");
      }
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

let win;

async function createWindow() {
  let port;
  try {
    port = await startServer();
  } catch (e) {
    port = null;
  }
  win = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1024,
    minHeight: 680,
    title: "SourceDeck",
    backgroundColor: "#0b0f14",
    autoHideMenuBar: true,
    icon: fs.existsSync(ICON) ? ICON : undefined,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  win.setMenuBarVisibility(false);

  // Open external links (if any) in the system browser, not inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  if (port && fs.existsSync(path.join(DIST, "index.html"))) {
    win.loadURL(`http://127.0.0.1:${port}/`);
  } else {
    win.loadURL(
      "data:text/html," +
        encodeURIComponent(
          "<body style='background:#0b0f14;color:#eef2f6;font-family:sans-serif;padding:40px'>" +
            "<h2>SourceDeck build not found.</h2><p>Run <code>npm run build</code> in the app folder, then relaunch.</p></body>",
        ),
    );
  }

  // Verification hook: when SD_SHOT is set, capture the rendered window to a PNG and quit.
  if (process.env.SD_SHOT) {
    win.webContents.once("did-finish-load", () => {
      setTimeout(async () => {
        try {
          const img = await win.webContents.capturePage();
          fs.writeFileSync(process.env.SD_SHOT, img.toPNG());
        } catch (e) {
          /* ignore */
        }
        app.quit();
      }, 2800);
    });
  }
}

app.whenReady().then(createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});
