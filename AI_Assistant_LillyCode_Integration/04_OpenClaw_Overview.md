# OpenClaw — Deep Dive

**Repo:** github.com/openclaw/openclaw  
**Language:** TypeScript / Node.js  
**Install:** `npm install -g openclaw@latest`  
**Creator:** Peter Steinberger and community  
**Tagline:** "Your own personal AI assistant. Any OS. Any Platform. The lobster way. 🦞"

---

## What OpenClaw Is

OpenClaw is a **local-first personal AI assistant gateway**. You run it on your own machine or server, and it connects your AI assistant to every messaging app you already use. The Gateway is the control plane — the product is the assistant that lives in your apps.

```
Your messages → OpenClaw Gateway → AI Model → Response back to your app
```

---

## Supported Channels (25+)

WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, IRC, Microsoft Teams, Matrix, Feishu, LINE, Mattermost, Nextcloud Talk, Nostr, Synology Chat, Tlon, Twitch, Zalo, Zalo Personal, WeChat, QQ, WebChat, macOS, iOS, Android

---

## Key Features

| Feature | Description |
|---------|-------------|
| Local-first Gateway | Single control plane on YOUR machine |
| Multi-channel inbox | Talk to AI from any messaging app |
| Multi-agent routing | Route channels to different isolated agents |
| Voice Wake + Talk | Wake words on macOS/iOS, continuous voice on Android |
| Live Canvas | Agent-driven visual workspace (A2UI) |
| Companion apps | Windows Hub, macOS menu bar, iOS/Android nodes |
| Skills system | Extensible via ClawHub marketplace |

---

## Architecture

```
OpenClaw Gateway (Node.js daemon)
├── Channel connectors (WhatsApp, Telegram, Discord...)
├── Agent sessions (isolated per workspace)
├── Model provider layer ← THIS IS WHERE WE PLUG IN LILLY CODE
├── Tools (browser, canvas, cron, files...)
└── Skills registry (ClawHub)
```

The gateway runs as a daemon (`launchd` on macOS, `systemd` on Linux, Windows service).

---

## Model Provider System

This is the critical part for Lilly Code integration.

### Config File
`~/.openclaw/openclaw.json`

### Provider Config Schema

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "<provider-id>": {
        "baseUrl": "https://your-endpoint.com/v1",
        "apiKey": "${ENV_VAR_NAME}",
        "api": "openai-completions | anthropic-messages | openai-responses",
        "headers": {
          "Custom-Header": "value",
          "Another-Header": "${ENV_VAR}"
        },
        "models": [
          {
            "id": "model-id",
            "name": "Display Name",
            "contextWindow": 200000,
            "maxTokens": 8192,
            "input": ["text"],
            "cost": { "input": 0, "output": 0 }
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "<provider-id>/<model-id>"
      }
    }
  }
}
```

### API Types
| Value | Use When |
|-------|----------|
| `openai-completions` | OpenAI-compatible Chat Completions `/v1/chat/completions` |
| `openai-responses` | Native OpenAI Responses API |
| `anthropic-messages` | Anthropic-compatible Messages API `/v1/messages` |

### Environment Variable Support
Values in config can reference env vars: `"${MY_VAR}"` — resolved at runtime.

---

## Security Model

- **Default (main session only):** Tools run on the host, full access when it's just you
- **Non-main sessions:** Set `agents.defaults.sandbox.mode: "non-main"` for Docker sandboxing
- **DM pairing:** Unknown senders get a pairing code (prevents spam/abuse)

---

## Quick Start Commands

```bash
# Install
npm install -g openclaw@latest

# Set up (interactive wizard)
openclaw onboard --install-daemon

# Status
openclaw gateway status

# Send test message
openclaw agent --message "Hello from Lilly!"

# Run in foreground/debug
openclaw gateway --port 18789 --verbose

# Health check
openclaw doctor
```

---

## Plugin Architecture (for reference)

OpenClaw uses a plugin system for providers. Each provider is in `extensions/<name>/`:
- `extensions/<name>/index.ts` — calls `api.registerProvider()`
- `extensions/<name>/<name>-provider.ts` — implementation

**For our use case: no plugin needed** — the `models.providers` config block handles custom providers without writing any code.
