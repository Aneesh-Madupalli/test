const messagesDiv = document.getElementById("messages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const providerSelect = document.getElementById("providerSelect");

// Append a message
function appendMessage(text, sender, provider = "") {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);

  if (sender === "bot" && provider) {
    const label = document.createElement("div");
    label.classList.add("bot-label");
    label.innerText = provider.toUpperCase();
    msg.appendChild(label);
  }

  const textNode = document.createElement("div");
  textNode.innerText = text;
  msg.appendChild(textNode);

  messagesDiv.appendChild(msg);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return msg;
}

// Show typing animation
function showTyping(provider) {
  const msg = document.createElement("div");
  msg.classList.add("message", "bot");
  const label = document.createElement("div");
  label.classList.add("bot-label");
  label.innerText = provider.toUpperCase();
  msg.appendChild(label);

  const typingDots = document.createElement("div");
  typingDots.style.display = "flex";
  typingDots.style.gap = "2px";
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");
    dot.classList.add("typing");
    typingDots.appendChild(dot);
  }
  msg.appendChild(typingDots);
  messagesDiv.appendChild(msg);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return msg;
}

// Get API key
async function getProviderAPIKey(provider) {
  const res = await window.electronAPI.loadAPIKey(provider);
  if (res.success) return res.apiKey;
  return null;
}

// Send user message
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  const provider = providerSelect.value;
  const apiKey = await getProviderAPIKey(provider);

  if (!apiKey) {
    appendMessage("❌ No API key found for " + provider, "bot", provider);
    return;
  }

  appendMessage(text, "user");
  userInput.value = "";

  // Show typing animation
  const typingMsg = showTyping(provider);

  const res = await window.electronAPI.getLLMResponse(provider, apiKey, text);

  typingMsg.remove(); // remove typing animation

  if (res.success) appendMessage(res.response, "bot", provider);
  else appendMessage("❌ Error: " + res.error, "bot", provider);
}

// Event listeners
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
