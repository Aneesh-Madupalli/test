# AI Assistant Integration with Lilly Code
## Complete Research & Implementation Guide

**Created:** June 27, 2026  
**Author:** Research conducted via Claude Code  
**Status:** Ready for Implementation

---

## What This Folder Contains

| File | Purpose |
|------|---------|
| `01_README.md` | This file — overview and navigation |
| `02_Research_Summary.md` | Full research findings on all three tools |
| `03_LillyCode_Overview.md` | Deep dive into Lilly Code architecture |
| `04_OpenClaw_Overview.md` | Deep dive into OpenClaw architecture |
| `05_Hermes_Overview.md` | Deep dive into Hermes Agent architecture |
| `06_Feasibility_Analysis.md` | Can we use Lilly Code as LLM for OpenClaw & Hermes? |
| `07_Integration_Architecture.md` | How the pieces fit together |
| `08_Code_Changes_Required.md` | Exact code changes needed in each repo |
| `09_OpenClaw_Config.md` | Step-by-step OpenClaw setup guide |
| `10_Hermes_Config.md` | Step-by-step Hermes setup guide |
| `11_LillyCode_Proxy_Spec.md` | Specification for `lilly-code proxy` command |
| `12_Quick_Start.md` | TL;DR — get running in 10 minutes |

---

## The Goal

Use **Lilly Code** (Lilly's internal LLM Gateway) as the AI provider for two open-source personal AI agents:

- **OpenClaw** — multi-channel personal assistant (WhatsApp, Telegram, Discord, etc.)
- **Hermes Agent** — self-improving personal agent with learning loop

This means all AI requests from these personal agents route through Lilly's approved infrastructure, using your Lilly SSO identity, with full cost tracking and compliance.

---

## One-Line Summary Per Tool

- **Lilly Code** = Lilly's enterprise auth + proxy layer to approved LLMs (Claude, GPT-5.4)
- **OpenClaw** = Personal AI gateway that talks to you on all your messaging apps
- **Hermes** = Personal AI agent that learns and improves itself over time

---

## Bottom Line Feasibility

| Tool | Works with Lilly Code? | Code Change Needed? |
|------|----------------------|-------------------|
| OpenClaw | ✅ YES | ❌ None — config only |
| Hermes | ✅ YES | ⚠️ ~10 lines (headers fix) |
| lilly-code | N/A | ✅ Add `proxy` command |

**Start with:** `12_Quick_Start.md`
