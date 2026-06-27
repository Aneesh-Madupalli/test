# Quick Start — Get Running in 10 Minutes

**Goal:** Use Lilly Code models in OpenClaw or Hermes  
**Prerequisite:** `lilly-code login` already done

---

## Option A — OpenClaw with Lilly Code (Zero Code, ~5 min)

### 1. Set env vars
```bash
export LILLY_CODE_TOKEN=$(lilly-code token)
export LILLY_USER_ID="L073881"          # your employee ID
export LILLY_USER_EMAIL="you@lilly.com"
```

### 2. Install OpenClaw
```bash
npm install -g openclaw@latest
```

### 3. Create `~/.openclaw/openclaw.json`
```json
{
  "models": {
    "providers": {
      "lilly-code": {
        "baseUrl": "https://lilly-code-server.api.gateway-dev.llm.lilly.com/v1",
        "apiKey": "${LILLY_CODE_TOKEN}",
        "api": "openai-completions",
        "headers": {
          "X-User-Id": "${LILLY_USER_ID}",
          "X-User-Email": "${LILLY_USER_EMAIL}"
        },
        "models": [
          { "id": "claude-sonnet-4-6", "name": "Lilly Claude Sonnet" },
          { "id": "claude-opus-4-6-v1", "name": "Lilly Claude Opus" },
          { "id": "gpt-5.4-2026-03-05", "name": "Lilly GPT-5.4" }
        ]
      }
    }
  },
  "agents": {
    "defaults": { "model": { "primary": "lilly-code/claude-sonnet-4-6" } }
  }
}
```

### 4. Start and test
```bash
openclaw onboard --install-daemon
openclaw agent --message "Hello! Which model are you?"
```

✅ **Done. OpenClaw is now using Lilly's Claude Sonnet.**

---

## Option B — Hermes with Lilly Code (~10 min)

### 1. Set env vars
```bash
export LILLY_CODE_TOKEN=$(lilly-code token)
export LILLY_USER_ID="L073881"
export LILLY_USER_EMAIL="you@lilly.com"
```

### 2. Install Hermes + apply patch
```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
source ~/.bashrc

# Apply custom_headers patch (2 lines)
git clone https://github.com/nousresearch/hermes-agent /tmp/hermes-patch
cd /tmp/hermes-patch

# In agent/auxiliary_client.py, find the OpenAI client constructor and add:
# extra_headers = config.get("model", {}).get("custom_headers", {})
# default_headers=extra_headers   ← add to client constructor

pip install -e ".[all]"
```

### 3. Create `~/.hermes/config.yaml`
```yaml
model:
  provider: "lilly-code"
  default: "claude-sonnet-4-6"
  base_url: "https://lilly-code-server.api.gateway-dev.llm.lilly.com/v1"
  api_key: "${LILLY_CODE_TOKEN}"
  context_length: 200000
  max_tokens: 16000
  custom_headers:
    X-User-Id: "${LILLY_USER_ID}"
    X-User-Email: "${LILLY_USER_EMAIL}"
```

### 4. Start and test
```bash
hermes doctor
hermes
> Hello! Which model are you using?
```

✅ **Done. Hermes is now using Lilly's Claude Sonnet.**

---

## Option C — Both Tools via lilly-code proxy (Best, ~1 day to build)

Once the `lilly-code proxy` command is built (see `11_LillyCode_Proxy_Spec.md`):

```bash
# Terminal 1: One command to rule them all
lilly-code proxy --port 11434

# Terminal 2: OpenClaw
# Set baseUrl: "http://localhost:11434/v1" in openclaw.json

# Terminal 3: Hermes
# Set base_url: "http://localhost:11434/v1" in config.yaml
```

No tokens, no headers, no expiry issues. Just works.

---

## Model Selection Guide

| Task | Use This Model |
|------|---------------|
| General chat, daily questions | `claude-sonnet-4-6` |
| Complex reasoning, long documents | `claude-opus-4-6-v1` |
| Fast responses, simple tasks | `claude-haiku-4-5-20251001-v1` |
| Code generation, debugging | `gpt-5.4-2026-03-05` |
| Ultra-fast, simple completions | `gpt-5.4-nano-2026-03-17` |

---

## Token Expiry Note

Lilly Code tokens expire (typically hourly). When they do:

```bash
# Refresh token
lilly-code login

# Update env var
export LILLY_CODE_TOKEN=$(lilly-code token)

# Restart OpenClaw/Hermes
```

**This is why the proxy is the long-term solution** — it handles refresh automatically.

---

## Useful Commands

```bash
# Lilly Code
lilly-code login              # Re-authenticate
lilly-code token              # Print current token
lilly-code models list        # See all available models
lilly-code doctor             # Diagnose issues

# OpenClaw
openclaw gateway status       # Check gateway health
openclaw doctor               # Full health check
openclaw agent --message "test" # Quick test

# Hermes
hermes doctor                 # Check config and connections
hermes model                  # Switch model interactively
/model sonnet                 # Switch model in chat
```

---

## Full Documentation Index

| Doc | Read When |
|-----|-----------|
| `02_Research_Summary.md` | Want the full research context |
| `03_LillyCode_Overview.md` | Need to understand Lilly Code deeply |
| `04_OpenClaw_Overview.md` | Need to understand OpenClaw |
| `05_Hermes_Overview.md` | Need to understand Hermes |
| `06_Feasibility_Analysis.md` | Want to understand why this works |
| `07_Integration_Architecture.md` | Need to see the system diagram |
| `08_Code_Changes_Required.md` | Ready to write code |
| `09_OpenClaw_Config.md` | Full OpenClaw setup guide |
| `10_Hermes_Config.md` | Full Hermes setup guide |
| `11_LillyCode_Proxy_Spec.md` | Building the proxy command |
| `12_Quick_Start.md` | This file |
