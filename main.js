// --------------------------- IMPORTS ---------------------------
const path = require("path");
const fs = require("fs-extra");
const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");

// --------------------------- GLOBAL VARIABLES ---------------------------
let mainWindow;
const settingsPath = path.join(app.getPath("userData"), "settings.json");
const chatPath = path.join(app.getPath("userData"), "chat_history.json");

// --------------------------- SETTINGS HANDLING ---------------------------
function loadSettings() {
  if (fs.existsSync(settingsPath)) return fs.readJsonSync(settingsPath);
  return {};
}

function saveSettings(settings) {
  fs.writeJsonSync(settingsPath, settings, { spaces: 2 });
}

// --------------------------- CHAT MEMORY HANDLING ---------------------------
function loadChat(provider) {
  if (!fs.existsSync(chatPath)) return [];
  const allChats = fs.readJsonSync(chatPath);
  return allChats[provider] || [];
}

function saveChat(provider, message) {
  let allChats = {};
  if (fs.existsSync(chatPath)) allChats = fs.readJsonSync(chatPath);

  if (!allChats[provider]) allChats[provider] = [];
  allChats[provider].push(message);
  fs.writeJsonSync(chatPath, allChats, { spaces: 2 });
}

// --------------------------- CREATE WINDOW ---------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    frame: false,
    show: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.setContentProtection(true);
  mainWindow.setSkipTaskbar(true);
  if (process.platform === "darwin") app.dock.hide();

  mainWindow.loadFile("pages/home.html");
  mainWindow.once("ready-to-show", () => mainWindow.hide());
}

// --------------------------- GLOBAL SHORTCUT ---------------------------
function registerShortcuts() {
  globalShortcut.register("CommandOrControl+\\", () => {
    if (!mainWindow) return;
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.showInactive();
  });
}

// --------------------------- APP EVENTS ---------------------------
app.whenReady().then(() => {
  createWindow();
  registerShortcuts();
});

app.on("will-quit", () => globalShortcut.unregisterAll());

// --------------------------- WINDOW CONTROLS ---------------------------
ipcMain.on("window-control", (event, action) => {
  if (!mainWindow) return;
  switch (action) {
    case "minimize": mainWindow.minimize(); break;
    case "maximize": mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(); break;
    case "close": mainWindow.close(); break;
  }
});

// --------------------------- NAVIGATION ---------------------------
ipcMain.on("navigate", (event, page) => {
  if (mainWindow) mainWindow.loadFile(`pages/${page}.html`);
});

// --------------------------- SETTINGS IPC ---------------------------
ipcMain.handle("save-api-key", async (event, provider, apiKey) => {
  try {
    const settings = loadSettings();
    settings[provider] = apiKey;
    saveSettings(settings);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("load-api-key", async (event, provider) => {
  try {
    const settings = loadSettings();
    return { success: true, apiKey: settings[provider] || "" };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --------------------------- CHAT MEMORY IPC ---------------------------
ipcMain.handle("load-chat", (event, provider) => {
  try {
    const history = loadChat(provider);
    return { success: true, history };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("save-chat", (event, provider, message) => {
  try {
    saveChat(provider, message);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --------------------------- LLM CONNECTION TEST ---------------------------
ipcMain.handle("test-llm-connection", async (event, provider, apiKey) => {
  try {
    let url, headers;
    switch (provider) {
      case "groq": url = "https://api.groq.com/openai/v1/models"; headers = { Authorization: `Bearer ${apiKey}` }; break;
      case "openrouter": url = "https://openrouter.ai/api/v1/models"; headers = { Authorization: `Bearer ${apiKey}` }; break;
      case "openai": url = "https://api.openai.com/v1/models"; headers = { Authorization: `Bearer ${apiKey}` }; break;
      case "perplexity": url = "https://api.perplexity.ai/models"; headers = { Authorization: `Bearer ${apiKey}` }; break;
      default: throw new Error("Unknown provider");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await res.json();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --------------------------- GET LLM RESPONSE ---------------------------
ipcMain.handle("getLLMResponse", async (event, provider, apiKey, prompt) => {
  try {
    let url, headers, body;
    switch (provider) {
      case "groq":
        url = "https://api.groq.com/openai/v1/completions";
        headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
        body = JSON.stringify({ model: "gpt-4", prompt, max_tokens: 200 });
        break;
      case "openrouter":
        url = "https://openrouter.ai/api/v1/completions";
        headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
        body = JSON.stringify({ model: "gpt-4", prompt, max_tokens: 200 });
        break;
      case "openai":
        url = "https://api.openai.com/v1/completions";
        headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
        body = JSON.stringify({ model: "text-davinci-003", prompt, max_tokens: 200 });
        break;
      case "perplexity":
        url = "https://api.perplexity.ai/completions";
        headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
        body = JSON.stringify({ prompt });
        break;
      default:
        throw new Error("Unknown provider");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, { method: "POST", headers, body, signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    let resultText;
    if (provider === "perplexity") resultText = data.answer || "No response";
    else if (data.choices && data.choices[0]) resultText = data.choices[0].text || "No response";
    else resultText = JSON.stringify(data);

    return { success: true, response: resultText.trim() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
