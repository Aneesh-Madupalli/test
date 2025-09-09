const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Window controls
  windowControl: (action) => ipcRenderer.send("window-control", action),
  
  // Navigation
  navigate: (page) => ipcRenderer.send("navigate", page),

  // Settings (LLM API keys)
  saveAPIKey: (provider, apiKey) => ipcRenderer.invoke("save-api-key", provider, apiKey),
  loadAPIKey: (provider) => ipcRenderer.invoke("load-api-key", provider),

  // Chat memory
  loadChat: (provider) => ipcRenderer.invoke("load-chat", provider),
  saveChat: (provider, message) => ipcRenderer.invoke("save-chat", provider, message),

  // LLM requests
  getLLMResponse: (provider, apiKey, prompt) => ipcRenderer.invoke("getLLMResponse", provider, apiKey, prompt),
  testLLMConnection: (provider, apiKey) => ipcRenderer.invoke("test-llm-connection", provider, apiKey),
});
