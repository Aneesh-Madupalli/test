# Hermes Agent — Step-by-Step Setup with Lilly Code

---

## Prerequisites

1. `lilly-code` installed and authenticated (`lilly-code login`)
2. Python 3.11+ installed
3. Your Lilly employee ID (e.g., `L073881`)
4. Your Lilly email address

---

## Step 1 — Install Hermes

```bash
# macOS / Linux / WSL2
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
source ~/.bashrc   # or ~/.zshrc

# Windows (PowerShell)
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

---

## Step 2 — Get Your Lilly Code Token

```bash
lilly-code token
# Copy the output token
```

Set as environment variable:

```bash
# Add to ~/.bashrc or ~/.zshrc
export LILLY_CODE_TOKEN="<your-token-here>"
export LILLY_USER_ID="L073881"
export LILLY_USER_EMAIL="your.name@lilly.com"
```

---

## Step 3 — Apply the custom_headers Patch

Since PR #14314 is not yet merged, apply this 2-line patch:

```bash
# Clone Hermes
git clone https://github.com/nousresearch/hermes-agent
cd hermes-agent
```

**Edit `agent/auxiliary_client.py`** — find the OpenAI client construction and add `default_headers`:

```python
# Find code like this:
client = openai.OpenAI(
    base_url=config["model"]["base_url"],
    api_key=config["model"]["api_key"],
)

# Change to:
extra_headers = config.get("model", {}).get("custom_headers", {})
client = openai.OpenAI(
    base_url=config["model"]["base_url"],
    api_key=config["model"]["api_key"],
    default_headers=extra_headers,  # ← ADD THIS LINE
)
```

**Edit `agent/anthropic_adapter.py`** — same pattern:

```python
extra_headers = config.get("model", {}).get("custom_headers", {})
client = anthropic.Anthropic(
    base_url=config["model"]["base_url"],
    api_key=config["model"]["api_key"],
    default_headers=extra_headers,  # ← ADD THIS LINE
)
```

```bash
# Install from patched source
pip install -e ".[all]"
```

---

## Step 4 — Configure Hermes

Create/edit `~/.hermes/config.yaml`:

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

# Optional: define as named provider for switching
custom_providers:
  - name: "lilly-code"
    display_name: "Lilly Code (Enterprise)"
    base_url: "https://lilly-code-server.api.gateway-dev.llm.lilly.com/v1"
    api_key: "${LILLY_CODE_TOKEN}"
    custom_headers:
      X-User-Id: "${LILLY_USER_ID}"
      X-User-Email: "${LILLY_USER_EMAIL}"
    models:
      - id: "claude-sonnet-4-6"
        name: "Claude Sonnet (Balanced)"
      - id: "claude-opus-4-6-v1"
        name: "Claude Opus (Complex tasks)"
      - id: "claude-haiku-4-5-20251001-v1"
        name: "Claude Haiku (Fast)"
      - id: "gpt-5.4-2026-03-05"
        name: "GPT-5.4 (Code generation)"
```

---

## Step 5 — Start Hermes

```bash
hermes              # Start interactive TUI chat
hermes doctor       # Verify setup
```

### Test the connection:
```
> Hello! Which model are you using?
```

It should respond using Lilly's Claude Sonnet model.

---

## Step 6 — Connect Messaging Platforms (Optional)

```bash
hermes gateway setup    # Interactive setup for Telegram/Discord/Slack etc.
hermes gateway start    # Start the messaging gateway
```

Then message your bot from Telegram/Discord/Slack/WhatsApp.

---

## Step 7 — Switch Models in Conversation

```bash
hermes model    # Interactive model switcher
# or in chat:
/model lilly-code:claude-opus-4-6-v1     # Complex task
/model lilly-code:claude-haiku-4-5-20251001-v1  # Fast response
/model lilly-code:gpt-5.4-2026-03-05    # Code generation
```

---

## If Using lilly-code proxy (Recommended)

Once `lilly-code proxy` is built, simplify config to:

```bash
# Terminal 1: start proxy
lilly-code proxy --port 11434

# Terminal 2: start Hermes
hermes
```

Simplified `~/.hermes/config.yaml`:

```yaml
model:
  provider: "lilly-code"
  default: "claude-sonnet-4-6"
  base_url: "http://localhost:11434/v1"
  api_key: "lilly-proxy"    # any value — proxy handles real auth
  context_length: 200000
  max_tokens: 16000
# No custom_headers needed — proxy injects them automatically
```

No patch to Hermes source needed in this mode.

---

## Key Hermes Features with Lilly Models

| Feature | Works with Lilly Code? | Notes |
|---------|----------------------|-------|
| Learning loop (skill creation) | ✅ Yes | Uses Claude for skill generation |
| User modeling | ✅ Yes | Stored locally, LLM call uses Lilly |
| Session search (FTS5) | ✅ Yes | Search is local, summaries use Lilly |
| Cron automations | ✅ Yes | Scheduled calls go through Lilly |
| Subagents | ✅ Yes | Each inherits same Lilly config |
| Telegram gateway | ✅ Yes | AI responses routed through Lilly |
| Model switching in chat | ✅ Yes | Use any Lilly model with /model |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `custom_headers not recognized` | Apply the 2-line patch in Step 3 |
| `401 Unauthorized` | Token expired — `lilly-code login`, update LILLY_CODE_TOKEN |
| `OPENROUTER_API_KEY overrides config` | `unset OPENROUTER_API_KEY` |
| `model.api_base doesn't work` | Use `base_url` key (not `api_base`) |
| `Rate limit exceeded` | Switch to Haiku: `/model lilly-code:claude-haiku-4-5-20251001-v1` |
| Gateway not responding | `hermes doctor` to diagnose |
