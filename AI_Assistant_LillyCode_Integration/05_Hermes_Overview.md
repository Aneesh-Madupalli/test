# Hermes Agent — Deep Dive

**Repo:** github.com/nousresearch/hermes-agent  
**Language:** Python  
**Creator:** Nous Research (AI lab)  
**Tagline:** "The agent that grows with you"  
**Install:** `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`

---

## What Hermes Is

Hermes is a **self-improving AI agent** with a built-in learning loop. Unlike a static chatbot, it creates skills from experience, improves them over time, and builds a deepening model of who you are.

The key differentiator: **it gets smarter the more you use it.**

---

## Key Features

| Feature | Description |
|---------|-------------|
| Learning loop | Creates skills from complex tasks; skills self-improve during use |
| User modeling | Builds a model of you across sessions (Honcho dialectic) |
| Session search | FTS5 full-text search across all past conversations |
| Multi-channel | Telegram, Discord, Slack, WhatsApp, Signal, CLI |
| Runs anywhere | Local, Docker, SSH, Singularity, Modal (serverless), Daytona |
| Any model | OpenRouter, Nous Portal, OpenAI, custom endpoint |
| Cron scheduler | Natural language automations on any platform |
| Subagents | Spawn isolated parallel agents for complex tasks |
| Research tools | Batch trajectory generation, training data export |

---

## Architecture

```
Hermes Agent (Python)
├── TUI (terminal interface with slash commands)
├── Messaging Gateway (Telegram, Discord, Slack, WhatsApp, Signal)
├── Model layer (LiteLLM under the hood) ← PLUG IN LILLY CODE HERE
├── Memory & Skills system (creates/improves skills from experience)
├── User modeling (Honcho dialectic)
├── Session search (FTS5 + LLM summarization)
├── Cron scheduler
└── Subagent system (isolated parallel workstreams)
```

---

## Model Provider System

### Config File
`~/.hermes/config.yaml`

### Provider Config Schema

```yaml
model:
  provider: "custom"                # or "anthropic", "openai", "openrouter", etc.
  default: "claude-sonnet-4-6"      # model ID
  base_url: "https://endpoint/v1"   # custom OpenAI-compatible endpoint
  api_key: "${LILLY_CODE_TOKEN}"    # from env var
  context_length: 200000
  max_tokens: 16000
  custom_headers:                   # ← KEY FEATURE (PR #14314)
    X-User-Id: "L073881"
    X-User-Email: "your.name@lilly.com"
```

### Named Custom Provider Format

```yaml
custom_providers:
  - name: "lilly-code"
    base_url: "https://lilly-code-server.api.gateway-dev.llm.lilly.com/v1"
    api_key: "${LILLY_CODE_TOKEN}"
    custom_headers:
      X-User-Id: "L073881"
      X-User-Email: "your.name@lilly.com"
```

### Important: custom_headers Status
`custom_headers` is implemented in **PR #14314** (44 commits, still open as of June 2026).  
**Not yet in main branch.**

Workaround: 10-line patch to `agent/auxiliary_client.py` (see `08_Code_Changes_Required.md`)

---

## Key Source Files

| File | Purpose |
|------|---------|
| `hermes_cli/config.py` | Configuration loading and validation |
| `hermes_cli/models.py` | Model catalog and provider resolution |
| `hermes_cli/providers.py` | Provider profile registry |
| `hermes_cli/runtime_provider.py` | Runtime credential resolution |
| `agent/anthropic_adapter.py` | Anthropic client initialization |
| `agent/auxiliary_client.py` | OpenAI-compatible client construction ← patch here |
| `agent/agent_init.py` | Agent initialization, reads config.yaml |
| `providers/base.py` | ProviderProfile declarative class |

---

## CLI Commands

```bash
hermes              # Start interactive TUI
hermes model        # Choose LLM provider and model (wizard)
hermes tools        # Configure enabled tools
hermes config set   # Set individual config values
hermes gateway      # Start messaging gateway (Telegram, Discord, etc.)
hermes setup        # Full setup wizard
hermes update       # Update to latest version
hermes doctor       # Diagnose issues
hermes claw migrate # Migrate from OpenClaw ← interesting for combined use
```

### Slash Commands (in conversation)
```
/new or /reset       # Fresh conversation
/model [provider:model]  # Switch model
/personality [name]  # Set personality
/retry, /undo        # Retry or undo last turn
/compress, /usage    # Token management
/skills              # Browse available skills
/stop                # Interrupt current work
```

---

## Supported Backends (Execution Environments)

| Backend | Description |
|---------|-------------|
| Local | Runs on your machine |
| Docker | Containerized execution |
| SSH | Remote server execution |
| Singularity | HPC cluster environments |
| Modal | Serverless (hibernates when idle, cheap) |
| Daytona | Cloud development environment |

---

## Known Issues Relevant to Integration

| Issue | Description | Fix |
|-------|-------------|-----|
| #5358 | Gateway ignores `model.provider` if `OPENROUTER_API_KEY` is set | Unset the env var |
| #9398 | `custom_headers` not in main | Apply 10-line patch or use PR branch |
| #8919 | `hermes config set model.api_base` broken | Use `base_url` key instead |
