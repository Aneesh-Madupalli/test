# EOCC Plan — Continuation Checkpoint

**Saved:** 2026-06-11  
**Status:** Planning complete. PRD **not yet generated**. Resume from this file.

---

## Plan documents (three separate plans — do not merge)

| File | Role |
|---|---|
| **`test/aws_operations_intelligence/EOCC_Demo_PRD_Design_Plan.md`** | **Demo PRD design** — product, features, Aurora, agents, PRD outline |
| **`test/aws_operations_intelligence/EOCC_Technical_System_Plan.md`** | **Technical system** — ECS, Cortex, Pinecone, LLM router, pillars |
| **`test/aws_operations_intelligence/EOCC_Master_Plan.md`** | **Consolidated master** — all content in one doc (optional reference) |
| `test/aws_operations_intelligence/EOCC_20_Use_Case_Workflows.md` | 20 use case step-by-step flows |
| `c:\Users\madup\.cursor\plans\eocc_demo_prd_design_7feb39f9.plan.md` | Cursor copy — Demo PRD |
| `c:\Users\madup\.cursor\plans\eocc_technical_system_07d4d768.plan.md` | Cursor copy — Technical System |
| `c:\Users\madup\.cursor\plans\eocc_master_plan.plan.md` | Cursor copy — Master (consolidated) |

**Start here** when resuming.

---

## Locked decisions

- 3 × ECS Fargate: `frontend-ecs`, `backend-ecs`, `agents-ecs` (agents private)
- FastAPI + Next.js + LangGraph + Aurora + Redis + Cortex + Pinecone
- 4 gather agents + synthesis (not 6+ LLM agents in Phase 1)
- 5 pillars: Scalable, Secure, Accurate, Fast, Reliable
- LLM Router + `text-embedding-3-large` primary embedding
- Phase 1 integrations: AWS, Splunk, Jira, Confluence, GitHub (read-only)

---

## What's next

1. Resolve open items (pilot scope, demo data, naming)
2. Say **"generate the PRD"** to write `AWS_Operations_Intelligence_EOCC_PRD.md`
