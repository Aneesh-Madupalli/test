const { app, BrowserWindow } = require("electron");
const path = require("path");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    skipTaskbar: true, // 👈 Hide from taskbar
    frame: false, // 👈 Remove window border (optional)
    show: true, // 👈 Show window to user
    transparent: false, // 👈 Keep visible
    alwaysOnTop: true, // 👈 Optional: keep above other windows
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.setContentProtection(true); // 🔐 Protect content

  mainWindow.loadFile("pages/home.html");
}

app.whenReady().then(createWindow);
