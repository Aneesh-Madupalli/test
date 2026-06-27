# lilly-code proxy — Feature Specification

**Status:** Proposed — not yet built  
**Priority:** HIGH — enables zero-friction integration with any OpenAI-compatible tool  
**Estimated effort:** ~1 day of Rust development  

---

## Overview

`lilly-code proxy` starts a local HTTP server that acts as an OpenAI-compatible API endpoint. Any tool pointed at `http://localhost:11434/v1` gets automatic Lilly auth injection, token refresh, and transparent forwarding to the Lilly LLM Gateway.

---

## Problem It Solves

Without the proxy, every third-party tool needs to:
1. Know the Lilly gateway URL
2. Know the user's Bearer token (which expires)
3. Know to inject `X-User-Id` and `X-User-Email` headers
4. Handle token refresh on expiry

With the proxy, tools just point at `localhost` with any API key — lilly-code handles everything.

---

## User Experience

```bash
# One-time setup
lilly-code login

# Start proxy (runs in background)
lilly-code proxy --port 11434

# Output:
# lilly-code proxy running on http://localhost:11434/v1
# Authenticated as: L073881 (your.name@lilly.com)
# Available models: sonnet, opus, haiku, gpt-5.4, gpt-5.4-mini, gpt-5.4-nano
# Token valid for: 58 minutes (auto-refresh enabled)
# Press Ctrl+C to stop.

# Then configure any tool:
# OpenClaw: "baseUrl": "http://localhost:11434/v1"
# Hermes:   base_url: "http://localhost:11434/v1"
# Cline:    endpoint: http://localhost:11434/v1
# Any OpenAI-compatible tool: base_url = http://localhost:11434/v1
```

---

## Technical Specification

### Command Interface

```
lilly-code proxy [OPTIONS]

Options:
  -p, --port <PORT>     Port to listen on [default: 11434]
  -b, --bind <ADDR>     Address to bind [default: 127.0.0.1]
      --daemon          Run as background daemon
      --no-refresh      Disable automatic token refresh
  -v, --verbose         Log all requests/responses

Examples:
  lilly-code proxy                     # Default port 11434
  lilly-code proxy --port 8080         # Custom port
  lilly-code proxy --daemon            # Background mode
```

### Endpoints Exposed

| Method | Path | Forwarded To |
|--------|------|-------------|
| POST | /v1/chat/completions | Gateway /v1/chat/completions |
| POST | /v1/messages | Gateway /v1/messages |
| GET | /v1/models | Returns Lilly model list |
| GET | /health | Local health check |

### Headers Injected on Every Request

```
Authorization: Bearer <current-valid-token>
X-User-Id: <from-lilly-code-profile>
X-User-Email: <from-lilly-code-profile>
Content-Type: application/json
```

### Token Auto-Refresh

- Monitor token expiry (from JWT `exp` field)
- Refresh 5 minutes before expiry using existing `lilly-code` auth flow
- Zero downtime — refreshed token used on next request
- If refresh fails: return `503 Service Unavailable` with clear error message

### Security

