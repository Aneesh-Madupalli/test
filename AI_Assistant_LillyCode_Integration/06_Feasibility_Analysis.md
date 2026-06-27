# Feasibility Analysis — Using Lilly Code as LLM for OpenClaw & Hermes

**Date:** June 27, 2026  
**Conclusion: FEASIBLE for both tools**

---

## The Core Question

> Can OpenClaw and Hermes use Lilly Code's LLM Gateway instead of personal API keys?

**Answer: Yes.** Both tools support custom OpenAI-compatible endpoints. Lilly Code exposes a standard OpenAI-compatible API. The only friction is auth header injection.

---

## What Makes This Work

### Lilly Code Exposes Standard OpenAI Format
```
POST /v1/chat/completions   ← OpenAI format
POST /v1/messages           ← Anthropic format
```

Both OpenClaw and Hermes know how to talk to these formats natively.

### OpenClaw Supports Custom Headers
From `docs/concepts/model-providers.md` — the `headers` field in `models.providers`:
```json
"headers": {
  "X-User-Id": "${LILLY_USER_ID}",
  "X-User-Email": "${LILLY_USER_EMAIL}"
}
```
This is exactly the non-standard header injection Lilly Code requires.

### Hermes Supports Custom Base URL
From `hermes_cli/config.py` — the `model.base_url` field routes all requests to a custom endpoint. Custom headers are in PR #14314 (pending merge).

---

## Feasibility by Tool

### ✅ OpenClaw — FULLY FEASIBLE, ZERO CODE CHANGE

| Requirement | OpenClaw Capability | Status |
|-------------|-------------------|--------|
| Custom API endpoint | `models.providers.<id>.baseUrl` | ✅ Built-in |
| Bearer token auth | `apiKey` field with env var | ✅ Built-in |
| Custom headers (X-User-Id, X-User-Email) | `headers` object in provider config | ✅ Built-in |
| Multiple models | `models` array in provider | ✅ Built-in |
| Env var interpolation | `"${ENV_VAR}"` syntax | ✅ Built-in |

**Verdict:** Pure config change. Works today.

---

### ✅ Hermes — FEASIBLE, TINY CODE CHANGE

| Requirement | Hermes Capability | Status |
|-------------|-----------------|--------|
| Custom API endpoint | `model.base_url` in config.yaml | ✅ Built-in |
| Bearer token auth | `model.api_key` | ✅ Built-in |
| Custom headers (X-User-Id, X-User-Email) | `model.custom_headers` | ⚠️ PR #14314, not merged |
| Provider naming | `custom_providers` list | ✅ Built-in |

**Verdict:** One small patch (~10 lines) to `agent/auxiliary_client.py` OR wait for PR #14314 to merge.

---

## The Auth Challenge

Both tools need three headers injected:
```
Authorization: Bearer <token>    ← standard, both tools support
X-User-Id: L073881               ← non-standard, only OpenClaw supports natively
X-User-Email: user@lilly.com     ← non-standard, only OpenClaw supports natively
```

### Solution Options (ranked best to worst)

| Option | Works for OpenClaw | Works for Hermes | Effort |
|--------|-------------------|-----------------|--------|
| **lilly-code proxy** (local server) | ✅ Yes | ✅ Yes | Medium (1 day) |
| **Direct header config** | ✅ Yes (built-in) | ⚠️ Needs patch | Low (10 lines) |
| **Env var passthrough** | ✅ Yes | ✅ Yes | None |

### Recommended: lilly-code proxy
A local HTTP server started by `lilly-code proxy --port 11434` that:
1. Accepts any request to `localhost:11434/v1/*`
2. Automatically gets fresh auth token from Lilly SSO
3. Injects all required headers
4. Forwards to Lilly LLM Gateway
5. Returns response transparently

Both tools then point to `http://localhost:11434/v1` — no auth config needed at all.

---

## Compliance Consideration

Using Lilly Code means:
- ✅ All requests route through Lilly's approved gateway
- ✅ Your Lilly identity is attached to every request
- ✅ Full cost tracking and budget enforcement
- ✅ Audit trail for all AI interactions
- ✅ No personal API keys needed
- ✅ Works within Lilly's conditional access policies

This is arguably **more compliant** than using personal API keys for these tools.

---

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Rate limits hit (150K TPM) | Medium | Medium | Use Haiku for lightweight tasks |
| Token expiry breaks session | Low | Medium | lilly-code proxy handles auto-refresh |
| PR #14314 never merges | Low | Low | Apply local patch |
| Gateway URL changes | Low | Medium | Use alias via proxy |
| Budget exceeded ($500/week) | Low | Low | Monitor via `lilly-code` commands |
