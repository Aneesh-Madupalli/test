# OpenClaw — Step-by-Step Setup with Lilly Code

---

## Prerequisites

1. `lilly-code` installed and authenticated (`lilly-code login`)
2. Node.js 22.19+ or Node 24
3. Your Lilly employee ID (e.g., `L073881`)
4. Your Lilly email address

---

## Step 1 — Install OpenClaw

```bash
npm install -g openclaw@latest
# or
pnpm add -g openclaw@latest
```

---

## Step 2 — Get Your Lilly Code Token

```bash
# Get your current token (store it securely)
lilly-code token
# Output: eyJhbGciOi...  (copy this)
```

---

## Step 3 — Set Environment Variables

Add to your `~/.bashrc`, `~/.zshrc`, or Windows environment:

```bash
export LILLY_CODE_TOKEN="<token-from-step-2>"
export LILLY_USER_ID="L073881"                    # your Lilly employee ID
export LILLY_USER_EMAIL="your.name@lilly.com"     # your Lilly email
export LILLY_GATEWAY_URL="https://lilly-code-server.api.gateway-dev.llm.lilly.com/v1"
```

---

## Step 4 — Configure OpenClaw

Create or edit `~/.openclaw/openclaw.json`:

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "lilly-code": {
        "baseUrl": "${LILLY_GATEWAY_URL}",
        "apiKey": "${LILLY_CODE_TOKEN}",
        "api": "openai-completions",
        "headers": {
          "X-User-Id": "${LILLY_USER_ID}",
          "X-User-Email": "${LILLY_USER_EMAIL}"
        },
        "models": [
          {
            "id": "claude-sonnet-4-6",
            "name": "Lilly Claude Sonnet (Default)",
            "contextWindow": 200000,
            "maxTokens": 8192,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
          },
          {
            "id": "claude-opus-4-6-v1",
            "name": "Lilly Claude Opus (Complex tasks)",
            "contextWindow": 200000,
            "maxTokens": 8192,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
          },
          {
            "id": "claude-haiku-4-5-20251001-v1",
            "name": "Lilly Claude Haiku (Fast)",
            "contextWindow": 200000,
            "maxTokens": 4096,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
          },
          {
            "id": "gpt-5.4-2026-03-05",
            "name": "Lilly GPT-5.4 (Code generation)",
            "contextWindow": 128000,
            "maxTokens": 8192,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 }
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "lilly-code/claude-sonnet-4-6"
      }
    }
  }
}
```

---

## Step 5 — Start OpenClaw

```bash
# Interactive setup (first time)
openclaw onboard --install-daemon

# Or start gateway directly
openclaw gateway --port 18789

# Verify it's working
openclaw agent --message "Hello, are you using Lilly models?"
openclaw doctor
```

---

## Step 6 — Connect Your Channels

```bash
# Start onboarding wizard (handles channel setup)
openclaw onboard

# Or configure specific channels:
openclaw gateway status
```

Follow the prompts to connect WhatsApp, Telegram, Discord, or any other channel.

---

## If Using lilly-code proxy (Recommended)

Once `lilly-code proxy` is built (see `11_LillyCode_Proxy_Spec.md`), simplify your config to:

```bash
# Terminal 1: start proxy
lilly-code proxy --port 11434

# Terminal 2: start OpenClaw
openclaw gateway
```

And your `openclaw.json` becomes much simpler:

```json
{
  "models": {
    "providers": {
      "lilly-code": {
        "baseUrl": "http://localhost:11434/v1",
        "apiKey": "lilly-proxy",
        "api": "openai-completions",
        "models": [
          { "id": "claude-sonnet-4-6", "name": "Lilly Claude Sonnet" },
          { "id": "claude-opus-4-6-v1", "name": "Lilly Claude Opus" },
          { "id": "claude-haiku-4-5-20251001-v1", "name": "Lilly Claude Haiku" },
          { "id": "gpt-5.4-2026-03-05", "name": "Lilly GPT-5.4" }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": { "primary": "lilly-code/claude-sonnet-4-6" }
    }
  }
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Token expired — run `lilly-code login` again |
| 429 Rate Limited | Reduce usage or switch to Haiku model |
| Model not found | Check model ID with `lilly-code models list` |
| No response in channel | Run `openclaw doctor` |
| Gateway won't start | Check `openclaw gateway status` |