- Listens on `127.0.0.1` (localhost only) — not exposed to network
- No auth required on the proxy itself (it's localhost)
- All requests validated before forwarding
- Request logging to `~/.lilly-code/proxy.log`

---

## Implementation in Rust

### New file: `cli/src/commands/proxy.rs`

```rust
use anyhow::Result;
use axum::{
    Router,
    routing::any,
    extract::State,
    response::IntoResponse,
    http::{Request, StatusCode},
    body::Body,
};
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::net::TcpListener;

#[derive(Clone)]
struct ProxyState {
    token:      Arc<RwLock<String>>,
    user_id:    String,
    user_email: String,
    gateway:    String,
}

pub async fn run_proxy(port: u16) -> Result<()> {
    // Reuse existing token acquisition
    let auth = crate::auth::require_auth().await?;
    let profile = crate::config::load_profile()?;

    println!("lilly-code proxy → http://localhost:{}/v1", port);
    println!("Authenticated as: {} ({})", profile.user_id, profile.email);
    println!("Token auto-refresh: enabled");

    let state = ProxyState {
        token: Arc::new(RwLock::new(auth.access_token.clone())),
        user_id: profile.user_id,
        user_email: profile.email,
        gateway: crate::config::gateway_url(),
    };

    // Spawn token refresh task
    let state_clone = state.clone();
    tokio::spawn(async move {
        token_refresh_loop(state_clone, auth).await;
    });

    let app = Router::new()
        .route("/v1/*path", any(proxy_handler))
        .route("/v1/models", axum::routing::get(list_models_handler))
        .route("/health", axum::routing::get(|| async { "ok" }))
        .with_state(state);

    let listener = TcpListener::bind(format!("127.0.0.1:{}", port)).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn proxy_handler(
    State(state): State<ProxyState>,
    req: Request<Body>,
) -> impl IntoResponse {
    let token = state.token.read().await.clone();
    let target = format!("{}{}", state.gateway, req.uri().path());

    let client = reqwest::Client::new();
    let mut builder = client
        .request(req.method().clone(), &target)
        .header("Authorization", format!("Bearer {}", token))
        .header("X-User-Id", &state.user_id)
        .header("X-User-Email", &state.user_email);

    // Forward original headers (except Authorization)
    for (k, v) in req.headers() {
        if k != "authorization" && k != "host" {
            builder = builder.header(k, v);
        }
    }

    // Forward body
    let body_bytes = axum::body::to_bytes(req.into_body(), usize::MAX).await
        .unwrap_or_default();
    builder = builder.body(body_bytes);

    match builder.send().await {
        Ok(resp) => {
            let status = resp.status();
            let body = resp.bytes().await.unwrap_or_default();
            (status, body).into_response()
        }
        Err(e) => (
            StatusCode::BAD_GATEWAY,
            format!("Proxy error: {}", e),
        ).into_response()
    }
}

async fn token_refresh_loop(state: ProxyState, mut auth: crate::auth::Auth) {
    loop {
        // Sleep until 5 minutes before expiry
        let expiry = auth.expires_at - chrono::Duration::minutes(5);
        let now = chrono::Utc::now();
        if expiry > now {
            let sleep_secs = (expiry - now).num_seconds() as u64;
            tokio::time::sleep(std::time::Duration::from_secs(sleep_secs)).await;
        }
        
        match crate::auth::refresh_token(&auth).await {
            Ok(new_auth) => {
                *state.token.write().await = new_auth.access_token.clone();
                auth = new_auth;
            }
            Err(e) => {
                eprintln!("Token refresh failed: {} — retrying in 60s", e);
                tokio::time::sleep(std::time::Duration::from_secs(60)).await;
            }
        }
    }
}

async fn list_models_handler(State(state): State<ProxyState>) -> impl IntoResponse {
    // Return Lilly's model list in OpenAI format
    axum::Json(serde_json::json!({
        "object": "list",
        "data": [
            {"id": "claude-sonnet-4-6", "object": "model"},
            {"id": "claude-opus-4-6-v1", "object": "model"},
            {"id": "claude-haiku-4-5-20251001-v1", "object": "model"},
            {"id": "gpt-5.4-2026-03-05", "object": "model"},
            {"id": "gpt-5.4-mini-2026-03-17", "object": "model"},
            {"id": "gpt-5.4-nano-2026-03-17", "object": "model"},
            // aliases
            {"id": "sonnet", "object": "model"},
            {"id": "opus", "object": "model"},
            {"id": "haiku", "object": "model"},
        ]
    }))
}
```

---

## Configuration After Building

Once the proxy command is built, the complete setup for any tool is:

```bash
# Step 1: authenticate (one time)
lilly-code login

# Step 2: start proxy
lilly-code proxy &

# Step 3: point any tool at localhost:11434
# No API key management, no header config, no token rotation
```

---

## Testing Plan

```bash
# Test 1: basic connectivity
curl http://localhost:11434/health
# Expected: "ok"

# Test 2: model list
curl http://localhost:11434/v1/models
# Expected: JSON list of Lilly models

# Test 3: chat completion
curl -X POST http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"sonnet","messages":[{"role":"user","content":"Hello!"}]}'
# Expected: valid chat response from Claude Sonnet

# Test 4: token refresh (automated)
# Wait until token is near expiry — proxy should auto-refresh

# Test 5: unauthorized without lilly-code login
# Kill token, restart proxy — should error with clear message
```
