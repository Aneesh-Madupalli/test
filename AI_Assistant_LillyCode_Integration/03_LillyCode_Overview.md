# Lilly Code — Deep Dive

**Repo:** github.com/EliLillyCo/lilly-code  
**Language:** Rust  
**Install:** `curl -fsSL https://lilly-code-install.apps-internal-d.lrl.lilly.com/install.sh | bash`

---

## What Lilly Code Is

Lilly Code is Lilly's **enterprise authentication and proxy layer** for AI coding tools. It is NOT an AI model itself — it is the secure bridge between developers and Lilly's approved LLMs.

```
Developer → lilly-code CLI → Lilly LLM Gateway → Claude / GPT-5.4
```

Think of it as: **"Lilly's version of an API key manager"** — but enterprise-grade with SSO, cost tracking, and compliance built in.

---

## Three Components

### 1. CLI Tool (what you install locally)
- Authenticates with Lilly Entra ID via **OAuth 2.0 + PKCE**
- Configures AI tools (Claude Code, Cline, OpenCode) to use Lilly's gateway
- Caches tokens securely (macOS Keychain / Windows Credential Manager / Linux Secret Service)
- Auto-refreshes tokens
- Works with Lilly's conditional access policies

### 2. Server (runs in CATS production)
- Multi-format APIs: **OpenAI format** and **Anthropic format**
- Deterministic key generation via **BLAKE3 hashing** (zero database lookups)
- Rate limiting per user: 150K TPM, 100 RPM
- Budget tracking: $500/week (Standard), $2,500/week (Pro)
- Auto-recovery: just-in-time key recreation on failures
- CATS Kubernetes deployment with bouncer integration

### 3. Shared Library
- Common types and utilities (model catalog, auth types, etc.)

---

## Available Models

| Family | Model ID | Use Case |
|--------|---------|---------|
| Claude Sonnet | `claude-sonnet-4-6` | General purpose (default) |
| Claude Sonnet | `claude-sonnet-4.5-20250929-v1` | Previous version |
| Claude Opus | `claude-opus-4.6-v1` | Complex reasoning |
| Claude Opus | `claude-opus-4.5-20251101-v1` | Previous version |
| Claude Haiku | `claude-haiku-4.5-20251001-v1` | Fastest, fallback |
| GPT-5.4 | `gpt-5.4-2026-03-05` | Frontier agentic coding |
| GPT-5.4 Mini | `gpt-5.4-mini-2026-03-17` | Fast and efficient |
| GPT-5.4 Nano | `gpt-5.4-nano-2026-03-17` | Ultra-lightweight |

**Model aliases also work:** `sonnet`, `opus`, `haiku`, `sonnet-latest`, `opus-latest`

---

## API Endpoints

### Environments

| Environment | API URL |
|-------------|---------|
| Dev | `api.dev.cortex.lilly.com` |
| QA | `api.qa.cortex.lilly.com` |
| Prod | `api.cortex.lilly.com` |

### Lilly Code Server Endpoints

```
# OpenAI format
POST https://lilly-code-server.api.gateway-dev.llm.lilly.com/v1/chat/completions

# Anthropic format  
POST https://lilly-code-server.api.gateway-dev.llm.lilly.com/v1/messages
```

### Authentication Headers Required

```
Authorization: Bearer <token>
X-User-Id: L073881
X-User-Email: your.name@lilly.com
```

---

## CLI Commands

```bash
lilly-code login                        # Authenticate via browser (SSO)
lilly-code login --no-browser           # For HPC/headless systems
lilly-code configure                    # Interactive configuration wizard
lilly-code configure --claude-code --yes # Configure Claude Code with defaults
lilly-code models list                  # List available models
lilly-code models list --show-aliases   # Show all aliases
lilly-code models info sonnet           # Details for specific model
lilly-code doctor                       # Diagnose issues
```

---

## Budget Tiers

| Tier | Weekly Budget | Best for |
|------|-------------|---------|
| Standard | $500/week | Daily coding tasks |
| Pro | $2,500/week | Heavy usage |

**By task type:**

| Task | Recommended Model | Why |
|------|-----------------|-----|
| General coding | Sonnet | Balanced cost/performance |
| Complex architecture | Opus | Superior reasoning |
| Quick tasks | Haiku | Fastest, lowest cost |
| Code generation | GPT-5.4 | Frontier agentic coding |
| Simple completions | GPT-5.4 Nano | Ultra-low latency |

---

## How lilly-code configure Works

Running `lilly-code configure --claude-code --yes` writes a `~/.claude/settings.json` file with:
- `sonnet` as the default model
- `availableModels` list with all supported aliases
- Gateway URL as the API base

This is exactly the pattern we need to replicate for OpenClaw and Hermes.

---

## Missing Feature: Proxy Command

Currently lilly-code does NOT have a `lilly-code proxy` command. This would be the ideal integration point for third-party tools. See `11_LillyCode_Proxy_Spec.md` for the full specification to add this.
