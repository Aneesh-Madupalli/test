# Code Changes Required

**Summary of exact changes needed in each repository**

---

## Overview

| Repo | Changes Needed | Effort | Priority |
|------|---------------|--------|----------|
| **lilly-code** | Add `proxy` command | ~1 day | HIGH — unlocks everything |
| **hermes-agent** | Add `custom_headers` to HTTP client | ~10 lines | MEDIUM — needed for direct mode |
| **openclaw** | None — config only | 0 | DONE |

---

## 1. lilly-code — Add `proxy` Command

### Why
A local proxy server means OpenClaw and Hermes point to `localhost` — zero auth config, auto token refresh, works forever.

### Files to Change

**New file: `cli/src/commands/proxy.rs`**

```rust
use anyhow::Result;
use tokio::net::TcpListener;

pub struct ProxyArgs {
    pub port: u16,
}

pub async fn run_proxy(args: ProxyArgs) -> Result<()> {
    // 1. Get authenticated token (reuse existing auth module)
    let auth = crate::auth::get_valid_token().await?;
    let user_info = crate::auth::get_user_info(&auth)?;
    let gateway_url = crate::config::get_gateway_url();

    println!("lilly-code proxy starting on http://localhost:{}/v1", args.port);
    println!("Point your AI tools to: http://localhost:{}/v1", args.port);
    println!("Models available: sonnet, opus, haiku, gpt-5.4");
    println!("Press Ctrl+C to stop.\n");

    let state = AppState {
        token: Arc::new(Mutex::new(auth.access_token)),
        user_id: user_info.employee_id,
        user_email: user_info.email,
        gateway_url,
    };

    let app = Router::new()
        .route("/v1/*path", any(proxy_handler))
        .route("/v1", any(proxy_handler))
        .with_state(state);

    let listener = TcpListener::bind(format!("127.0.0.1:{}", args.port)).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn proxy_handler(
    State(state): State<AppState>,
    mut req: Request<Body>,
) -> impl IntoResponse {
    // Inject Lilly auth headers
    let headers = req.headers_mut();
    headers.insert(
        "Authorization",
        format!("Bearer {}", state.token.lock().await).parse().unwrap(),
    );
    headers.insert("X-User-Id", state.user_id.parse().unwrap());
    headers.insert("X-User-Email", state.user_email.parse().unwrap());

    // Forward to Lilly gateway
    forward_to_gateway(state.gateway_url, req).await
}
```

**Edit: `cli/src/cli.rs`** — add to Commands enum:
```rust
/// Start a local OpenAI-compatible proxy (for OpenClaw, Hermes, etc.)
Proxy {
    /// Port to listen on (default: 11434)
    #[arg(long, short, default_value = "11434")]
    port: u16,
},
```

**Edit: `cli/src/main.rs`** — add handler:
```rust
Commands::Proxy { port } => {
    commands::proxy::run_proxy(ProxyArgs { port }).await?
}
```

**Edit: `Cargo.toml`** — add dependencies:
```toml
axum = "0.7"
tokio = { version = "1", features = ["full"] }
hyper = { version = "1", features = ["client", "http1"] }
```

### Result After This Change
```bash
lilly-code login          # authenticate once
lilly-code proxy          # starts on localhost:11434
# Now point OpenClaw and Hermes to http://localhost:11434/v1
```

---

## 2. hermes-agent — Add custom_headers Support

### Why
Hermes needs to send `X-User-Id` and `X-User-Email` headers. The `model.custom_headers` feature is in PR #14314 but not yet merged.

### Option A — Apply 10-line patch locally

**Edit: `agent/auxiliary_client.py`**

Find where the OpenAI client is constructed (approximately):
```python
# BEFORE (current code)
client = openai.OpenAI(
    base_url=config["model"]["base_url"],
    api_key=config["model"]["api_key"],
)
```

```python
# AFTER (patched)
extra_headers = config.get("model", {}).get("custom_headers", {})

client = openai.OpenAI(
    base_url=config["model"]["base_url"],
    api_key=config["model"]["api_key"],
    default_headers=extra_headers,   # ← ADD THIS ONE LINE
)
```

**Edit: `agent/anthropic_adapter.py`** (same pattern for Anthropic format):
```python
extra_headers = config.get("model", {}).get("custom_headers", {})

client = anthropic.Anthropic(
    base_url=config["model"]["base_url"],
    api_key=config["model"]["api_key"],
    default_headers=extra_headers,   # ← ADD THIS ONE LINE
)
```

**That's it — 2 lines added across 2 files.**

### Option B — Use PR #14314 branch

```bash
git clone https://github.com/nousresearch/hermes-agent
cd hermes-agent
git fetch origin pull/14314/head:custom-headers-feature
git checkout custom-headers-feature
pip install -e ".[all]"
```

Then use the full `custom_headers` config as described in `10_Hermes_Config.md`.

### Option C — Use lilly-code proxy (no Hermes change needed)

If you build the lilly-code proxy (Option 1 above), Hermes needs no code change at all — just point `base_url` to `http://localhost:11434/v1` and any API key value.

---

## 3. openclaw — No Changes Needed

OpenClaw already supports everything needed:
- ✅ Custom `baseUrl` per provider
- ✅ Custom `headers` per provider (including `X-User-Id`, `X-User-Email`)
- ✅ Env var interpolation in config values
- ✅ Multiple models per provider

See `09_OpenClaw_Config.md` for the full configuration.

---

## Recommended Implementation Order

```
Week 1:
  Day 1: Configure OpenClaw with direct headers (works immediately, no code)
  Day 1: Apply 2-line Hermes patch, configure Hermes
  
Week 2:
  Day 1-3: Build lilly-code proxy command (cleanest long-term solution)
  Day 4: Switch both tools to proxy mode (simplifies their configs)
  Day 5: Test token auto-refresh through proxy
```
