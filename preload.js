const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  navigate: (page) => ipcRenderer.send("navigate", page),
  setContentProtection: (enable) =>
    ipcRenderer.send("set-content-protection", enable),
  onProtectionStatus: (callback) =>
    ipcRenderer.on("protection-status", (event, status) => callback(status)),
});
