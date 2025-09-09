const providers = ["groq", "openrouter", "openai", "perplexity"];
const resultsDiv = document.getElementById("results");

// Load saved keys and set neutral status
async function loadAllKeys() {
  for (let provider of providers) {
    const res = await window.electronAPI.loadAPIKey(provider);
    if (res.success) {
      document.getElementById(`${provider}Key`).value = res.apiKey || "";
      updateStatus(provider, res.apiKey ? "neutral" : "neutral");
    }
  }
}
loadAllKeys();

// Update status indicator
function updateStatus(provider, status) {
  const statusEl = document.getElementById(`status-${provider}`);
  statusEl.classList.remove("success", "failed", "neutral");
  statusEl.classList.add(status);
}

// Save all keys
document.getElementById("saveAll").addEventListener("click", async () => {
  for (let provider of providers) {
    const apiKey = document.getElementById(`${provider}Key`).value;
    if (apiKey) await window.electronAPI.saveAPIKey(provider, apiKey);
  }
  resultsDiv.innerText = "✅ All keys saved successfully!";
});

// Test individual provider
document.querySelectorAll(".test-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const provider = btn.dataset.provider;
    const apiKey = document.getElementById(`${provider}Key`).value;

    if (!apiKey) {
      updateStatus(provider, "neutral");
      resultsDiv.innerText = `${provider}: ❌ No key provided`;
      return;
    }

    resultsDiv.innerText = `🔄 Testing ${provider}...`;
    const res = await window.electronAPI.testLLMConnection(provider, apiKey);

    if (res.success) {
      updateStatus(provider, "success"); // always green if successful
      resultsDiv.innerText = `✅ ${provider} connection successful!`;
    } else {
      updateStatus(provider, "failed");
      resultsDiv.innerText = `❌ ${provider} connection failed: ${res.error}`;
    }
  });
});
