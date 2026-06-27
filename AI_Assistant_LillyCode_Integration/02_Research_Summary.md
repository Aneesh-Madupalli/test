# Research Summary — Using Lilly Code with OpenClaw & Hermes

**Date:** June 27, 2026  
**Scope:** Full research on 5 GitHub repositories + feasibility analysis

---

## Repositories Researched

| Repository | URL | Language | Purpose |
|-----------|-----|----------|---------|
| lilly-code | github.com/EliLillyCo/lilly-code | Rust | Lilly's internal AI auth layer |
| lilly-code-docs | github.com/EliLillyCo/lilly-code-docs | Markdown | Documentation for lilly-code |
| openclaw | github.com/openclaw/openclaw | TypeScript/Node.js | Personal AI assistant gateway |
| hermes-agent | github.com/nousresearch/hermes-agent | Python | Self-improving personal AI agent |
| cortex-api | github.com/EliLillyCo/cortex-api | Python | Lilly Cortex platform backend |

---

## Key Discovery: The Integration Layer

Lilly Code exposes a **standard OpenAI-compatible API** at:
```
https://lilly-code-server.api.gateway-dev.llm.lilly.com/v1/chat/completions
https://lilly-code-server.api.gateway-dev.llm.lilly.com/v1/messages  (Anthropic format)
```

Both OpenClaw and Hermes support **custom OpenAI-compatible endpoints** — this is the bridge.

---

## Critical Findings Per Tool

### Lilly Code
- Written in **Rust** — CLI tool + enterprise server
- OAuth 2.0 + PKCE auth via Lilly Entra ID (SSO)
- Injects `Authorization`, `X-User-Id`, `X-User-Email` headers into all requests
- Supports: Claude Sonnet/Opus/Haiku 4.x, GPT-5.4, GPT-5.4 Mini/Nano
- Rate limits: 150K TPM, 100 RPM, $500/week (Standard), $2,500/week (Pro)
- Already configured to work with Claude Code, Cline, OpenCode

### OpenClaw
- Written in **TypeScript/Node.js** — npm package
- `models.providers.<id>` in `openclaw.json` supports:
  - Custom `baseUrl`
  - Custom `apiKey`
  - Custom `headers` (arbitrary key/value) ← **exactly what we need**
  - `api` type: `openai-completions` or `anthropic-messages`
- **No code change needed** — pure config

### Hermes Agent
- Written in **Python** — uses LiteLLM under the hood
- `~/.hermes/config.yaml` supports `model.base_url` and `model.api_key`
- `model.custom_headers` — **in PR #14314, not yet merged to main**
- Without the PR: ~10 line patch to `agent/auxiliary_client.py`
- CLI: `hermes model` wizard for interactive provider setup
- Also supports `hermes claw migrate` for migrating from OpenClaw ← interesting

---

## The Integration Gap

Both tools need `X-User-Id` and `X-User-Email` headers injected alongside the Bearer token. This is non-standard (most providers just need `Authorization: Bearer`).

**Three solutions, ranked by simplicity:**

1. **lilly-code proxy** (best) — local server that handles all auth, tools just point at localhost
2. **Direct headers config** — configure headers in each tool's config file
3. **Environment variables** — set env vars, reference in config

---

## Related Repos Found in EliLillyCo Org

While researching, discovered these potentially useful repos:

| Repo | Stars | What it does |
|------|-------|-------------|
| `cortex-mcp-server` | 11 | MCP server to connect Cortex agents to Claude Code |
| `cortex-api` | 36 | Main Cortex platform backend (Python/FastAPI) |
| `lilly-code` | — | Auth layer for AI coding tools |
| `claude-bazaar` | — | Likely Claude-related marketplace |
| `lilly-code-marketplace` | — | Marketplace for Lilly Code tools/models |
| `cortex-veeva-vault-mcp` | 5 | Veeva Vault MCP server |
