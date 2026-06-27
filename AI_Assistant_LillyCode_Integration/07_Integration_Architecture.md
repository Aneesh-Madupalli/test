# Integration Architecture

**How OpenClaw + Hermes + Lilly Code fit together**

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      YOUR MACHINE                           │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐                      │
│  │   OpenClaw   │    │    Hermes    │                       │
│  │   Gateway    │    │    Agent     │                       │
│  │  (Node.js)   │    │   (Python)   │                       │
│  └──────┬───────┘    └──────┬───────┘                      │
│         │                   │                               │
│         └─────────┬─────────┘                              │
│                   │  http://localhost:11434/v1              │
│         ┌─────────▼─────────┐                              │
│         │  lilly-code proxy  │  (NEW COMMAND TO BUILD)     │
│         │   (Rust server)    │                              │
│         │                   │                              │
│         │ • Auto-refresh SSO token                         │
│         │ • Inject X-User-Id header                        │
│         │ • Inject X-User-Email header                     │
│         │ • Inject Authorization: Bearer                   │
│         └─────────┬─────────┘                              │
└───────────────────┼─────────────────────────────────────────┘
                    │  HTTPS
                    ▼
┌───────────────────────────────────────────────────────────┐
│              LILLY NETWORK                                │
│                                                           │
│  lilly-code-server.api.gateway-dev.llm.lilly.com/v1      │
│                                                           │
│  • Rate limiting (150K TPM, 100 RPM)                      │
│  • Cost tracking ($500/week budget)                       │
│  • Audit logging                                          │
│  • Model routing (Claude / GPT-5.4)                       │
│                    │                                      │
│          ┌─────────┴──────────┐                          │
│          ▼                    ▼                          │
│   ┌─────────────┐    ┌──────────────┐                   │
│   │   Claude    │    │   GPT-5.4    │                   │
│   │ Sonnet/Opus │    │  / Mini/Nano │                   │
│   │   Haiku     │    │              │                   │
│   └─────────────┘    └──────────────┘                   │
└───────────────────────────────────────────────────────────┘
```

---

## Without Proxy (Direct Config Mode)

If you don't want to build the proxy, both tools can be configured to call the gateway directly:

```
OpenClaw / Hermes
      │
      │  HTTPS with headers:
      │  Authorization: Bearer <token>
      │  X-User-Id: L073881
      │  X-User-Email: user@lilly.com
      │
      ▼
Lilly LLM Gateway
```

**Drawback:** Token expires, must be manually refreshed in config.

---

## Channel Flow: OpenClaw

```
You send message on WhatsApp/Telegram/Discord
      ↓
OpenClaw Gateway receives message
      ↓
Routes to configured agent session
      ↓
Agent calls model provider (lilly-code config)
      ↓
HTTP POST to localhost:11434/v1/chat/completions
      ↓
lilly-code proxy injects auth headers
      ↓
Lilly LLM Gateway → Claude Sonnet
      ↓
Response flows back
      ↓
OpenClaw delivers response to your messaging app
```

---

## Learning Flow: Hermes

```
You have a complex conversation with Hermes
      ↓
Hermes calls Lilly Code LLM for responses
      ↓
After complex task: Hermes auto-creates a Skill
      ↓
Skill stored in ~/.hermes/skills/
      ↓
Next time similar task arises: Skill improves it
      ↓
User model updated (Honcho dialectic)
      ↓
All conversation history searchable (FTS5)
```

---

## Data Flow Security

```
Your message → OpenClaw/Hermes → lilly-code proxy → Lilly Gateway → LLM

At each step:
  ✓ Local: No data leaves your machine without auth
  ✓ Proxy: Runs on localhost only (not exposed to network)
  ✓ Gateway: Your Lilly identity attached to every request
  ✓ LLM: Processed by Lilly-approved models only
  ✓ Response: Returns through same secure path
```

---

## Component Ownership

| Component | Who maintains it | Repo |
|-----------|-----------------|------|
| OpenClaw | Open source community | github.com/openclaw/openclaw |
| Hermes | Nous Research | github.com/nousresearch/hermes-agent |
| lilly-code CLI | Lilly SPE team | github.com/EliLillyCo/lilly-code |
| LLM Gateway | Lilly SPE team | Internal |
| Claude models | Anthropic via Azure | N/A |
| GPT-5.4 models | OpenAI via Azure | N/A |

---

## Configuration Files Summary

| Tool | Config File | Key Setting |
|------|-------------|-------------|
| OpenClaw | `~/.openclaw/openclaw.json` | `models.providers.lilly-code` |
| Hermes | `~/.hermes/config.yaml` | `model.base_url` + `model.custom_headers` |
| lilly-code | `~/.lilly-code/config.toml` | Auto-managed by `lilly-code login` |
